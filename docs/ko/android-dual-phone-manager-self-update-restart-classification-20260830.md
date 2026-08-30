# Android 듀얼폰 manager 단독 재시작 분류 — self-update/runit 정상 재기동 (2026-08-30)

## 배경

wake-lock 계측/2회 요청 boot script가 적용된 controlled reboot에서 약 100분 soak는 whole Termux/runit/sshd/backend 생존 기준 PASS였습니다.

다만 `local-usage-runtime-manager`만 초기 PID `12434`에서 `6385`로 변경되어 별도 원인 확인을 진행했습니다. sshd, PocketRisu, engine, bridge는 같은 PID로 계속 생존했고 core/engine HTTP 200 및 direct SSH도 정상이라 whole Termux/runit 소실과는 분리된 현상입니다.

## 앞선 코드 inspection

현재 manager source SHA256:

- `bbcbb6b4ae2dfe6a27ec4282da8147d3e5a693586a1648211d90a107713f0801`

`bridge-manager.cjs`의 `scheduleRestart()`는 `LUD_MANAGER_RESTART_MODE=runit`에서 150ms 뒤 `process.exit(0)`으로 manager 자신을 정상 종료합니다. runit이 즉시 새 프로세스를 올리는 구조입니다.

명시적인 정상 self-restart 진입점은 다음과 같습니다.

- `POST /restart`
- `POST /sync`에서 실제 self-update가 적용되어 `restartRequired=true`인 경우
- `POST /rollback`에서 rollback 성공으로 `restartRequired=true`인 경우

manager service는 별도 logger가 없고 현재 PID의 fd0/fd1/fd2가 모두 `/dev/null`이므로 당시 stdout/stderr는 복원할 수 없습니다.

## 파일 타임라인 inspection

### 현재 manager

`bridge-manager.cjs`:

- SHA256: `bbcbb6b4ae2dfe6a27ec4282da8147d3e5a693586a1648211d90a107713f0801`
- size: `41006`
- mtime: `2026-08-30 22:25:05.693384340 +0900`
- ctime: `2026-08-30 22:25:06.017384340 +0900`

### 자동 backup

`bridge-manager.cjs.bak`:

- SHA256: `5af01c7106c7da20f00faef8ac471acb0ab7bdb27e79433f4444c10a70e55e49`
- size: `41006`
- mtime/ctime: `2026-08-30 22:25:06.017384340 +0900`

이 backup SHA `5af01c...`는 이번 self-update 전 manager source로 기존 검증에서 확인했던 값입니다.

### 기존 수동 backup들

- `bridge-manager.cjs.bak-cli-version-20260830-032103`: SHA `35bf1562...`, 03:21 계열
- `bridge-manager.cjs.bak-engine-cli-env-permanent-20260830-035319`: SHA `fd42a554...`, 03:53 계열

따라서 22:25에 갱신된 `.bak`은 기존 수동 backup이 아니라 manager 자체 self-update 경로의 `BACKUP_FILE`과 일치합니다.

## runit supervise 타임라인

다음 항목이 모두 `2026-08-30 22:25:06.201384340 +0900`에 갱신되었습니다.

- `local-usage-runtime-manager/supervise/`
- `supervise/pid`
- `supervise/stat`
- `supervise/status`

inspection 시 manager는 PID `6385`로 정상 run 중이었습니다.

## 코드와 파일 타임라인의 대응

`syncSelf()` 코드의 성공적인 self-update 순서는 다음과 같습니다.

1. 새 manager artifact를 다운로드하고 SHA/syntax 검증
2. 기존 `BACKUP_FILE`이 있으면 제거
3. 현재 `bridge-manager.cjs`를 `.bak`으로 복사
4. 새 next 파일을 current path로 rename
5. `restartRequired=true` 반환
6. `/sync` 응답 완료 뒤 `scheduleRestart()` 호출
7. runit 모드에서 `process.exit(0)`
8. runit이 manager를 새 PID로 재기동

관측된 타임라인은 이 흐름과 일치합니다.

- 새 current 파일 mtime: `22:25:05.693`
- old source가 저장된 `.bak`: `22:25:06.017`
- current ctime: `22:25:06.017`
- runit supervise 갱신: `22:25:06.201`

특히 current mtime이 backup보다 약간 이른 것은 새 artifact(next file)의 기존 mtime이 rename 뒤 유지되고, `.bak` 복사/rename에 따른 inode metadata 변경 시각이 뒤따르는 흐름과 모순되지 않습니다.

## 최종 분류

이번 `local-usage-runtime-manager` PID `12434 → 6385` 변경은 **성공적인 manager self-update `/sync` 이후 의도적인 `process.exit(0)` 및 runit 재기동으로 분류**합니다.

근거:

- current source SHA가 기존 source SHA에서 변경됨
- `.bak` SHA가 정확히 기존 source SHA와 일치함
- current와 `.bak`이 같은 22:25 초 단위에 갱신됨
- runit supervise metadata가 직후 같은 초에 갱신됨
- 코드가 successful `/sync`에서 이 파일 교체 후 `restartRequired=true` → `scheduleRestart()` → runit 모드 `process.exit(0)` 경로를 명시함
- manager 외 sshd/PocketRisu/engine/bridge는 계속 생존하여 whole Termux/runit 소실 패턴과 다름

따라서 이 manager 재시작은 wake-lock soak 실패 증거로 보지 않습니다.

## 추가 안정성 체크포인트

이후 동일한 file-timeline INSPECT_ONLY 명령을 다시 실행했을 때 current/backup SHA와 22:25 metadata는 그대로였고, manager는 동일 PID `6385`로 age `9110s`까지 계속 `run` 상태였습니다. 즉 22:25 self-update/runit 재기동 뒤에도 manager 자체가 장시간 안정적으로 유지되고 있습니다.

사용자 결정에 따라 Discord/Web Push/GPT 응답 알림 연동 작업은 이 시점에서 보류하고, 우선 wake-lock boot 장기 생존 검증을 계속합니다.

정확한 인증정보, 토큰, private endpoint는 기록하지 않습니다.
