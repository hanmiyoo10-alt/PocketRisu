# Android 듀얼폰 로컬 브릿지 런타임 점검 — 2026-08-30

서버폰의 로컬 플러그인/DevPass/local-usage 브릿지 계층이 현재 실제로 실행 중인지, 그리고 재부팅 시 자동 기동 구조가 어떻게 연결되는지 확인하기 위한 INSPECT_ONLY 기록입니다.

## 현재 실행 중인 브릿지 프로세스

서버폰에서 다음 프로세스가 실제 실행 중인 것을 확인했습니다.

- `$HOME/PocketRisu/generic_local_json_bridge.cjs`
- `$HOME/.local/share/local-usage-dashboard/runtime/bridge-manager.cjs`
- `$HOME/.local/share/local-usage-dashboard/runtime/bridge-engine.mjs`

점검 시점의 순간 CPU 사용은 모두 사실상 0% 수준이었고, 각각 장시간 프로세스가 유지되고 있었습니다.

또한 `runsv local-usage-runtime-manager`, `runsv local-usage-runtime-engine`이 별도로 실행 중이어서 local-usage manager/engine은 runit 감독 하에 있습니다. manager/engine 자식 프로세스의 uptime이 해당 `runsv`보다 짧아, 실행 중 재시작이 발생하더라도 runit이 다시 올린 흔적과 일치합니다.

## runit 서비스 등록 확인

Termux:Boot 스크립트에서는 브릿지 이름이 직접 참조되지 않았습니다. 대신 다음 runit 서비스 `run` 파일이 확인됐습니다.

- `local-usage-runtime-manager/run`
  - DevPass bridge token 파일 환경변수를 설정
  - `bridge-manager.cjs` 실행
- `local-usage-runtime-engine/run`
  - `DEVPASS_BRIDGE_MANAGED_CLI=1` 설정
  - `bridge-engine.mjs` 실행
- `llmgateway-bridge/run`
  - `generic_local_json_bridge.cjs` 실행

따라서 현재 브릿지 계층은 Termux:Boot에서 개별 Node 프로세스를 직접 띄우는 구조가 아니라, runit 서비스 트리를 통해 관리되는 것으로 판단합니다.

## 현재 판정

- generic local JSON bridge: 현재 실행 중
- local-usage bridge manager: 현재 실행 중, runit 감독
- local-usage bridge engine: 현재 실행 중, runit 감독
- Termux:Boot에 브릿지 직접 실행 명령은 없음
- 브릿지 자동복구/자동재시작 책임은 runit 쪽에 있는 구조로 보임
- 아직 재부팅 자동기동을 완전히 확정하지는 않음

재부팅 자동기동 확정을 위해 다음으로 확인할 항목은 각 서비스 디렉터리의 `down` 파일 유무, 현재 `sv status`, 그리고 부팅 시 `runsvdir`를 올리는 `start-services.sh` 경로입니다.

정확한 Tailscale 주소, 계정 정보, 토큰 등 비밀/식별 정보는 기록하지 않습니다.
