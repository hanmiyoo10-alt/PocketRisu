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

이 조합은 구성상 자동기동 조건을 갖춘 것으로 보였으나, 실제 사용자 재부팅 결과에서는 브릿지 기능이 자동으로 살아나지 않았습니다. 따라서 구조상 전제만으로 자동복구를 성공으로 판정하지 않습니다.

특히 이후 수동 점검 시에는 브릿지 관련 Node 프로세스와 runit 감독 프로세스가 실행 중인 상태가 관찰됐으므로, 실제 실패 원인은 단순히 `runsvdir` 자체가 시작되지 않은 경우로 단정할 수 없습니다. 다음 진단에서는 다음을 구분해야 합니다.

- 재부팅 직후 브릿지 서비스 프로세스 자체가 없었는지
- 프로세스는 있었지만 로컬 플러그인/DevPass 기능이 준비되지 않았는지
- manager/engine이 부팅 후 늦게 재시작되거나 초기화 순서가 꼬였는지
- 브릿지 로그에 부팅 시점 오류가 남았는지

브릿지 프로세스를 Termux:Boot에 개별 `node ...` 명령으로 중복 추가하는 수정은 아직 하지 않습니다. runit과 중복 실행될 위험이 있으므로 실제 실패 원인을 먼저 확인합니다.

## 재부팅 이후 프로세스 age 재점검

재부팅 이후 현재 상태를 다시 확인한 결과 세 서비스 모두 현재는 `run` 상태였으나, 프로세스 시작 시점이 서로 달랐습니다.

- `runsvdir` 및 `runsv llmgateway-bridge`: 약 2시간 38분
- `generic_local_json_bridge.cjs`: 약 2시간 38분으로 runsvdir와 거의 같은 시점부터 유지
- `bridge-engine.mjs`: 약 2시간 25분
- `bridge-manager.cjs`: 약 1시간 30분

따라서 generic local JSON bridge는 부팅 시 runit과 함께 올라온 것으로 보이지만, local-usage engine과 manager는 부팅 이후 다른 시점에 재기동된 흔적이 있습니다. 이는 사용자가 재부팅 직후 브릿지 기능이 살아나지 않았다고 관찰한 것과 양립하며, 현재 문제를 단순한 서비스 디렉터리 누락이 아니라 **부팅 초기화 순서 또는 local-usage manager/engine의 지연 재기동/재초기화 문제**로 좁힙니다.

현재 세 runit 서비스에는 별도 `log/run` 체인이 확인되지 않았고 `$PREFIX/var/log/sv/<service>/current`도 존재하지 않아, 부팅 직후 stdout/stderr 오류를 사후 추적하기 어려운 상태입니다. 향후 수정 시에는 자동복구 로직과 별개로 최소한의 서비스 로그 보존도 고려합니다.

또한 generic local JSON bridge의 기존 로그가 인증 토큰 값을 평문으로 출력하는 동작이 확인됐습니다. 해당 비밀값 자체는 문서에 기록하지 않으며, 이후 코드 수정 단계에서 토큰 값을 로그에 출력하지 않도록 하는 보안 정리 항목으로 남깁니다.

## 현재 판정

- generic local JSON bridge: 수동 점검 시 실행 중, runit 감독
- local-usage bridge manager: 수동 점검 시 실행 중, runit 감독
- local-usage bridge engine: 수동 점검 시 실행 중, runit 감독
- 세 서비스 모두 `down` 파일 없음
- runsvdir 및 각 runsv 감독 프로세스는 수동 점검 시 정상
- Termux:Boot → `start-services.sh` → `service-daemon start` → runsvdir 체인은 구성상 존재
- **실제 재부팅 후 브릿지 기능 자동복구는 실패 관찰됨**
- 구조상 조건만으로 자동기동 성공을 판정했던 이전 판단은 철회
- generic bridge는 부팅 시점부터 살아 있었던 것으로 보이지만 engine/manager는 이후 재기동 흔적이 있음
- 다음 단계는 세 브릿지의 실제 로컬 HTTP endpoint/health 상태와 manager/engine 초기화 상태를 수정 없이 확인하는 것

정확한 Tailscale 주소, 계정 정보, 토큰 등 비밀/식별 정보는 기록하지 않습니다.
