# 서버 서비스 로그 경로 확인 (2026-09-01)

## 관측

서버폰에서 `sshd`와 `pocketrisu` runit 서비스의 `run`/`log/run` 구조를 INSPECT_ONLY로 확인했다.

### sshd

- 서비스 run: `exec sshd -D -e 2>&1`
- logger run은 서비스명을 바탕으로 `$LOGDIR/sv/$service` 디렉터리를 만들고 `svlogd -tt`로 기록한다.
- 따라서 sshd 실제 로그 경로는 `$LOGDIR/sv/sshd`이며, 현재 환경의 `$LOGDIR=$PREFIX/var/log` 기준으로 `$PREFIX/var/log/sv/sshd`가 실제 경로다.
- sshd 서비스와 logger의 service age는 동일하게 약 1322초였다.

### pocketrisu

- runit logger 서브서비스가 없다.
- 서비스 run이 `node server/node/server.cjs >>"$HOME/pocketrisu-service.log" 2>&1` 형태로 직접 append한다.
- 따라서 PocketRisu 서비스 로그는 `$HOME/pocketrisu-service.log`에 기록된다.
- `sv status "$SVC/log"` 실패는 logger 디렉터리가 애초에 없는 구조이므로 서비스 오류의 증거가 아니다.

## 해석

03:17경 Termux UI를 연 뒤 sshd와 pocketrisu service age가 동일 세대로 재구성된 앞선 관측과 일치한다.

다음 단계는 02:22:50 KST 전후의 pre-death 로그를 최소 범위로 확인하는 것이다. 서비스 재시작이나 wake-lock 변경 없이 INSPECT_ONLY로 진행한다.
