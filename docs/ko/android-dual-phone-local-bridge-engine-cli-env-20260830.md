# Android 듀얼폰 로컬 브릿지 engine CLI 환경변수 점검 — 2026-08-30

서버폰 local-usage engine의 live DevPass/organization 조회가 manager 복구 후에도 circuit을 재오픈한 원인을 추가 추적한 기록입니다.

## 실제 engine 환경 확인

`sv status local-usage-runtime-engine`에서 실제 engine PID를 확인한 뒤 `/proc/<pid>/environ`을 점검했습니다.

- 실제 engine PID는 runit이 보고한 프로세스로 확인
- `DEVPASS_BRIDGE_MANAGED_CLI=1` 존재
- `HOME`, `PATH`, `PREFIX` 정상
- `LLMGATEWAY_CLI_VERSION`은 설정되어 있지 않음

따라서 engine 소스의 기본값 `process.env.LLMGATEWAY_CLI_VERSION || '1.14.0'`이 실제 effective CLI version으로 사용됩니다.

## engine 소스/무결성 상태

`bridge-engine.mjs`에서 문자열 `1.14.0`은 정확히 한 곳이며 CLI version 기본값에만 사용됩니다. 현재 syntax check도 정상입니다.

다만 engine 파일 SHA256은 manager의 `BUNDLED_ENGINE_SHA256`과 일치합니다. manager는 bundled engine 파일의 SHA256을 검증해 `engineBundled` 상태와 bundle readiness를 판단합니다.

따라서 engine 본체의 하드코딩된 `1.14.0`을 직접 수정하면 manager의 bundled-engine 무결성 판정과 충돌할 수 있으므로, engine 파일 직접 수정은 우선 보류합니다.

## runit 환경 override 가능성

engine 소스는 이미 `LLMGATEWAY_CLI_VERSION` 환경변수 override를 지원합니다. 현재 runit `local-usage-runtime-engine/run`에는 해당 변수가 없고 `DEVPASS_BRIDGE_MANAGED_CLI=1`만 있습니다.

manager의 `engineServiceEnvironmentReady()` 구현을 확인한 결과 run 파일 전체를 exact-match하지 않고 다음 필요한 줄이 포함되어 있는지만 검사합니다.

- 필요한 경우 `LD_PRELOAD=...`
- `DEVPASS_BRIDGE_MANAGED_CLI=1`

따라서 run 파일에 `LLMGATEWAY_CLI_VERSION=1.10.0`을 추가해도 현재 environment-ready 판정은 유지될 수 있습니다.

다만 manager의 `writeEngineService()`는 run 파일을 새로 만들 때 현재 `LD_PRELOAD`와 `DEVPASS_BRIDGE_MANAGED_CLI`만 생성하며 `LLMGATEWAY_CLI_VERSION`은 생성하지 않습니다. 따라서 run 파일 수동 추가는 기능 검증용 A/B 테스트로는 적합하지만, manager가 향후 service run 파일을 재생성하는 adopt/sync 경로에서는 사라질 수 있습니다.

## 현재 안전한 다음 단계

1. engine 본체는 수정하지 않음
2. 현재 engine run 파일을 timestamp 백업
3. `LLMGATEWAY_CLI_VERSION=1.10.0` 한 줄만 추가
4. run 파일 diff/해시 확인
5. engine 서비스만 재시작
6. 새 engine `/health`와 실제 process env에서 CLI version 환경변수 확인
7. `/devpass-status`, `/orgs` 인증 호출이 HTTP 200으로 회복되는지 확인
8. 성공하면 manager의 run-file generator에도 동일 env를 생성하도록 영구화하는 별도 최소 수정 검토

이 단계에서는 engine bundled artifact 자체를 변경하지 않으며, PocketRisu 본체/SSH/Tailscale 계층도 변경하지 않습니다.

정확한 Tailscale 주소, 계정 정보, 인증 토큰 등 비밀/식별 정보는 기록하지 않습니다.
