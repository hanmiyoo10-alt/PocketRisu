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

## direct SSH 상태

같은 블록에서 실제 tunnel destination으로 direct SSH 8022를 시도했으나, 사용자가 제공한 출력은 `ssh ... true >/dev/null 2>"$ERR"` 실행 직후에서 끝났습니다.

따라서 현재 시점에는 다음 값이 아직 없습니다.

- SSH 종료코드
- `DIRECT_SSH_OK` / `CONNECTION_REFUSED` / `TIMEOUT` 등 최종 분류

따라서 이 중간 체크는 **backend/forwarded health PASS, direct SSH 판정 보류**로 기록합니다. 90분 soak 전체 PASS를 아직 선언하지 않습니다.

정확한 Tailscale 주소, 인증정보, 토큰 등 비밀/식별 정보는 기록하지 않습니다.
