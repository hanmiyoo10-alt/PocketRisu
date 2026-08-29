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

점검 시점에는 이 재시도 예정 시각이 이미 약 1시간 이상 지난 상태였지만 manager `/status`는 여전히 `unavailable/backoff`였습니다. 따라서 단순히 30분 backoff가 끝나면 자동으로 재시도가 수행되는 구조인지 의심이 생겼으며, provisioning 함수의 실제 호출 트리거를 추가 확인해야 합니다.

manager 소스에서 확인된 상수/동작:

- 요구 CLI: `@llmgateway/cli` 1.14.0
- retry backoff: 30분
- install timeout: 5분
- 성공 시 descriptor/state를 현재 요구 버전으로 갱신
- 실패 시 `unavailable/backoff`와 다음 재시도 시각 기록

현재 GitHub HTTPS 접근은 HTTP 200으로 정상 확인되어, 점검 시점의 일반 네트워크 연결 자체는 정상입니다. 다만 최초 provisioning 실패 시점의 직접 원인이 네트워크였는지는 아직 확정하지 않습니다.

## 현재 판정

- 재부팅 뒤 브릿지가 완전히 미기동된 문제가 아님
- generic bridge, manager, engine 프로세스는 살아 있음
- 실제 live 데이터 조회 실패는 managed CLI 런타임 미준비와 연결됨
- manager 요구 버전 1.14.0과 기존 descriptor 1.10.0 사이에 버전 불일치가 있음
- 1.14.0 provisioning 실패 후 backoff가 기록됨
- backoff 만료 후에도 상태가 자동 회복되지 않은 것으로 관찰됨
- 다음 단계는 provisioning 함수의 호출 조건/재시도 트리거와 실제 CLI 디렉터리 상태를 INSPECT_ONLY로 확인하는 것

정확한 Tailscale 주소, 계정 정보, 인증 토큰 등 비밀/식별 정보는 기록하지 않습니다.
