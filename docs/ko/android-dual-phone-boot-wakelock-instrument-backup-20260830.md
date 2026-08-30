# Android 듀얼폰 boot wake lock instrumentation 백업 — 2026-08-30

## 목적

수동 wake-lock 90분 A/B가 전체 remote path에서 PASS한 뒤, boot-time wake-lock과 수동 wake-lock의 차이를 관찰하기 위한 최소 instrumentation 패치 전에 현재 boot script를 별도 백업으로 고정했습니다.

## 사전 조건 확인

현재 파일:

- path: `$HOME/.termux/boot/00-pocketrisu-server`
- SHA256: `f54c9bb1b68a6d41a05ff257f5adfdf71a6c40b069f8ccd0ef3a0e10c9f09004`

기대 SHA와 동일했습니다.

## 생성된 백업

- `$HOME/.termux/boot/00-pocketrisu-server.bak-pre-instrument-20260830-210504`
- copy rc: `0`
- 원본 SHA와 백업 SHA 동일
- `BACKUP_VERIFY=PASS`

따라서 이 단계에서는 boot script 본문을 수정하지 않았고, instrumentation 적용 전에 복구 지점을 하나 더 확보했습니다.

## 현재 상태

- `NO_MODIFICATION_TO_BOOT_SCRIPT`
- 수동 wake lock은 해제하지 않음
- 다음 단계에서만 boot 초기 wake-lock 요청 결과 기록과 core 준비 후 두 번째 idempotent wake-lock 요청을 추가할 예정

정확한 Tailscale 주소, 인증정보, 토큰 등 비밀/식별 정보는 기록하지 않습니다.
