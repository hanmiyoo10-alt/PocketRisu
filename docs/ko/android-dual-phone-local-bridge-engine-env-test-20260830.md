# Android 듀얼폰 로컬 브릿지 engine CLI env 테스트 — 2026-08-30

서버폰 local-usage engine의 CLI 버전을 bundled engine 파일 자체를 수정하지 않고 runit 환경변수로 override하는 경로를 검증한 기록입니다.

## 배경

`bridge-engine.mjs`는 `LLMGATEWAY_CLI_VERSION`이 없으면 `1.14.0`을 기본값으로 사용하지만, npm registry의 실제 최신/설치 가능 버전은 1.10.0입니다. bundled engine 파일 SHA256은 manager가 기대하는 `BUNDLED_ENGINE_SHA256`과 일치하므로 engine 파일 자체를 직접 수정하면 bundled integrity 판정을 깨뜨릴 수 있습니다.

manager의 `engineServiceEnvironmentReady()`는 engine run 파일의 전체 내용 일치를 요구하지 않고 필요한 `LD_PRELOAD` 및 `DEVPASS_BRIDGE_MANAGED_CLI` export 라인이 포함되어 있는지만 검사합니다. 따라서 검증용으로 `LLMGATEWAY_CLI_VERSION=1.10.0` export를 추가하는 방식은 manager의 현재 environment-ready 판정과 양립할 수 있습니다.

다만 `writeEngineService()`는 이 추가 env 라인을 생성하지 않으므로, 수동 run 파일 수정은 우선 A/B 검증용으로만 취급하고 성공이 확인된 뒤 영구화 방식을 별도로 설계합니다.

## 첫 run 파일 env 패치 시도

수정 전 run 파일 SHA256과 기존 `DEVPASS_BRIDGE_MANAGED_CLI=1` 라인 단일 일치를 확인하고 timestamp 백업을 생성했습니다.

- 원본 run 파일 SHA256: `58b7965f3b14af15e564032534c8817a3856325a381c8a756df81baa94c3a178`
- 기존 managed CLI export 라인: 1개
- 기존 `LLMGATEWAY_CLI_VERSION=1.10.0` export 라인: 0개
- 백업 SHA256은 원본과 동일

그러나 awk 기반 삽입 단계에서 shell/awk quoting이 의도대로 전달되지 않아 임시 결과에 새 env 라인이 생성되지 않았습니다.

- `new_cli_version_line_count=0`
- 보호 조건이 `ABORT_PATCH_VERIFY_FAILED`로 중단
- `set -e` 상태이므로 atomic install `mv` 단계는 실행되지 않음
- 따라서 실제 run 파일은 수정되지 않았고 engine도 재시작되지 않음
- 백업만 정상 생성됨

## Node 기반 env 패치 설치 성공

두 번째 시도에서는 다중 shell/awk quoting을 피하고 Node로 run 파일을 읽어 정확한 기준 라인 뒤에 env 라인을 삽입했습니다.

- 수정 직전 run 파일 SHA256은 원본 값과 동일
- 새 백업: `run.bak-cli-env-node-20260830-034648`
- 새 백업 SHA256은 원본과 동일
- 기준 라인 `DEVPASS_BRIDGE_MANAGED_CLI=1` 정확히 1개
- 기존 `LLMGATEWAY_CLI_VERSION` 라인 0개
- 임시 결과에 `LLMGATEWAY_CLI_VERSION=1.10.0` 정확히 1개
- `sh -n` 임시파일 검사: OK
- diff는 기존 managed CLI env 바로 아래에 CLI version env 한 줄 추가뿐
- atomic install 후 `sh -n`: OK
- 설치 후 run 파일 SHA256: `617f2e4f7f1945c317f3c173fa233ae70c76a8b6f3002906b767384fcbcd4f6a`
- engine은 아직 재시작하지 않았으므로 실행 중 프로세스에는 아직 새 env가 적용되지 않음

## engine 재시작 A/B 테스트 성공

수동 run-file env override를 설치한 뒤 `local-usage-runtime-engine`만 재시작해 원인 가설을 검증했습니다.

