# Android 듀얼폰 서버폰 재부팅 검증 — 2026-08-30

서버폰의 local-usage/DevPass 브릿지 영구화 완료 뒤 실제 재부팅 자동복구를 검증하기 위한 기록입니다.

## 재부팅 전 baseline

재부팅 직전 서버폰에서 다음 상태를 확인했습니다.

- `pocketrisu`, `sshd`, `local-usage-runtime-manager`, `local-usage-runtime-engine`, `llmgateway-bridge` 모두 run 상태
- 위 서비스 모두 `down` 파일 없음
- engine run 파일 syntax OK
- engine run 파일에 `DEVPASS_BRIDGE_MANAGED_CLI=1` 및 `LLMGATEWAY_CLI_VERSION=1.10.0` 존재
- engine run 파일 SHA256: `617f2e4f7f1945c317f3c173fa233ae70c76a8b6f3002906b767384fcbcd4f6a`
- manager syntax OK
- manager SHA256: `04704d7d6541abaf4295fc4db04a5280fe221e0b80137910c3c617aff7cac544`
- manager `MANAGED_CLI_VERSION=1.10.0`
- 서버 Termux:Boot 스크립트 syntax OK
- 부팅 스크립트는 초기화 동안 wake lock을 잡고 PocketRisu health 대기 후 wake unlock하는 현재 구조 유지
- PocketRisu local health HTTP 200
- bridge engine health HTTP 200
- 인증된 manager status HTTP 200
- 인증된 `/devpass-status`, `/orgs`, `/v1/summary` 모두 HTTP 200
- engine status `healthy`, version 1.6.27, `circuits.open=0`

따라서 재부팅 전 backend/bridge 기준점은 정상입니다.

## 실사용 상태

CLI version 1.10.0 적용 및 engine 정상화 과정에서 메인폰 PocketRisu가 실제로 다시 연결된 것이 사용자 관점에서 이미 확인되었습니다. 따라서 API health뿐 아니라 실제 PocketRisu 연결 복구도 재부팅 전 정상 상태로 간주합니다.

## 재부팅 검증 원칙

서버폰 재부팅 뒤에는 먼저 서버폰의 Termux/Tailscale/PocketRisu 앱을 수동으로 열지 않은 상태에서 메인폰 쪽 원격 경로가 자동으로 돌아오는지 확인합니다. 이것은 서버폰 Tailscale 자동 연결과 sshd/PocketRisu 부팅 복구를 함께 검증하기 위함입니다.

그 뒤에만 서버폰에서 runit 서비스, manager CLI runtime 1.10.0, engine run env, live DevPass/org API, circuit 상태를 확인합니다. 예상과 다른 결과가 나오면 다른 서비스까지 재시작하지 않고 그 지점에서 원인을 좁힙니다.

## 첫 메인폰 원격 복구 프로브: 미확정

서버폰 재부팅 뒤 메인폰에서 첫 원격 복구 프로브를 실행했을 때 `pocketrisu-ssh-tunnel`은 run 상태였지만 표시된 PID의 경과 시간이 약 1초로 매우 짧아, runit이 막 새 터널 프로세스를 올렸거나 재시작 루프 중일 가능성이 보였습니다.

같은 실행의 core health 결과는 `000`이었지만, 사용자가 붙여넣은 명령의 URL이 터미널에서 Markdown 링크 형태(`[http://...](http://...)`)로 변형된 흔적이 확인됐습니다. 따라서 이 `curl 000`은 실제 core reachability 결과로 신뢰하지 않습니다.

현재 해석은 다음과 같습니다.

- 자동복구 성공으로 볼 수 없음
- `curl 000`만으로 서버 Tailscale 자동 연결 실패를 확정할 수도 없음
- 짧은 tunnel PID age는 실제 연결 실패/재시작 가능성을 시사하므로 메인폰 tunnel 상태를 먼저 INSPECT_ONLY로 분리 진단해야 함
- 서버폰 Termux/Tailscale/PocketRisu 앱은 아직 수동으로 열지 않고 테스트 상태를 보존

## 메인폰 tunnel 재시작 루프 확인

추가 INSPECT_ONLY에서 `pocketrisu-ssh-tunnel` 상태를 약 10초 동안 세 번 표본 확인했습니다.

- sample 1 PID `30846`, age 0s
- sample 2 PID `30921`, age 0s
- sample 3 PID `30991`, age 0s
- 5초 간격으로 PID가 계속 바뀌므로 runit의 SSH tunnel 재시작 루프가 확정됨
- 올바르게 조립한 localhost core health probe도 HTTP `000`
- 표본 순간 현재 SSH process가 보이지 않았으며, 빠른 재시작 사이 구간과 일치
- service log 파일은 해당 예상 경로에서 찾지 못함

따라서 현재 실패층은 PocketRisu frontend나 local-usage API가 아니라 **메인폰에서 서버폰으로 SSH tunnel을 세우는 단계**입니다. 다만 이 결과만으로는 서버폰 Tailscale 미연결과 서버 sshd 미기동을 구분할 수 없습니다. 다음 단계는 서버폰 앱을 수동으로 열지 않은 채 메인폰에서 tunnel과 동일한 대상에 1회성 SSH verbose 연결을 시도해 `timeout/no route`와 `connection refused/auth success`를 구분하는 것입니다.

정확한 Tailscale 주소, 계정 정보, 인증 토큰 등 비밀/식별 정보는 기록하지 않습니다.
