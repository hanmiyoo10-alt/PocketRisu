# Android 듀얼폰 boot wake lock 패치 사전검사 — 2026-08-30

## 배경

persistent wake lock boot 구성은 재부팅 직후 자동복구에는 성공했지만 장기 soak 중 Termux/runit/sshd 전체 서비스층이 사라지는 장애가 재발했습니다. 이후 서버폰 Termux를 다시 열고 수동으로 `com.termux.service_wake_lock` 요청을 보낸 상태에서는 90분을 넘긴 시점까지 메인 SSH/notify tunnel, forwarded PocketRisu core/local-usage engine, direct SSH 8022가 모두 정상인 A/B PASS를 확인했습니다.

다음 수정은 boot-time wake-lock 요청의 성공 여부를 로컬에 기록하고, 서비스/core 준비 이후 동일 요청을 한 번 더 수행하는 방향을 검토하되, 수정 전에 현재 boot 파일과 기존 백업/marker 상태를 다시 고정했습니다.

## 현재 boot script

대상:

`$HOME/.termux/boot/00-pocketrisu-server`

SHA-256:

`f54c9bb1b68a6d41a05ff257f5adfdf71a6c40b069f8ccd0ef3a0e10c9f09004`

현재 내용의 핵심:

- 시작 직후 `termux-wake-lock >/dev/null 2>&1 || true`
- `start-services.sh` 로 runit 시작
- sshd enable 및 PocketRisu `sv up`
- PocketRisu core health를 최대 약 90초 대기
- 별도 wake-lock 결과 기록 없음
- 두 번째 wake-lock 요청 없음

따라서 파일이 앞선 persistent-wakelock 패치 이후 임의로 변경되거나 롤백된 정황은 없습니다.

## 기존 백업

다음 기존 백업들이 확인되었습니다.

- `00-pocketrisu-server.bak-wakelock-20260829-201511`
- `00-pocketrisu-server.bak-auto-unlock-20260830-003030`
- `00-pocketrisu-server.bak-persistent-wakelock-20260830-174711`

새 수정 전에 현재 `f54c9b...` 상태 자체도 별도 백업으로 한 번 더 고정할 예정입니다.

## wake-lock 관측 파일 상태

현재 다음 파일은 존재하지 않습니다.

- `$HOME/.termux/boot-wakelock.log`
- `$HOME/.termux/boot-wakelock-last`

반면 기존 boot probe는 존재합니다.

- `$HOME/.termux/boot-probe-last`
- `boot_probe_ran=1`
- `time=2026-08-30T18:05:27+0900`

따라서 Termux:Boot 실행 자체는 확인되지만, boot-time `termux-wake-lock` 호출의 종료코드나 오류 출력은 지금까지 전혀 보존되지 않았습니다.

## termux-wake-lock 구현 재확인

명령 경로:

`/data/data/com.termux/files/usr/bin/termux-wake-lock`

SHA-256:

`9fe3144c12a57c8da9daa06f963d873636b823a03ab1d753b144e37bffa0b9fa`

이 wrapper는 `am startservice`로 다음 action/component를 호출합니다.

- action: `com.termux.service_wake_lock`
- component: `com.termux/com.termux.app.TermuxService`

wrapper 자체는 `am startservice` stdout을 `/dev/null`로 버립니다. 현재 boot script도 wrapper의 stderr를 포함한 모든 출력을 다시 버리고 `|| true`로 실패를 무시하므로, boot 당시 wake-lock action 요청 성공/실패를 사후 판정할 수 없습니다.

## 현재 판단

1. boot script SHA는 예상값과 일치하며 롤백/변조 정황 없음
2. 기존 백업 3개 정상 존재
3. Termux:Boot 실행 marker는 `18:05:27 +0900`에 존재
4. boot wake-lock 성공/실패를 기록하는 로그/marker는 현재 없음
5. `termux-wake-lock` wrapper 구현도 예상대로 `am startservice` action 호출 구조
6. 다음 단계는 수정 전에 현재 boot script를 별도 새 백업으로 고정하고 SHA를 검증하는 것
7. 현재 수동 wake lock은 A/B 상태 보존을 위해 해제하지 않음

정확한 Tailscale 주소, 인증정보, 토큰 등 비밀/식별 정보는 기록하지 않습니다.