- engine PID가 기존 프로세스에서 새 PID로 정상 변경됨
- 새 PID `/proc/<pid>/environ`에서 `DEVPASS_BRIDGE_MANAGED_CLI=1` 확인
- 새 PID `/proc/<pid>/environ`에서 `LLMGATEWAY_CLI_VERSION=1.10.0` 확인
- engine `/health` 첫 확인부터 HTTP 200, `healthy`, version 1.6.27
- 재시작 직후 `circuits.open=0`
- manager `/status`: HTTP 200, `cliRuntimeState=ready`, `cliRuntimeVersion=1.10.0`, `cliRuntimeProvisioning=ok`
- `engineManaged=true`, `engineBundled=true`, `engineServiceEnvironmentReady=true`
- engine `/devpass-status`: HTTP 200
- engine `/orgs`: HTTP 200
- engine `/v1/summary`: HTTP 200
- live API 호출 후에도 `/health`의 `circuits.open=0`

이 결과로 engine의 기본 CLI version `1.14.0`이 live DevPass/organization 요청 실패와 circuit 재오픈의 실제 원인이었음을 A/B로 확인했습니다. manager provisioning을 1.10.0으로 정상화한 뒤에도 engine이 1.14.0을 effective version으로 쓰면 live 요청이 실패했고, engine 실행 환경에 1.10.0 override를 주자 즉시 정상화됐습니다.

## 영구화 방향

현재 run-file 수정은 기능적으로 성공했지만 `writeEngineService()`가 run 파일을 재생성할 때 `LLMGATEWAY_CLI_VERSION` 라인을 만들지 않으므로 영구 수정으로 보지 않습니다. 다음 단계에서는 bundled engine 파일 자체의 SHA는 건드리지 않고 manager 쪽 run-file 생성 로직을 점검합니다.

안전한 영구화 후보는 manager가 이미 사용하는 `MANAGED_CLI_VERSION`을 engine run 파일의 `LLMGATEWAY_CLI_VERSION` export에도 사용하도록 만드는 것입니다. 이 경우 manager provisioning과 engine effective CLI version이 같은 단일 버전 소스를 공유할 수 있습니다. 실제 수정 전에는 manager 현재 SHA, 관련 함수/문자열의 정확한 일치 수, 예상 diff를 다시 점검하고 백업합니다.

## 영구화 패치 지점 PRECHECK

manager 현재 SHA256은 `fd42a554c0447375bf2c0abda3563b5f8e7ad3df8e4d6114b515540c9540af55`이고 `MANAGED_CLI_VERSION`은 1.10.0입니다. 관련 함수 구조는 다음처럼 확인했습니다.

- `engineServiceManagedCliLine()` 정의: 정확히 1개
- 함수명 전체 참조: 정의 포함 총 2개
- `writeEngineService()`는 `${engineServiceManagedCliLine()}` 결과를 그대로 run 파일에 삽입
- 현재 함수는 `DEVPASS_BRIDGE_MANAGED_CLI` export 한 줄만 생성
- `engineServiceEnvironmentReady()`는 run 파일 전체 일치가 아니라 필요한 export 줄의 `includes()` 여부만 검사
- 현재 수동 run 파일에는 `DEVPASS_BRIDGE_MANAGED_CLI=1`과 `LLMGATEWAY_CLI_VERSION=1.10.0`이 모두 존재
- manager syntax check: OK

따라서 영구화 최소 패치는 bundled engine 파일을 수정하지 않고 manager의 `engineServiceManagedCliLine()`이 두 export 줄을 생성하도록 변경하고, `engineServiceEnvironmentReady()`가 `LLMGATEWAY_CLI_VERSION=${MANAGED_CLI_VERSION}` 존재도 확인하도록 강화하는 방식입니다. 이렇게 하면 이후 `writeEngineService()`가 run 파일을 재생성하더라도 engine effective CLI version이 manager provisioning version과 자동으로 일치합니다.

## manager 영구화 패치 설치 성공

PRECHECK 뒤 `bridge-manager.cjs`만 백업한 후 최소 영구화 패치를 설치했습니다.

