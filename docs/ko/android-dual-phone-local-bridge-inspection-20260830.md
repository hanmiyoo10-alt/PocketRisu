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

## 현재 로컬 HTTP health / route 확인

추가 INSPECT_ONLY에서 local-usage engine의 로컬 health endpoint를 직접 확인했습니다.

- `GET http://127.0.0.1:39117/health` → HTTP 200
- `ok=true`, `status=healthy`
- engine version은 1.6.27
- engine uptime은 약 8,854초
- plugin update endpoint가 제공되고 있으며 권장 plugin version 정보도 정상 반환

따라서 현재 시점에는 `bridge-engine.mjs` 프로세스뿐 아니라 HTTP engine 자체도 정상 응답 중입니다.

다만 health 응답의 circuit 상태에서 `open` 항목 수가 8로 관찰됐습니다. 이는 엔진 프로세스 사망을 의미하지는 않지만, 내부 upstream/CLI 요청 계층에서 반복 실패로 일부 회로 차단 상태가 열려 있을 가능성을 시사합니다. 재부팅 직후 기능 미복구 현상과 직접 연결되는지는 아직 확인 전이며, manager 상태와 실제 endpoint 호출을 추가 확인해 구분합니다.

소스 확인 결과:

- generic local JSON bridge는 `127.0.0.1:39118`에서 동작하며 인증된 `GET /snapshot`을 제공
- local-usage manager는 `127.0.0.1:39119`에서 동작하며 `GET /status` 및 engine 관리 endpoint를 제공
- local-usage engine은 `127.0.0.1:39117`에서 `/health`, `/snapshot`, `/orgs`, `/devpass-status`, `/activity`, `/analytics`, `/v1/summary` 등을 제공

generic bridge는 인증 토큰이 필수이므로 다음 검사에서는 토큰 파일을 직접 읽어 요청 헤더에만 사용하고 토큰 값을 stdout/stderr에 출력하지 않습니다.

## generic bridge 정상 / manager·engine 인증 필요 확인

추가 기능 검사에서 다음 결과를 확인했습니다.

- `39118 /snapshot`은 generic bridge token을 사용했을 때 HTTP 200으로 정상 응답
- 응답의 `health.status`는 `ok`
- 다만 snapshot의 monthly/weekly/credits/activity 값은 모두 0으로 반환되어, generic adapter 프로세스가 살아 있는 것과 실제 usage 데이터가 공급되는 것은 별개임을 확인
- `39119 /status`는 인증 헤더 없이 호출했을 때 HTTP 401 `unauthorized`
- `39117 /devpass-status`, `/orgs`, `/v1/summary`도 인증 헤더 없이 호출했을 때 HTTP 401 `Bridge token required`

따라서 manager와 engine의 401 응답은 해당 서비스의 기능 장애 증거가 아니라 인증이 필요한 endpoint를 무인증으로 호출한 결과입니다. 현 단계에서 manager/engine 실패로 판정하지 않습니다.

현재 가장 중요한 관찰은 **generic bridge가 정상 응답하면서도 snapshot 데이터가 0으로 비어 있다는 점**입니다. 재부팅 직후 로컬 플러그인이 죽은 것처럼 보였던 현상은 generic bridge 프로세스 부재보다, 뒤쪽 manager/engine/CLI/upstream 데이터 공급 또는 snapshot 갱신 체인이 아직 준비되지 않았던 상태와 더 잘 맞습니다.

## manager / engine 인증 헤더 확인

소스 INSPECT_ONLY로 인증 규칙을 확인했습니다.

- manager `39119`는 token 파일을 읽은 뒤 `X-Local-Bridge-Key` 또는 `X-DevPass-Bridge-Key` 중 하나가 일치하면 인증 성공
- manager가 engine `39117`을 검증할 때도 동일 token을 `X-Local-Bridge-Key`와 `X-DevPass-Bridge-Key` 헤더에 사용
- engine `39117`의 기능 API는 `X-DevPass-Bridge-Key`를 사용하며 token이 없거나 불일치하면 `Bridge token required`로 HTTP 401 반환
- manager runit 설정의 token 파일은 `$HOME/.config/llmgateway-devpass-bridge/token`

따라서 이전 무인증 401은 정상 인증 거절이며 장애로 해석하지 않습니다.

## 인증된 기능 검사: managed CLI backoff 확인

동일 token을 비밀값 노출 없이 요청 헤더에만 사용해 manager/engine 기능 API를 검사했습니다.

- manager `GET /status` → HTTP 200, `ok=true`
- `engineManaged=true`
- `engineBundled=true`
- `engineServiceEnvironmentReady=true`
- 그러나 `cliRuntimeState=unavailable`
- `cliRuntimeVersion`은 비어 있음
- `cliRuntimeProvisioning=backoff`
- engine `GET /devpass-status` → HTTP 502 `LLMGateway request failed`
- engine `GET /orgs` → HTTP 502 `LLMGateway request failed`
- engine `GET /v1/summary` → HTTP 200, `ok=true`, bridge version 1.6.27

따라서 현재 브릿지 장애의 핵심은 manager/engine 프로세스 자체나 bundled engine 설치가 아니라 **managed LLMGateway CLI 런타임이 준비되지 못하고 backoff 상태에 들어간 것**으로 좁혀졌습니다. live DevPass/organization 조회는 이 CLI에 의존하므로 `/devpass-status`와 `/orgs`가 502로 실패합니다. `/v1/summary`의 HTTP 200은 엔진이 부분/진단 응답을 생성할 수 있다는 뜻이지, live upstream 데이터 수집 성공을 의미하지 않습니다.

manager 소스에는 managed CLI 재시도 backoff 상수가 30분으로 정의된 흔적이 있어, 부팅 초기 네트워크/런타임 준비가 늦은 시점에 첫 provisioning이 실패하면 상당 시간 플러그인이 죽은 것처럼 보일 가능성이 있습니다. 다만 실제 최초 실패 원인이 네트워크인지, 파일/패키지 상태인지, 다른 초기화 오류인지는 아직 확정하지 않습니다. 다음 단계는 managed CLI 상태/descriptor 파일과 provisioning 관련 코드/시각을 INSPECT_ONLY로 확인하는 것입니다.

## 현재 판정

- generic local JSON bridge: 실행 중, 인증된 `/snapshot` HTTP 200
- generic snapshot health는 `ok`이지만 usage 값은 현재 0
- local-usage bridge manager: HTTP 정상, engine 관리 상태 정상
- local-usage bridge engine: `/health`와 `/v1/summary` 정상
- **managed LLMGateway CLI runtime: unavailable / provisioning backoff**
- `/devpass-status`, `/orgs`: CLI 계층 실패로 HTTP 502
- 실제 재부팅 후 브릿지 기능 자동복구 실패 원인은 프로세스 미기동보다 managed CLI provisioning 실패와 더 잘 맞음
- 최초 provisioning 실패의 직접 원인은 아직 미확정
- 다음 단계는 상태/descriptor 파일과 backoff 시각을 읽어 최초 실패 조건을 좁히는 것

정확한 Tailscale 주소, 계정 정보, 인증 토큰 등 비밀/식별 정보는 기록하지 않습니다.
