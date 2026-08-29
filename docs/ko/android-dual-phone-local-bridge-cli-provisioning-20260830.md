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

## 수정 전 PRECHECK 결과

실제 로컬 runtime 파일 수정 직전 PRECHECK를 완료했습니다.

- 대상: `$HOME/.local/share/local-usage-dashboard/runtime/bridge-manager.cjs`
- SHA256: `35bf1562638a5cb0d25163eea1c795e8eeb1f721af2b1b6d4f15c05d15950854`
- 문자열 `1.14.0` 전체 일치 수: 정확히 1개
- 단일 일치 위치: `const MANAGED_CLI_VERSION = '1.14.0';`
- 현재 Node syntax check: `OK`

따라서 다음 수정은 해당 상수 한 곳만 `1.10.0`으로 바꾸는 최소 변경으로 진행할 수 있습니다. 수정 직후에는 manager를 재시작하기 전에 백업 해시, diff, syntax를 먼저 검증합니다.

## 첫 수정 시도는 안전하게 중단됨

첫 최소 수정 명령은 원본 해시와 단일 대상 일치를 재확인한 뒤 timestamp 백업을 정상 생성했습니다.

- 백업: `$HOME/.local/share/local-usage-dashboard/runtime/bridge-manager.cjs.bak-cli-version-20260830-032103`
- 백업 SHA256은 원본과 동일한 `35bf1562638a5cb0d25163eea1c795e8eeb1f721af2b1b6d4f15c05d15950854`
- 임시 내용에서는 `1.14.0` 일치가 0개, `1.10.0` 일치가 정확히 1개로 최소 패치 자체는 정상 생성됨

그러나 임시 파일 이름이 `bridge-manager.cjs.tmp.<pid>` 형태여서 Node.js 26의 `node --check`가 마지막 확장자를 `.pid` 형태의 알 수 없는 확장자로 판단하고 `ERR_UNKNOWN_FILE_EXTENSION`을 반환했습니다.

명령이 `set -e` 상태였기 때문에 syntax check 단계에서 즉시 종료되었고, 이후의 atomic `mv` 설치 단계는 실행되지 않았습니다. 따라서 이 시도에서는 원본 `bridge-manager.cjs`가 수정되지 않았으며 manager도 재시작되지 않았습니다. trap cleanup이 임시 파일을 제거하도록 구성되어 있어 실패는 안전하게 중단된 것으로 판정합니다.

## 최소 버전 패치 설치 성공

두 번째 시도에서는 임시파일의 마지막 확장자를 `.cjs`로 유지한 뒤 동일한 보호 절차를 다시 수행했습니다.

- 수정 직전 원본 SHA256은 PRECHECK 값과 동일
- 기존 백업 SHA256도 동일
- 대상 문자열 일치 수는 정확히 1개
- 임시 패치에서 `1.14.0` 일치 0개, `1.10.0` 일치 1개
- 임시파일 `node --check`: `OK`
- diff는 `const MANAGED_CLI_VERSION = '1.14.0';` → `'1.10.0'` 한 줄만 변경
- atomic install 후 설치본 `node --check`: `OK`
- 설치본 SHA256: `fd42a554c0447375bf2c0abda3563b5f8e7ad3df8e4d6114b515540c9540af55`
- 백업 SHA256: `35bf1562638a5cb0d25163eea1c795e8eeb1f721af2b1b6d4f15c05d15950854`

## manager 재시작 후 CLI 런타임 회복

패치 설치 뒤 `local-usage-runtime-manager`만 재시작했습니다.

- manager PID가 기존 프로세스에서 새 프로세스로 정상 변경됨
- manager `/status` 첫 확인부터 HTTP 200
- `cliRuntimeState=ready`
- `cliRuntimeVersion=1.10.0`
- `cliRuntimeProvisioning=ok`
- `engineManaged=true`
- `engineBundled=true`
- `engineServiceEnvironmentReady=true`

