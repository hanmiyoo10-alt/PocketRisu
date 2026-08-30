# Android 듀얼폰 wake-lock instrumentation 재부팅 직전 baseline — 2026-08-30

## 목적

수동 wake-lock 90분 A/B PASS 이후, 서버폰 Termux:Boot 스크립트에 wake-lock 관측/재시도 instrumentation을 추가한 상태에서 controlled reboot 직전 기준점을 고정합니다.

## 스크립트/백업 검증

- 현재 boot script SHA256: `cfc8f89af4f6b564a3c359a5e1afea7c69e64ab2635482c78f9dde66504865ce`
- 기대 새 SHA와 일치: `BOOT_SHA_VERIFY=PASS`
- 백업 SHA256: `f54c9bb1b68a6d41a05ff257f5adfdf71a6c40b069f8ccd0ef3a0e10c9f09004`
- 기대 기존 SHA와 일치: `BACKUP_SHA_VERIFY=PASS`
- `sh -n` 결과: `syntax_rc=0`

검증된 백업:

`$HOME/.termux/boot/00-pocketrisu-server.bak-pre-instrument-20260830-210504`

## 재부팅 전 wake-lock marker 상태

다음 파일은 모두 존재하지 않았습니다.

- `$HOME/.termux/boot-wakelock-last`
- `$HOME/.termux/boot-wakelock.log`

둘 다 `NOT_FOUND_EXPECTED`이므로 다음 부팅 뒤 생성되는 `boot_initial`, `core_wait`, `post_core_wait` 기록을 이번 controlled reboot 결과로 분리해 해석할 수 있습니다.

## 재부팅 전 runtime 상태

다음 서버 서비스가 모두 동일 PID로 약 `6820s` 연속 run 상태였습니다.

- sshd PID `27587`
- PocketRisu PID `27585`
- local-usage manager PID `27588`
- local-usage engine PID `27590`
- generic bridge PID `27589`

Health:

- PocketRisu core: HTTP `200`
- local-usage engine: HTTP `200`

따라서 재부팅 직전 backend runtime은 정상입니다.

## 현재 판단

1. instrumentation 설치 상태와 백업 무결성 모두 PASS
2. syntax PASS
3. pre-boot marker는 아직 없어 증거 오염 없음
4. server backend는 재부팅 직전 정상
5. 다음 단계는 controlled reboot 후 **서버 Termux를 수동으로 열기 전에** 메인폰 remote-path 확인으로 자동 복구 여부를 먼저 판정
6. 실패 시 서버 Termux를 열기 전에 direct SSH 분류로 상태를 보존

정확한 Tailscale 주소, 토큰, 계정정보 등 비밀/식별 정보는 기록하지 않습니다.
