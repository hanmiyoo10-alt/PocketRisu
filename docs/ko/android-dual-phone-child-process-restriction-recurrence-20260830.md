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

정확한 Tailscale 주소, 계정 정보, 인증 토큰 등 비밀/식별 정보는 기록하지 않습니다.
