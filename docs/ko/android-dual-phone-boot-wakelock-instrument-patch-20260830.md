# Android 듀얼폰 boot wake lock 관측 패치 — 2026-08-30

## 배경

수동 `com.termux.service_wake_lock` 요청 상태에서 90분 이상 원격 backend/sshd 경로가 안정적으로 유지된 반면, 기존 persistent wake-lock boot 구성은 장기 soak에서 whole-Termux/runit/sshd 소실이 재현되었습니다.

기존 boot script는 부팅 초기에 `termux-wake-lock >/dev/null 2>&1 || true`를 한 번 호출했지만, 성공/실패 rc와 시각이 남지 않아 실제 acquisition 요청 상태를 검증할 수 없었습니다.

## 사전 백업

패치 전 원본:

- path: `$HOME/.termux/boot/00-pocketrisu-server`
- SHA256: `f54c9bb1b68a6d41a05ff257f5adfdf71a6c40b069f8ccd0ef3a0e10c9f09004`

검증된 백업:

- `$HOME/.termux/boot/00-pocketrisu-server.bak-pre-instrument-20260830-210504`
- 원본과 백업 SHA 동일
- `BACKUP_VERIFY=PASS`

## 적용한 최소 패치

boot script에 다음 관측/재시도 로직을 추가했습니다.

1. `umask 077`
2. `$HOME/.termux/boot-wakelock-last`, `$HOME/.termux/boot-wakelock.log` 로컬 marker/log 사용
3. `record_wake_lock()` 함수 추가
   - phase 이름
   - 실행 시각
   - `termux-wake-lock` 종료코드
   - stderr/stdout이 존재할 경우 최대 20줄
4. boot 초기에 `record_wake_lock boot_initial`
5. 기존 PocketRisu core 준비 대기 결과를 다음 값으로 기록
   - `core_ready`
   - `iterations`
6. core 대기 종료 후 `record_wake_lock post_core_wait`를 한 번 더 실행

두 번째 요청은 이미 wake lock이 유지 중이면 중복 요청이며, 첫 요청이 부팅 초기에 너무 일러 정상 처리되지 못한 경우 재시도 역할을 하도록 의도했습니다.

## 정적 검증 결과

패치 staged file:

- `STAGED_SYNTAX=PASS`

설치:

- `install_rc=0`

설치 후 검증:

- `verify_syntax_rc=0`
- `PATCH_VERIFY=PASS`
- 새 SHA256: `cfc8f89af4f6b564a3c359a5e1afea7c69e64ab2635482c78f9dde66504865ce`
- mode: `700`

재부팅은 아직 수행하지 않았습니다.

## 관측상 주의점

현재 Termux의 `termux-wake-lock` wrapper는 내부 `am startservice`의 stdout을 `/dev/null`로 버립니다. 따라서 성공 시 `output_begin` 블록이 비어 있어도 이상하지 않습니다.

이 패치에서 핵심 관측값은 각 phase의 `rc`, timestamp, `core_ready`, `iterations`입니다.

## 현재 상태

- 현재 수동 wake lock은 해제하지 않음
- boot script 패치만 적용됨
- runtime 재시작/재부팅은 아직 하지 않음
- 다음 단계는 재부팅 전 최종 상태 확인 후 별도 controlled reboot validation

정확한 Tailscale 주소, 토큰, 인증정보 등 비밀/식별 정보는 기록하지 않습니다.
