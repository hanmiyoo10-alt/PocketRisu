# Android 듀얼폰 서버폰 persistent wake lock 전환 — 2026-08-30

## 전환 배경

`Disable child process restrictions=ON` 상태에서도 지속 wake lock 없이 운용하면 일정 시간 뒤 서버폰 Termux/runit 서비스 그룹이 다시 사라지는 현상이 재현됐습니다. 메인폰에서 forwarded core/engine은 HTTP 000이 되었고 direct SSH 8022는 `Connection refused`였습니다. 이후 서버폰 Termux를 열자 `sshd`, `pocketrisu`, local-usage manager/engine, generic bridge가 모두 매우 짧은 age로 동시에 재구성됐고, 런타임 `termux-wake-lock` 획득 후 core/engine은 정상 회복했습니다.

따라서 현재 운영 방향은 **서버폰 wake lock을 안정성 기본값으로 유지하고, 발열·배터리 소모는 서비스의 idle CPU/wakeup/polling/logging을 줄이는 방식으로 최적화**하는 것입니다.

## 현재 boot script INSPECT_ONLY

대상:

`$HOME/.termux/boot/00-pocketrisu-server`

확인 결과:

- mode: `700`
- size: `903 bytes`
- SHA-256: `db48fbc0f310fe028fc79217bca8f10e32c978843a86247ba4b2965d5db87692`
- `sh -n` syntax: PASS
- line 4에서 `termux-wake-lock`
- `release_wakelock()` 함수가 `termux-wake-unlock` 실행
- `trap release_wakelock EXIT HUP INT TERM`
- PocketRisu health 대기 후 line 34에서 `release_wakelock`
- 따라서 현재 boot script는 부팅 초기화 동안만 wake lock을 유지하고 정상/타임아웃 어느 쪽이든 마지막에 해제함

이 구조는 재부팅 직후에는 정상 복구되지만 장기 background survival이 다시 실패한 관찰과 일치합니다.

## 수정 전 백업: PASS

persistent wake lock 전환 전에 원본 boot script를 동일 디렉터리에 백업했습니다.

백업 파일:

`$HOME/.termux/boot/00-pocketrisu-server.bak-persistent-wakelock-20260830-174711`

검증 결과:

- 원본 SHA-256: `db48fbc0f310fe028fc79217bca8f10e32c978843a86247ba4b2965d5db87692`
- 백업 SHA-256: `db48fbc0f310fe028fc79217bca8f10e32c978843a86247ba4b2965d5db87692`
- `BACKUP_VERIFY=PASS`
- 원본과 백업 모두 mode `700`, size `903 bytes`

따라서 수정 전 복구 지점이 확보됐습니다.

## 다음 단계

다음 단계는 한 번에 최소 변경만 수행합니다.

1. 현재 `termux-wake-lock` 획득은 유지
2. `release_wakelock()` 함수와 관련 trap 제거
3. boot script 마지막의 자동 `termux-wake-unlock` 경로 제거
4. 나머지 service start와 PocketRisu health-wait 로직은 보존
5. 수정 직후 `sh -n`, SHA, wakelock 관련 라인, 전체 스크립트 검증
6. 재부팅 전 현재 런타임 wake lock은 유지
7. 이후 재부팅 검증에서 서버폰 Termux를 수동으로 열지 않은 채 메인폰에서 SSH tunnel/core/engine 자동복구 확인

정확한 Tailscale 주소, 계정 정보, 인증 토큰 등 비밀/식별 정보는 기록하지 않습니다.
