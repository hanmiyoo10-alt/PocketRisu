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

## runit 자동기동 전제 확인

추가 INSPECT_ONLY에서 세 서비스의 자동기동 전제를 확인했습니다.

- `llmgateway-bridge`: `down` 파일 없음, 현재 `run`
- `local-usage-runtime-manager`: `down` 파일 없음, 현재 `run`
- `local-usage-runtime-engine`: `down` 파일 없음, 현재 `run`
- `runsvdir $PREFIX/var/service` 프로세스가 현재 실행 중
- 세 서비스 각각의 `runsv` 감독 프로세스도 실행 중
- 서버폰 `$HOME/.termux/boot/00-pocketrisu-server`가 `$PREFIX/etc/profile.d/start-services.sh`를 source함
- `start-services.sh`는 `service-daemon start`를 백그라운드에서 호출해 Termux services/runit 감독 트리를 시작함

이 조합이면 재부팅 후 Termux:Boot가 실행될 때 `service-daemon start`가 runsvdir를 올리고, `down` 파일이 없는 세 브릿지 서비스는 runit에 의해 자동 기동될 구조입니다. 따라서 브릿지 프로세스를 Termux:Boot에 개별 `node ...` 명령으로 중복 추가할 필요가 없으며, 그렇게 하면 runit과 중복 실행될 위험이 있으므로 하지 않습니다.

단, 이는 구성상 자동기동 조건이 충족됐다는 판정이며 실제 재부팅 뒤 세 브릿지가 모두 다시 `run` 상태가 되는지는 아직 실재부팅 검증이 남아 있습니다.

## 현재 판정

- generic local JSON bridge: 현재 실행 중, runit 감독
- local-usage bridge manager: 현재 실행 중, runit 감독
- local-usage bridge engine: 현재 실행 중, runit 감독
- 세 서비스 모두 `down` 파일 없음
- runsvdir 및 각 runsv 감독 프로세스 정상
- Termux:Boot → `start-services.sh` → `service-daemon start` → runsvdir → 브릿지 서비스의 자동기동 체인이 구성상 연결됨
- 브릿지 직접 실행 명령을 Termux:Boot에 추가할 필요 없음
- 실제 재부팅 후 자동기동 검증만 남음

정확한 Tailscale 주소, 계정 정보, 토큰 등 비밀/식별 정보는 기록하지 않습니다.
