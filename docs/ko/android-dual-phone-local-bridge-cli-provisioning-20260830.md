# Android 듀얼폰 로컬 브릿지 managed CLI provisioning 점검 — 2026-08-30

서버폰 재부팅 후 로컬 플러그인/DevPass 브릿지 기능이 자동으로 정상화되지 않은 현상을 추적한 기록입니다.

## 확인된 상태

브릿지 프로세스 자체와 HTTP 엔진은 살아 있었지만 live DevPass/organization 조회가 실패했습니다.

- local-usage manager `/status`: HTTP 200, `ok=true`
- `engineManaged=true`
- `engineBundled=true`
- `engineServiceEnvironmentReady=true`
- `cliRuntimeState=unavailable`
- `cliRuntimeProvisioning=backoff`
- engine `/devpass-status`: HTTP 502 `LLMGateway request failed`
- engine `/orgs`: HTTP 502 `LLMGateway request failed`
- engine `/v1/summary`: HTTP 200

따라서 핵심 장애 지점은 bridge manager/engine 프로세스 자체가 아니라 managed LLMGateway CLI 런타임 준비 단계입니다.

## 버전/상태 불일치

현재 `bridge-manager.cjs`는 managed CLI로 `@llmgateway/cli` 버전 `1.14.0`을 요구합니다.

반면 디스크의 `managed-cli.json` descriptor는 아직 `@llmgateway/cli` 버전 `1.10.0`을 가리키고 있었습니다. descriptor 상태는 `ready`이지만 manager가 요구하는 버전과 일치하지 않습니다.

`managed-cli-state.json`은 다음 의미의 상태였습니다.

- `state=unavailable`
- `provisioning=backoff`
- version 비어 있음
- state 갱신 시각: 2026-08-30 01:37 KST 부근
- 다음 재시도 예정 시각: 2026-08-30 02:07 KST 부근

점검 시점에는 이 재시도 예정 시각이 이미 약 1시간 이상 지난 상태였지만 manager `/status`는 여전히 `unavailable/backoff`였습니다.

manager 소스에서 확인된 상수/동작:

- 요구 CLI: `@llmgateway/cli` 1.14.0
- retry backoff: 30분
- install timeout: 5분
- 성공 시 descriptor/state를 현재 요구 버전으로 갱신
- 실패 시 `unavailable/backoff`와 다음 재시도 시각 기록

## provisioning 함수와 실제 CLI 디렉터리 확인

`provisionManagedCli()`는 요구 버전 디렉터리가 정상 검증되면 descriptor/state를 `ready`로 갱신하고, 그렇지 않으면 stage 디렉터리에서 npm install을 수행합니다. 설치 실패 시 stage를 제거하고 기존 버전이 격리되었다면 복원한 뒤 `unavailable/backoff`를 기록합니다.

현재 실제 디스크에는 다음 CLI 버전 디렉터리만 존재합니다.

- `1.9.0`
- `1.10.0`

두 디렉터리 모두 실제 `@llmgateway/cli` package metadata와 버전이 일치합니다. manager가 요구하는 `1.14.0` 디렉터리는 존재하지 않습니다. 따라서 1.14.0 provisioning은 완료되지 않았고 기존 1.10.0 설치가 보존된 상태입니다.

## 원인 확정 — 존재하지 않는 CLI 버전 + one-shot provisioning

추가 INSPECT_ONLY에서 정확한 provisioning 호출 위치와 npm registry 상태를 확인했습니다.

- `scheduleManagedCliProvisioning()` 참조는 함수 정의와 manager `server.listen()` callback 내부의 `setImmediate(() => scheduleManagedCliProvisioning())` 한 곳만 확인됨
- 30분 backoff 값을 기록하는 코드는 있으나, backoff 만료 후 다시 provisioning을 호출하는 `setTimeout`/`setInterval` 재시도 스케줄은 확인되지 않음
- npm registry는 `https://registry.npmjs.org/`
- `npm view @llmgateway/cli@1.14.0 version` → HTTP/npm E404, 해당 버전 없음
- `npm view @llmgateway/cli version` → `1.10.0`

따라서 현재 장애 원인은 다음 조합으로 확정합니다.

1. manager 코드가 npm registry에 존재하지 않는 `@llmgateway/cli@1.14.0`을 요구함
2. manager 시작 시 provisioning이 한 번 실행됨
3. 1.14.0 설치는 E404로 실패함
4. state가 `unavailable/backoff`로 기록됨
5. backoff 만료 시각을 기록하지만 자동 재호출 스케줄이 없어 같은 manager 프로세스에서는 상태가 스스로 회복되지 않음
6. 기존 1.10.0 설치는 남아 있지만 manager의 strict version check 때문에 managed runtime으로 사용되지 않음

즉 재부팅 후 브릿지 관련 프로세스가 모두 살아 있어도 live DevPass/organization 조회는 실패하는 반쪽 상태가 될 수 있습니다. 사용자가 관찰한 “재부팅 후 브릿지가 안 살아남” 현상과 일치합니다.

## 수정 방향

안전한 최소 수정 후보는 현재 npm registry의 실제 최신 버전이자 기존에 정상 설치되어 있는 `1.10.0`을 manager의 managed CLI 요구 버전으로 되돌리는 것입니다. 이 경우 manager 재시작 시 기존 `1.10.0` 디렉터리를 검증해 descriptor/state를 `ready/ok`로 갱신할 수 있을 것으로 예상됩니다.

실제 수정은 서버폰 로컬 runtime 파일을 대상으로 다음 순서를 지킵니다.

1. 수정 전 해당 상수의 정확한 단일 일치 여부와 파일 해시 확인
2. timestamp 백업
3. `1.14.0` → `1.10.0` 최소 1곳 변경
4. syntax check
5. `local-usage-runtime-manager`만 재시작
6. manager `/status`에서 `cliRuntimeState=ready`, `cliRuntimeVersion=1.10.0`, `cliRuntimeProvisioning=ok` 확인
7. engine `/devpass-status`, `/orgs`를 인증 상태로 재검증
8. 재부팅 후 자동복구 재검증

자동 재시도 스케줄러 추가는 별도 개선 사항으로 남길 수 있으나, 먼저 잘못된 비존재 버전 요구를 바로잡는 것이 최소 범위 수정입니다.

정확한 Tailscale 주소, 계정 정보, 인증 토큰 등 비밀/식별 정보는 기록하지 않습니다.
