# Android 듀얼폰 서버폰 persistent wake lock 복구 — 2026-08-30

## 배경

`Disable child process restrictions=ON` + 지속 wake lock 없음 조건에서 서버폰 재부팅 직후에는 원격 경로가 잠시 정상 복구됐지만, 시간이 지나 다시 메인폰 tunnel 재시작 루프, forwarded core/engine HTTP 000, direct SSH 8022 `Connection refused`가 재현됐습니다.

서버폰 Termux를 직접 열자 `runsvdir`과 `sshd`, `pocketrisu`, local-usage manager/engine, bridge가 모두 짧은 age로 동시에 재구성됐고, `termux-wake-lock` 획득 후에는 서비스 PID를 유지한 채 core/engine이 정상 회복했습니다.

따라서 운영 방향을 `wake lock 제거`에서 `wake lock 유지 + idle CPU/wakeup/로그/폴링 최적화`로 전환합니다.

## 수정 전 기준점

현재 부팅 스크립트:

- 경로: `$HOME/.termux/boot/00-pocketrisu-server`
- 기존 SHA-256: `db48fbc0f310fe028fc79217bca8f10e32c978843a86247ba4b2965d5db87692`
- 문법 검사: `sh -n` rc 0
- 기존 구조: 부팅 시작 시 `termux-wake-lock`, core health 준비 또는 약 90초 timeout 후 `termux-wake-unlock`

즉 기존 스크립트는 부팅 과정에서만 wake lock을 유지하고 정상/타임아웃 이후에는 자동 해제하는 구조였습니다.

## 백업

수정 전 다음 백업을 생성했습니다.

- `$HOME/.termux/boot/00-pocketrisu-server.bak-persistent-wakelock-20260830-174711`
- 원본/백업 SHA-256 모두 `db48fbc0f310fe028fc79217bca8f10e32c978843a86247ba4b2965d5db87692`
- `BACKUP_VERIFY=PASS`
- 권한은 원본/백업 모두 `-rwx------`

## persistent wake lock 패치

SHA guard로 원본이 예상 SHA와 일치하는지 확인한 뒤 최소 수정했습니다.

변경 내용:

- `termux-wake-lock` 유지
- `release_wakelock()` 함수 제거
- `termux-wake-unlock` 제거
- wake lock 해제용 `trap` 제거
- core health 대기/서비스 시작 로직은 그대로 유지

검증 결과:

- `SHA_GUARD=PASS`
- 임시 파일 `sh -n`: rc 0
- 최종 파일 `sh -n`: rc 0
- wake 관련 grep 결과에는 `termux-wake-lock` 한 줄만 남음
- 새 SHA-256: `f54c9bb1b68a6d41a05ff257f5adfdf71a6c40b069f8ccd0ef3a0e10c9f09004`
- 수정 직후 재부팅/서비스 재시작은 수행하지 않음

현재 스크립트의 의미는 **다음 부팅부터 서버폰이 wake lock을 획득한 뒤 자동 해제하지 않고 계속 유지하는 운영 모드**입니다.

## 다음 검증 순서

1. 현재 실행 중인 서비스 PID/health가 패치 전후 동일하게 유지되는지 INSPECT_ONLY 확인
2. 서버폰 core/engine이 계속 HTTP 200인지 확인
3. 그 다음 별도 단계에서 서버폰 재부팅 후 Termux:Boot가 persistent wake lock 구조로 자동 복구되는지 검증
4. 자동복구가 PASS하면 장시간 실사용 soak
5. 안정성을 유지한 채 PocketRisu/bridge/SSH/reconnect/logging의 idle CPU/wakeup을 줄여 발열·배터리 소모 최적화

정확한 Tailscale 주소, 인증 토큰, 계정 정보는 문서에 기록하지 않습니다.
