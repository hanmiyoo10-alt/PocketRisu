# Android 듀얼폰 direct 8022 probe 도구 부재 — 2026-08-30

`Disable child process restrictions=ON` + wake lock OFF 조건에서 재발한 원격 단절 상태를 보존한 채, 메인폰에서 서버폰 SSH 8022의 TCP 상태를 분류하려고 `nc -zv -w 5` 검사를 시도했습니다.

결과는 `nc_rc=127`이었고 Termux가 `The program nc is not installed`를 출력했습니다. 따라서 이 시도에서는 실제 8022 TCP 연결 검사가 전혀 실행되지 않았습니다.

이 결과는 `Connection refused`, timeout, route failure, sshd 생존 여부에 대한 증거로 사용하지 않습니다. 상태 오염을 피하기 위해 `netcat-openbsd` 패키지를 설치하지 않고, 이미 설치된 OpenSSH `ssh`를 이용한 단순 direct 연결 분류로 다음 검사를 진행합니다.

서버폰 Termux는 실패 상태 보존을 위해 아직 열지 않습니다. 실제 서버 주소, Tailscale 주소, 인증 정보는 문서에 기록하지 않습니다.