- 수정 직전 SHA256: `fd42a554c0447375bf2c0abda3563b5f8e7ad3df8e4d6114b515540c9540af55`
- 백업: `bridge-manager.cjs.bak-engine-cli-env-permanent-20260830-035319`
- 백업 SHA256은 수정 직전 값과 동일
- 임시파일 `node --check`: OK
- `engineServiceManagedCliLine()`은 기존 `DEVPASS_BRIDGE_MANAGED_CLI` export와 함께 `LLMGATEWAY_CLI_VERSION=${MANAGED_CLI_VERSION}` export도 생성하도록 변경
- `engineServiceEnvironmentReady()`는 `LD_PRELOAD`, managed CLI enable 값, CLI version env 세 가지가 모두 준비됐는지 확인하도록 강화
- diff는 위 두 논리 지점에만 한정
- atomic install 후 `node --check`: OK
- 설치 후 manager SHA256: `04704d7d6541abaf4295fc4db04a5280fe221e0b80137910c3c617aff7cac544`
- bundled engine 파일은 수정하지 않음
- 설치 직후 manager/engine은 모두 재시작하지 않음

## 영구화 manager 런타임 검증 성공

영구화 패치가 설치된 manager만 재시작하고 engine은 재시작하지 않은 채 현재 정상 상태가 유지되는지 검증했습니다.

- manager PID는 새 프로세스로 정상 교체됨
- engine PID는 기존 프로세스 그대로 유지됨
- manager 재시작 뒤 run 파일에는 `DEVPASS_BRIDGE_MANAGED_CLI=1`과 `LLMGATEWAY_CLI_VERSION=1.10.0`이 그대로 존재
- 기존 engine 프로세스 환경에도 두 env가 유지됨
- manager `/status`: HTTP 200
- `cliRuntimeState=ready`
- `cliRuntimeVersion=1.10.0`
- `cliRuntimeProvisioning=ok`
- `engineManaged=true`
- `engineBundled=true`
- `engineServiceEnvironmentReady=true`
- engine `/devpass-status`: HTTP 200
- engine `/orgs`: HTTP 200
- engine `/v1/summary`: HTTP 200
- 최종 `/health`: `healthy`, `circuits.open=0`

따라서 새 manager 코드는 정상 기동하며 기존 정상 engine을 불필요하게 재시작하지 않고, 강화된 environment-ready 검사에서도 현재 run 파일을 정상으로 인정합니다. live API와 circuit 상태에도 회귀가 없습니다.

## 실제 run 파일 재생성 경로 확인

추가 INSPECT_ONLY에서 `writeEngineService()`의 실제 호출 경로를 확인했습니다.

- 직접 호출은 `startManagedCandidate()`와 `adoptEngine()` 두 경로뿐
- `/engine/adopt`는 현재 `engineManaged=true`이면 `current` 상태로 즉시 반환하므로 현재 정상 상태에서는 run 파일을 재생성하지 않음
- `/engine/sync`는 `syncBundledEngine()`을 호출하지만, 현재 `engineBundled=true`이고 bundled engine version도 현재 버전이면 `current` 상태로 즉시 반환하므로 역시 run 파일을 재생성하지 않음
- 실제 bundle sync 경로에 들어가면 `sv down`으로 local-usage engine 하나를 내린 뒤 `startManagedCandidate()`를 호출하고, 이 함수가 `writeEngineService(candidate, false)`로 run 파일을 새로 작성한 다음 engine을 다시 올림

따라서 현재 정상 상태에서 단순히 `/engine/sync`를 호출하는 것만으로는 영구화 생성 로직을 검증할 수 없습니다. 가장 좁은 실제 재생성 검증 방법은 현재 run 파일에서 `LLMGATEWAY_CLI_VERSION=1.10.0` 한 줄만 일시적으로 제거해 `engineServiceEnvironmentReady=false` 및 `engineBundled=false`를 만들고, 인증된 `/engine/sync`를 한 번 호출하는 것입니다. 실행 중 engine 프로세스는 기존 env를 메모리에 유지하므로 sync 호출 전까지 live 기능은 유지됩니다. sync가 정상 경로로 들어가면 local-usage engine 하나만 재시작되고, 새 manager의 `writeEngineService()`가 두 env가 들어간 run 파일을 스스로 재생성해야 합니다.

이 검증은 full PocketRisu 서비스, sshd, generic bridge, main-phone tunnel/notification 경로를 건드리지 않습니다. 실행 전 run 파일 별도 백업과 현재 manager/engine PID, live API 정상 상태를 확인하고, 예상과 다른 응답이 나오면 다른 서비스로 확대하지 않고 중단합니다.

정확한 Tailscale 주소, 계정 정보, 인증 토큰 등 비밀/식별 정보는 기록하지 않습니다.