따라서 `MANAGED_CLI_VERSION`을 실제 설치 가능한 1.10.0으로 되돌린 최소 패치는 managed CLI 런타임 복구에 성공했습니다.

다만 engine 프로세스는 재시작하지 않았기 때문에 이전 CLI 실패 시 누적된 circuit-breaker 상태가 메모리에 남아 있었습니다. manager 복구 직후:

- `/devpass-status` → HTTP 502, `CIRCUIT_OPEN`, account circuit 약 62초 후 재시도 안내
- `/orgs` → HTTP 502, `CIRCUIT_OPEN`, organizations circuit 약 61초 후 재시도 안내
- `/v1/summary` → HTTP 200, `ok=true`

## 자연 circuit 만료 대기 후에도 재오픈 확인

engine을 재시작하지 않고 안내된 시간보다 긴 약 75초를 기다린 뒤 live endpoint를 다시 확인했습니다.

- manager CLI 상태는 계속 `ready / 1.10.0 / ok`
- engine `/health`는 계속 HTTP 200, `healthy`, version 1.6.27
- `circuits.open`은 여전히 8
- `/devpass-status`는 다시 HTTP 502 `CIRCUIT_OPEN`, 이번에는 account circuit 약 211초 후 재시도 안내
- `/orgs`도 다시 HTTP 502 `CIRCUIT_OPEN`, organizations circuit 약 210초 후 재시도 안내

따라서 이 상태를 단순한 과거 circuit 잔여로 해석할 수 없습니다. retry 시간이 만료된 뒤 다시 더 긴 시간으로 열렸으므로, 현재 engine의 실제 LLMGateway 호출 경로가 계속 실패하며 circuit breaker를 재오픈하고 있는 것으로 판단합니다.

## engine 자체에도 1.14.0 기본값이 남아 있음

추가 INSPECT_ONLY에서 `bridge-engine.mjs` 소스를 확인한 결과 manager와 별개로 engine 자체에도 다음 기본값이 존재했습니다.

- `const CLI_VERSION = process.env.LLMGATEWAY_CLI_VERSION || '1.14.0';`
- runit `local-usage-runtime-engine/run`은 `DEVPASS_BRIDGE_MANAGED_CLI=1`만 설정하고 `LLMGATEWAY_CLI_VERSION`은 설정하지 않음
- 따라서 별도 환경변수가 없다면 engine의 effective CLI version은 1.14.0
- engine은 managed CLI descriptor의 package/version을 자신의 `CLI_VERSION`과 strict 비교하고, 불일치하면 managed CLI를 ready로 인정하지 않음
- fallback 실행 경로도 `@llmgateway/cli@${CLI_VERSION}`을 사용하므로 1.14.0을 요구할 수 있음

현재 descriptor/state는 모두 1.10.0 `ready/ok`로 정상화됐지만, engine 소스 기본값이 1.14.0인 상태라 live 요청 실패와 circuit 재오픈을 설명합니다. 즉 manager 한 줄 수정만으로는 충분하지 않았고 **manager와 engine 양쪽의 CLI version pin을 실제 존재하는 1.10.0으로 일치시켜야 하는 구조**입니다.

또한 이번 프로세스 PID 탐색은 `ps | awk` 검색식이 현재 검사 명령 자체의 문자열을 self-match해 shell PID를 잡았으므로, 해당 PID의 `/proc/.../environ` 출력은 engine 환경으로 사용하지 않습니다. 다음 검사는 `sv status local-usage-runtime-engine`에서 supervisor가 보고하는 실제 engine PID를 사용해 환경을 재확인하고, engine 파일의 `1.14.0` 단일 일치/해시/syntax를 PRECHECK한 뒤에만 최소 수정 여부를 결정합니다.

정확한 Tailscale 주소, 계정 정보, 인증 토큰 등 비밀/식별 정보는 기록하지 않습니다.
