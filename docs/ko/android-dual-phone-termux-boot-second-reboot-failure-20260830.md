# Android 듀얼폰 Termux:Boot 2차 재부팅 실패 — 2026-08-30

서버폰에서 Termux:Boot `BootActivity`를 한 번 명시적으로 실행해 공식 초기 활성화 조건을 충족시킨 뒤, 서버폰을 다시 재부팅해 자동복구를 재검증한 기록입니다.

## 2차 재부팅 결과

서버폰 부팅 후 잠금을 한 번 해제하고 Termux/Termux:Boot/Tailscale/PocketRisu 앱을 수동으로 열지 않은 상태에서 약 2분 기다린 뒤 메인폰에서 검사했습니다.

- 메인폰 `pocketrisu-ssh-tunnel`은 run 상태지만 PID age가 약 1초로, 서버 접속 실패에 따른 빠른 재시도 상태와 일치
- tunnel 대상과 동일한 서버 주소/포트 8022에 1회성 SSH 연결 시도
- SSH rc=255
- 결과는 `Connection refused`
- localhost core health는 HTTP `000`

`Connection refused`이므로 Tailscale 경로 자체는 서버폰까지 도달한 것으로 판단하며, 재부팅 뒤 서버폰 sshd 8022가 자동 기동하지 않은 상태가 다시 재현됐습니다.

## 가설 정리

Termux:Boot는 앞선 검사에서 다음이 이미 확인됐습니다.

- 앱 설치됨
- package enabled
- launcher `BootActivity` 정상 resolve
- `BOOT_COMPLETED` receiver `BootReceiver` 정상 resolve
- `BootActivity` 직접 실행 성공

따라서 **Termux:Boot 앱을 한 번도 실행하지 않아 boot receiver가 막혔다는 가설은 단독 원인으로 탈락**합니다.

현재 실패층은 계속 서버폰의 Termux:Boot/Android background boot execution 쪽입니다. 서버폰 Tailscale 자동 연결은 이번에도 정상으로 판단되고, 메인폰 tunnel과 PocketRisu remote core failure는 서버 sshd 부재의 결과입니다.

## upstream 동작 참고

현재 `termux/termux-boot`의 `BootReceiver`는 `BOOT_COMPLETED`를 받으면 `~/.termux/boot`의 파일들을 정렬한 뒤 각 파일을 `JobScheduler` job으로 등록합니다. `BootJobService`는 해당 job 실행 시 Termux의 `TermuxService`를 foreground service로 시작해 스크립트를 실행합니다.

따라서 다음 진단은 PocketRisu 코드나 tunnel을 수정하는 것이 아니라, 서버폰에서 Termux:Boot가 부팅 후 job/background 실행 단계에서 막히는지와 Samsung/Android background 제한 상태를 좁히는 방향으로 진행합니다.

정확한 Tailscale 주소, 계정 정보, 인증 토큰 등 비밀/식별 정보는 기록하지 않습니다.
