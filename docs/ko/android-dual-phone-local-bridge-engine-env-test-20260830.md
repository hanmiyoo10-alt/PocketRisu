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

다음 시도에서는 다중 shell quoting을 피하고 Node로 파일을 읽어 정확한 기준 라인 하나만 치환/삽입하는 방식으로 진행합니다. 수정 전에는 현재 run 파일 SHA256이 여전히 원본 값인지 다시 확인합니다.

정확한 Tailscale 주소, 계정 정보, 인증 토큰 등 비밀/식별 정보는 기록하지 않습니다.
