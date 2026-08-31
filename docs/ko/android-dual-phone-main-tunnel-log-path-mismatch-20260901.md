# Android 듀얼폰 메인 SSH 터널 로그 경로 불일치 점검 (2026-09-01)

## 배경

장기 wake-lock 계측 테스트 이후 서버폰 Termux/runit/sshd 전체 소실 패턴이 다시 확인되었습니다. 메인폰에서 다음 조합이 반복 확인되었습니다.

- pocketrisu-ssh-tunnel 및 notify tunnel이 초 단위로 재시작
- forwarded core HTTP 000
- forwarded engine HTTP 000
- direct SSH 8022: connection refused

서버폰 Termux 앱은 열지 않은 상태를 유지했습니다.

## 메인 SSH 터널 로그 경로 INSPECT_ONLY

메인폰에서 다음 후보 로그 디렉터리를 확인했습니다.

- `$PREFIX/var/log/pocketrisu-ssh-tunnel`
- `$PREFIX/var/service/pocketrisu-ssh-tunnel/log/main`

결과:

- `SSH_TUNNEL_LOG_DIR_NOT_FOUND`
- 검사 자체는 INSPECT_ONLY
- 서버폰 Termux는 열지 않음

## 해석

이 결과는 logger가 없다는 뜻으로 단정할 수 없습니다. 직전 `sv status` 출력에는 pocketrisu-ssh-tunnel의 별도 log 프로세스 PID가 계속 표시되었습니다.

따라서 현재 단계에서는 다음 중 하나를 의심합니다.

- `log/run`이 다른 디렉터리를 `svlogd` 대상으로 사용
- service `log` 하위가 존재하지만 `main`이 아닌 다른 경로를 사용
- symlink 또는 별도 run script가 실제 로그 위치를 지정

다음 단계는 메인폰에서 `pocketrisu-ssh-tunnel/log` 구조와 `log/run` 내용을 좁게 읽어 실제 로그 목적지를 확인하는 것입니다. 서버폰은 계속 열지 않습니다.

정확한 private endpoint 및 인증정보는 기록하지 않습니다.
