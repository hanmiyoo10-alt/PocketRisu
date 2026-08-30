# Android 듀얼폰 manual wake lock soak 중간 체크 — 2026-08-30

## 배경

persistent wake lock boot 구성의 장기 soak 실패 이후 서버폰 Termux를 다시 열고 수동으로 `com.termux.service_wake_lock` 요청을 보낸 상태에서 장시간 안정성을 재검증 중입니다.

## 메인폰 중간 체크 결과

메인폰에서 `MANUAL WAKELOCK 90MIN SOAK CHECK` 블록을 실행한 중간 출력은 다음과 같습니다.

- `pocketrisu-ssh-tunnel`: PID `21582`, age 약 `3083s`
- `pocketrisu-notify-tunnel`: PID `21559`, age 약 `3084s`
- forwarded PocketRisu core: HTTP `200`
- forwarded local-usage engine: HTTP `200`

따라서 이 체크포인트에서 메인 원격 경로와 backend health는 정상입니다.

다만 `3083~3084s`는 메인 tunnel 프로세스 age이며, 이를 수동 wake-lock 자체의 경과시간으로 해석하지 않습니다.

## direct SSH 최종 분류: PASS

직전 direct SSH 8022 명령의 종료코드를 바로 보존해 확인한 결과:

- `ssh_rc=0`
- `CLASS=DIRECT_SSH_OK`

따라서 이 체크포인트에서는 메인 tunnel만 살아 있는 것이 아니라 서버폰 sshd 자체도 port `8022`에서 정상적으로 연결을 수락하고 원격 명령 실행까지 완료했습니다.

현재 체크포인트 판정:

- main SSH tunnel: PASS
- main notify tunnel: PASS
- forwarded core: HTTP 200
- forwarded engine: HTTP 200
- direct SSH 8022: PASS

## soak 시간 판정 정정

수동 wake-lock 요청과 일치하는 Termux notification 갱신 시각은 약 `19:21:12 +0900`이었고, direct SSH PASS를 확인한 현재 시각은 약 `20:24 +0900`입니다. 따라서 이 체크포인트는 수동 wake-lock 이후 약 `63분` 경과 시점입니다.

그러므로 명령 제목에 `90MIN`이 포함되어 있어도 **90분 soak PASS로 선언하지 않습니다.** 90분 기준점은 약 `20:51:12 +0900` 이후입니다.

## 현재 판단

1. 수동 wake-lock 상태에서 약 63분 시점까지 backend 원격 경로는 정상
2. core/engine은 모두 HTTP 200
3. direct SSH도 `DIRECT_SSH_OK`
4. 이전 whole-Termux/runit/sshd 소실 패턴은 현재까지 재현되지 않음
5. 다만 90분 기준은 아직 도달하지 않았으므로 최종 90분 soak 판정은 보류
6. 서버폰에서는 `termux-wake-unlock`, Termux 강제종료, 최근 앱 스와이프 등을 하지 않고 상태를 보존

정확한 Tailscale 주소, 인증정보, 토큰 등 비밀/식별 정보는 기록하지 않습니다.
