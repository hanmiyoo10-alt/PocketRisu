# Android 듀얼폰 boot wake-lock instrumentation 재부팅 검증 시작 — 2026-08-30

## 상태

instrumented boot script 설치와 재부팅 직전 baseline 검증을 마친 뒤 서버폰을 Android 전원 메뉴에서 정상 재부팅했습니다.

사용자는 재부팅 완료를 확인했습니다. 이 시점부터는 서버폰 Termux 앱을 열지 않고 상태를 보존한 채, 메인폰에서만 다음 순서로 자동 복구 여부를 확인합니다.

1. 메인 SSH tunnel / notify tunnel 상태
2. forwarded PocketRisu core / local-usage engine health
3. 서버폰 sshd direct SSH 8022

이 1차 원격 경로 판정이 끝나기 전에는 서버폰의 boot-wakelock marker/log를 직접 열어보지 않습니다. 원격 복구가 성공하면 다음 단계에서 direct SSH를 통해 `boot_initial`, `core_wait`, `post_core_wait` 기록을 읽어 boot-time wake-lock 요청 결과를 판정합니다.

정확한 Tailscale 주소, 인증정보, 토큰 등 비밀/식별 정보는 기록하지 않습니다.
