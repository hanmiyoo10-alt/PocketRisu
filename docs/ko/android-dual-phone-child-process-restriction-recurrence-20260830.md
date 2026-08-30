# Android 듀얼폰 child-process 제한 해제 후 재부팅 재발 — 2026-08-30

## 배경

서버폰에서 Developer options의 `Disable child process restrictions`를 ON으로 바꾸고 런타임 wake lock을 해제한 뒤, 일정 시간 실사용에서는 이전의 완전 단절이 재현되지 않아 provisional pass로 관찰했습니다.

이후 서버폰을 재부팅했고, Termux UI가 잠시 나타났다가 사라졌지만 메인폰에서 `pocketrisu-ssh-tunnel`과 `pocketrisu-notify-tunnel`이 약 7분 연속 run 상태였으며 forwarded core와 engine health가 모두 HTTP 200이라 재부팅 직후 원격 자동복구는 PASS로 확인했습니다.

## 이후 재발 보고

그 뒤 사용 중 다시 장애가 발생했습니다.

사용자 관찰:

- PocketRisu에서 `Fail save 1chat` 오류가 표시됨
- local bridge도 더 이상 동작하지 않음
- 재부팅 후 브라우저/PocketRisu 페이지를 새로고침하지 않고 기존 세션을 이어서 사용한 상태였음

기존 브라우저 세션을 그대로 이어 쓴 점은 `Fail save 1chat` 같은 UI/session 오류에 일부 영향을 줄 가능성은 있지만, bridge까지 동시에 실패했다는 점 때문에 브라우저 세션 문제만으로 전체 장애를 설명하지 않습니다.

따라서 `Disable child process restrictions=ON`만으로 wake lock을 완전히 대체할 수 있다는 provisional pass는 현재 **철회/보류**합니다. 재부팅 직후 자동복구가 잠시 성공한 것과 장기 background survival은 분리해서 판단해야 합니다.

## 재발 시 메인폰 INSPECT_ONLY 결과

서버폰 Termux를 열지 않은 채 메인폰에서 재발 상태를 확인했습니다.

- `pocketrisu-ssh-tunnel`: age `0s`로 재시작 루프
- `pocketrisu-notify-tunnel`: age `1s`로 재시작 루프
- forwarded core health: HTTP `000`
- forwarded engine health: HTTP `000`
- 추정한 `$PREFIX/var/log/.../current` 경로에서는 두 tunnel log를 찾지 못함

따라서 이번 재발은 브라우저 세션의 저장 오류만으로 설명되지 않으며, 메인폰의 원격 core/bridge 경로 자체가 다시 완전히 끊긴 상태입니다. tunnel log 경로 탐색은 실제 구성과 맞지 않았으므로 `LOG_NOT_FOUND`는 장애 원인 판정에 사용하지 않습니다.

## 실제 SSH tunnel 설정 확인

메인폰의 `$PREFIX/var/service/pocketrisu-ssh-tunnel/run`을 INSPECT_ONLY로 확인했습니다.

- run script SHA-256: `7cc637dfd366e836b8f3175e01852a70c0006e0778f347401532762b3703f1bf`
- SSH port: `8022`
- `BatchMode=yes`
- `StrictHostKeyChecking=yes`
- `ExitOnForwardFailure=yes`
- `ConnectTimeout=10`
- `ServerAliveInterval=30`
- `ServerAliveCountMax=3`
- local forwards: core `6001`, engine `39117`, generic bridge `39118`, manager `39119`
- 서버 SSH 사용자명은 기존 서버폰 Termux UID 계정이며, 실제 대상 주소는 문서에 기록하지 않음

## direct SSH 분류 시도 오류

첫 direct SSH 분류 명령은 중첩 quoting 문제로 실제 SSH 연결 전에 셸 파싱이 깨졌습니다. 두 번째 TCP 분류 시도는 메인폰에 `nc`가 설치되어 있지 않아 `rc=127`로 실행되지 않았습니다. 두 시도 모두 서버 상태 판정 근거로 사용하지 않습니다.

## direct SSH 8022 최종 분류: CONNECTION_REFUSED

세 번째 시도에서는 추가 패키지 설치 없이 메인폰에 이미 있는 OpenSSH 클라이언트를 사용해 실제 tunnel destination으로 port `8022` direct SSH를 1회 시도했습니다.

결과:

- `ssh_rc=255`
- 분류: `CLASS=CONNECTION_REFUSED`

이 결과는 메인폰에서 서버폰의 네트워크 endpoint까지 도달했으나 서버 port `8022`에서 sshd가 listen 중이 아니었음을 의미합니다. 따라서 이번 재발은 단순한 브라우저 세션 오류나 메인폰 SSH tunnel 프로세스 자체의 오류로 설명되지 않습니다.

앞선 증거와 합치면 현재 패턴은 다음과 같습니다.

