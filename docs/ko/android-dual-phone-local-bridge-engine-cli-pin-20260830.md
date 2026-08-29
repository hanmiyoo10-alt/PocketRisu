# Android 듀얼폰 로컬 브릿지 engine CLI pin 점검 — 2026-08-30

서버폰에서 local-usage manager의 managed CLI version을 실제 npm registry에 존재하는 `1.10.0`으로 복구한 뒤에도 engine live endpoint가 `CIRCUIT_OPEN`으로 재오픈되는 원인을 추가 추적한 기록입니다.

## 확인된 실제 engine 상태

`sv status local-usage-runtime-engine`을 기준으로 실제 engine PID를 확인했습니다.

- 실제 engine PID: runit이 보고한 Node engine 프로세스
- engine runit 환경에는 `DEVPASS_BRIDGE_MANAGED_CLI=1`이 존재
- `LLMGATEWAY_CLI_VERSION` 환경변수는 없음
- `HOME`, `PATH`, `PREFIX`는 정상 Termux 환경

이전 `ps | awk` 방식에서 검사 shell 자체가 `bridge-engine.mjs` 문자열을 포함해 self-match된 PID는 engine PID로 사용하지 않습니다.

## engine 자체의 잘못된 CLI 기본값 확인

`bridge-engine.mjs`에는 다음 구조가 확인됐습니다.

```js
const CLI_VERSION = process.env.LLMGATEWAY_CLI_VERSION || '1.14.0';
```

그리고 현재 runit `local-usage-runtime-engine/run`에는 `LLMGATEWAY_CLI_VERSION`을 설정하는 줄이 없습니다. 따라서 현재 engine의 effective CLI version은 기본값 `1.14.0`입니다.

engine 파일에서 `1.14.0` 문자열은 정확히 한 곳이며 현재 syntax check는 정상입니다.

manager 쪽 managed CLI descriptor/state는 이미 `1.10.0 / ready / ok`로 정상화됐지만, engine은 descriptor version을 자신의 `CLI_VERSION`과 strict 비교합니다. 또한 fallback CLI 실행 경로도 `@llmgateway/cli@${CLI_VERSION}`을 사용합니다. 따라서 engine이 계속 `1.14.0`을 요구하면 실제 존재하는 1.10.0 descriptor를 정상 runtime으로 인정하지 못하거나 존재하지 않는 1.14.0 실행을 시도할 수 있습니다.

이는 manager 복구 뒤에도 `/devpass-status`와 `/orgs`가 실패하고 circuit breaker가 더 긴 시간으로 재오픈된 현상을 설명합니다.

## bundled engine 무결성 주의

현재 `bridge-engine.mjs` SHA256은 manager가 갖고 있는 bundled engine artifact SHA256과 일치합니다. 따라서 engine 파일 자체의 기본값을 직접 수정하면 manager의 bundled-engine 무결성/동기화 판정과 충돌할 가능성이 있습니다.

engine 소스는 이미 `LLMGATEWAY_CLI_VERSION` 환경변수 override를 공식 경로로 지원하므로, 더 안전한 최소 수정 후보는 bundled engine 파일을 변경하지 않고 runit service 환경에 `LLMGATEWAY_CLI_VERSION=1.10.0`을 주입하는 것입니다.

다만 manager가 engine run 파일을 생성·검증·동기화하는 로직이 추가 환경변수를 보존하는지 먼저 INSPECT_ONLY로 확인해야 합니다. 확인 전에는 engine 파일이나 runit run 파일을 수정하지 않습니다.

## 다음 단계

1. manager의 engine service run-script 생성/검증 함수 확인
2. `engineServiceEnvironmentReady` 판정에서 허용/요구하는 환경 줄 확인
3. 추가 `LLMGATEWAY_CLI_VERSION=1.10.0`이 manager sync에 의해 제거되지 않는지 확인
4. 가능하면 runit 환경변수 override 방식으로 백업 → 최소 수정 → engine만 재시작
5. engine health/circuit 및 `/devpass-status`, `/orgs` 재검증
6. 최종적으로 서버폰 재부팅 자동복구 검증

정확한 Tailscale 주소, 계정 정보, 인증 토큰 등 비밀/식별 정보는 기록하지 않습니다.