1. 서버폰 재부팅 직후에는 Termux:Boot 경로가 실행되어 core/bridge/SSH가 잠시 정상 복구됨
2. `Disable child process restrictions=ON` + 지속 wake lock 없음 상태에서 일정 시간이 지나면 서버 background service stack이 다시 사라짐
3. 메인폰 tunnel은 재시작 루프에 빠지고 forwarded core/engine은 HTTP 000
4. direct SSH 8022는 `Connection refused`

따라서 **`Disable child process restrictions=ON` 단독으로는 서버폰 Termux/runit/sshd의 장기 생존을 보장하지 못한 것으로 판정**합니다. wake lock 없는 구성의 provisional pass는 철회합니다.

현재 가장 강한 안정성 증거는 임시 wake lock을 유지한 동안 완전 단절이 재현되지 않았다는 반복 관찰입니다. 다음 운영 방향은 서버폰 wake lock을 안정성 기본값으로 복구한 뒤, wake lock 자체를 제거하려 하기보다 PocketRisu/bridge/SSH/reconnect/logging의 idle CPU와 wakeup을 줄여 발열·배터리 소모를 최적화하는 것입니다.

## 서버폰 Termux 재오픈 직후 재구성 및 wake lock 복구 기준점

메인폰에서 `Connection refused`까지 확보한 뒤 서버폰 Termux를 직접 열어 상태를 확인했습니다. Termux를 연 직후 `runsvdir` PID는 `26182`였고, 다음 다섯 서비스가 모두 약 `1s` age로 동시에 새로 올라왔습니다.

- `sshd` PID `26192`
- `pocketrisu` PID `26189`
- `local-usage-runtime-manager` PID `26193`
- `local-usage-runtime-engine` PID `26197`
- `llmgateway-bridge` PID `26194`

이 결과는 장애 중 sshd 단독이 아니라 Termux runit 서비스 그룹 전체가 사라졌고, Termux UI를 여는 행위가 supervisor/service stack을 다시 구성했다는 기존 관찰을 다시 확인합니다.

그 직후 `termux-wake-lock`을 실행했고 종료코드는 `0`이었습니다. wake lock 획득 전후 `runsvdir` PID는 `26182`로 동일했고, 다섯 서비스의 PID도 모두 유지된 채 age가 `1s`에서 약 `4s`로 연속 증가했습니다. 따라서 wake lock 획득 자체가 서비스 재시작을 일으키지는 않았습니다.

다만 wake lock 획득 직후 로컬 health는 다음과 같이 엇갈렸습니다.

- PocketRisu core `127.0.0.1:6001/api/health`: HTTP `000`
- local-usage engine `127.0.0.1:39117/health`: HTTP `200`

따라서 이 시점에는 **wake lock 획득은 성공했지만 서버 복구 완료로 판정하지 않습니다.** PocketRisu 서비스가 단순 기동 중인지, core만 별도 실패한 것인지 확인하기 위해 수정 없이 추가 INSPECT_ONLY가 필요합니다. 예상과 다른 결과이므로 boot script나 서비스 파일은 아직 변경하지 않습니다.

## wake lock 복구 후 PocketRisu startup 재확인: PASS

추가로 약 15초를 기다린 뒤 수정 없이 다시 확인했습니다. 실제 확인 시점에는 서비스 age가 약 `129s`까지 증가해 있었고, 다음 다섯 서비스가 모두 기존 PID를 유지한 채 연속 run 중이었습니다.

- `sshd` PID `26192`
- `pocketrisu` PID `26189`
- `local-usage-runtime-manager` PID `26193`
- `local-usage-runtime-engine` PID `26197`
- `llmgateway-bridge` PID `26194`

PocketRisu의 supervise PID는 `26189`였고 실제 프로세스는 `node server/node/server...` 형태로 정상 실행 중이었습니다. 로컬 health는 다음과 같이 모두 회복했습니다.

- PocketRisu core: HTTP `200`
- local-usage engine: HTTP `200`

따라서 wake lock 획득 직후의 core HTTP `000`은 영구 장애가 아니라 **PocketRisu가 engine보다 늦게 준비된 startup delay**로 해석합니다. 서버폰 Termux를 열어 runit stack이 재구성된 뒤 wake lock을 획득하면, 서비스 PID 연속성을 유지한 채 core/engine이 모두 정상 상태로 회복되는 것을 확인했습니다.

현재 운영 상태는 **wake lock ON + 서버 core/bridge 정상**입니다. 다음 변경은 바로 boot script를 수정하지 않고, 먼저 현재 boot script에서 `termux-wake-lock`과 `termux-wake-unlock`이 어떤 조건/경로로 배치되어 있는지 INSPECT_ONLY로 재확인한 뒤 백업 → 최소 수정 → 검증 순서로 진행합니다.

정확한 Tailscale 주소, 계정 정보, 인증 토큰 등 비밀/식별 정보는 기록하지 않습니다.
