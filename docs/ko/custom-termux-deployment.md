# PocketRisu Termux 커스텀 배포 기록

이 문서는 `hanmiyoo10-alt/PocketRisu` fork의 Termux 배포 전용 변경 사항과
upstream 통합 시 반드시 보존해야 하는 계약을 기록한다.

일반 사용자를 위한 upstream Termux 설치 문서와는 별개이며,
서버폰/메인폰으로 분리된 현재 배포 구조를 기준으로 한다.

## 현재 배포 브랜치

- 배포 브랜치: `deploy/termux-pocketrisu`
- 커스텀 배포 snapshot 기준 commit:
  `05929e83bb047171bd94cc510a69b08af287cc57`
- 통합한 upstream v1.11.2 commit:
  `ca09a80746e74e5334145e5e78af47ce423e0eba`
- merge base:
  `000dd8baf383200ecb180490d2c063ebdd11c004`

배포 서버는 움직이는 `origin/main`을 직접 따라가지 않는다.
검증된 fork 배포 브랜치만 실제 서버 업데이트 대상으로 사용한다.

## 기기 역할

### 메인폰

메인폰은 다음 역할을 담당한다.

- Firefox/PocketRisu 실제 사용
- PocketRisu 재현 확인
- SSH core/notify 터널
- Android 알림 수신
- 메인 알림 relay
- Termux:Boot
- simresume

Android 알림은 메인폰에서만 생성한다.

### 서버폰

서버폰은 다음 역할을 담당한다.

- PocketRisu 소스와 DB
- `pocketrisu` 서비스
- local-usage / DevPass / bridge
- 서버 sshd
- 서버 로그
- build 및 테스트
- 검증된 Git 배포 적용

서버폰에서 `termux-notification`을 사용해 Android 알림을 직접 만들지 않는다.

## 알림 relay 계약

서버의 `/api/termux-notify`는 서버폰 자체 Android 알림을 생성하지 않는다.

반드시 다음 구조를 유지한다.

1. PocketRisu 인증은 upstream `checkAuth(req, res)`를 사용한다.
2. loopback 요청 판정 시 forwarded header를 고려해 프록시 우회를 막는다.
3. 서버는 메인폰용 local relay인 `127.0.0.1:39120`으로만 전달한다.
4. relay 인증에는 `X-PocketRisu-Notify-Token`을 사용한다.
5. 서버 코드에 `termux-notification` 실행 로직을 넣지 않는다.

알림 secret 값 자체는 저장소에 기록하지 않는다.

## 저장 및 background persist 계약

커스텀 서버의 background save 구조는 유지한다.

주요 구성:

- `storageOperationQueue`
- `dbMutationGeneration`
- `noteDbMutation()`
- `cancelBackgroundDbPersist()`
- background encode worker
- `server/node/risu-save-background-worker.cjs`

generation guard는 오래 걸린 background encode가 끝난 뒤
더 최신 DB 상태를 덮어쓰는 것을 막는다.

worker에서 disk DB를 재구성할 때는 upstream manifest-aware 함수인
`hydrateDatabaseForDisk()`를 사용한다.

## DB ETag / patch hash 계약

v1.11.2 통합 후에는 upstream의 content-based ETag 모델을 사용한다.

- `computeBufferEtag()`
- `computeDatabaseEtagFromObject()`
- `databasePatchHashCache`

이전 커스텀 opaque revision ETag와 compositional hash cache는 제거했다.

제거된 구형 모델에는 다음이 포함된다.

- `makeDbRevisionEtag`
- `rotateDbEtag`
- `currentDbHashFromCache`
- `updateDbHashCacheFromPatch`
- `initDbHashCache`
- `invalidateDbHashCache`

`/api/read`, patch success, chat guard, snapshot restore는
실제 client-visible 또는 persisted content를 기반으로 ETag를 계산한다.

## snapshot restore 계약

snapshot restore는 이미 `storageOperationQueue` 내부에서 실행된다.

따라서 restore 내부에서는 public `flushPendingDb()`를 다시 호출하지 않고
`flushPendingDbUnlocked()`를 사용한다.

그렇지 않으면 queue가 자기 자신을 기다리는 deadlock이 발생할 수 있다.

restore transaction에서는 database snapshot과 plugin-storage snapshot을
같이 복원한다.

## v1.11.2 conflict resolution

upstream v1.11.2 통합 시 실제 conflict는 다음 5개 파일이었다.

1. `src/lib/Setting/Pages/PluginSettings.svelte`
2. `src/ts/plugins/apiV3/v3.svelte.ts`
3. `src/ts/process/index.svelte.ts`
4. `src/ts/storage/nodeStorage.ts`
5. `server/node/server.cjs`

해결 원칙:

- PluginSettings: upstream UI + 로컬 `pluginUpdater`
- apiV3: upstream 구현 사용
- process: upstream 기반 + 메인폰 relay 시작/완료 알림 유지
- nodeStorage: upstream retry/error/storage 구조 + 로컬 413 경고 유지
- server: upstream storage/plugin/manifest 구조와 로컬 relay/background-save 구조를 병합

## v1.11.2 검증 결과

merge commit 전 다음 검증을 통과했다.

- `pnpm build`: PASS
- `node --check server/node/server.cjs`: PASS
- targeted default tests: 5 files / 51 tests PASS
- targeted server tests: 2 files / 22 tests PASS
- targeted compat tests: 4 files / 18 tests PASS
- 총 targeted tests: 11 files / 91 tests PASS
- unresolved merge conflict: 0
- build 후 unstaged tracked 변경: 0
- 서버 Android notification 구현: 없음

검증 대상에는 다음 핵심 영역이 포함된다.

- patch hash cache
- selective clone
- plugin storage
- DB patch endpoint
- asset manifest migration/store/guard/roundtrip/durability
- nodeStorage retry

## Git 기반 안전 업데이트 설계

upstream portable self-updater는 Git checkout 배포에 재사용하지 않는다.

서버 Git updater는 추후 다음 계약으로 구현한다.

1. remote와 현재 branch를 검증한다.
2. 검증된 fork의 `deploy/termux-pocketrisu`만 따라간다.
3. tracked worktree가 깨끗한지 확인한다.
4. fast-forward 가능한 update만 허용한다.
5. update 적용 전에 현재 commit을 rollback 지점으로 기록한다.
6. 새 commit에서 build를 먼저 수행한다.
7. build 성공 후에만 서비스를 재시작한다.
8. `/api/health`로 기동 상태를 확인한다.
9. health check 실패 시 이전 검증 commit으로 rollback한다.
10. 정상 운영 중인 커스텀 파일을 무차별적으로 지우는
    `git reset --hard` 방식은 사용하지 않는다.

upstream에서 직접 server checkout을 갱신하는 것이 아니라

`upstream -> 로컬 통합/테스트 -> fork 배포 브랜치 -> 서버 Git updater`

순서를 따른다.

## 저장소에 넣지 않는 runtime 항목

다음은 runtime/local 데이터이므로 commit 대상이 아니다.

- relay/local-usage secret 값
- runtime snapshot
- 임시 backup
- update-ready/run 상태
- 로컬 테스트용 untracked 파일

현재 `generic_mock_bridge.cjs`는 의도적으로 untracked 상태를 유지한다.

## Git 배포 updater 구현

Termux Git checkout 전용 updater는 다음 파일로 별도 구현한다.

- `scripts/termux/update-git-deploy.sh`

upstream의 portable updater인 `update.sh`와 `scripts/updater.cjs`는
Git checkout 배포에 재사용하거나 수정하지 않는다.

### 실행 모드

`--check`는 다음 작업만 수행한다.

- 현재 branch / remote / tracking 계약 검증
- tracked worktree clean 여부 확인
- 허용된 untracked 파일 확인
- `fork/deploy/termux-pocketrisu` fetch
- 현재 HEAD와 원격 target의 fast-forward 관계 확인
- update 가능 여부 보고
- 현재 `/api/health` 확인

`--check`는 HEAD, `dist/`, `node_modules/`, 서비스 상태를 변경하지 않는다.

`--apply`는 updater 자체가 현재 HEAD에 tracked/committed된 경우에만 허용한다.

### update 적용 순서

update가 존재할 경우 다음 순서를 사용한다.

1. 검증된 `fork/deploy/termux-pocketrisu` target을 fetch한다.
2. 현재 HEAD가 target의 ancestor인지 확인해 fast-forward update만 허용한다.
3. detached 임시 Git worktree에서 target을 checkout한다.
4. 임시 worktree에서 `pnpm install --frozen-lockfile`을 수행한다.
5. 임시 worktree에서 `pnpm build`와
   `node --check server/node/server.cjs`를 수행한다.
6. candidate build가 tracked 파일을 변경하지 않았는지 확인한다.
7. candidate `dist/`를 runtime state 영역에 staging한다.
8. live 전환 직전에 branch, HEAD, tracked tree, untracked set,
   fetched target, 실제 remote tip을 다시 검증한다.
9. 현재 서비스가 여전히 `/api/health` ready인지 확인한다.
10. 현재 `dist/`와 rollback commit을 기록한다.
11. PocketRisu 서비스를 정지한다.
12. 실제 checkout에는 `git merge --ff-only`로만 target을 적용한다.
13. warmed pnpm store를 사용해
    `pnpm install --offline --frozen-lockfile`을 수행한다.
14. 미리 검증한 candidate `dist/`를 설치한다.
15. 서버 syntax와 tracked/untracked 계약을 다시 확인한다.
16. 서비스를 시작하고 `/api/health`가 ready가 될 때까지 확인한다.

현재 서비스가 서빙 중인 `dist/`에서 직접 candidate build를 수행하지 않는다.
candidate build는 반드시 별도 temporary worktree에서 먼저 끝낸다.

### rollback 계약

live 전환 이후 실패하면 이전 commit과 이전 `dist/`로 자동 rollback을 시도한다.

rollback은 다음 원칙을 따른다.

- `git reset --hard`를 사용하지 않는다.
- branch ref는 예상한 target에서만 이전 commit으로 되돌린다.
- tracked 파일은 `git restore --source=<old>`로 복원한다.
- 이전 `dist/` backup을 복원한다.
- 이전 commit 기준 dependency를 offline frozen install로 복구한다.
- 서비스를 다시 시작하고 `/api/health`를 확인한다.
- rollback이 완전히 성공한 경우에만 pending target state를 제거한다.
- rollback이 불완전하면 runtime recovery directory와 pending state를
  삭제하지 않고 보존한다.

runtime state/cache는 저장소 밖의 다음 계열 경로를 사용한다.

- `${XDG_STATE_HOME:-$HOME/.local/state}/pocketrisu-git-deploy`
- `${XDG_CACHE_HOME:-$HOME/.cache}/pocketrisu-git-deploy`

### updater 안전성 검증

구현 후 다음 검증을 수행했다.

- shell syntax: PASS
- `git reset --hard` / `git clean` 사용 없음
- 현재 배포 commit에서 `--check`: PASS
- `--check` 후 HEAD와 live service가 변경되지 않음
- uncommitted updater에서 `--apply` 차단: PASS
- 차단 시 fetch/build/service stop까지 진행하지 않음
- 차단 전후 서비스 PID 동일 및 `/api/health` ready
- 격리 sandbox에서 committed updater의 non-fast-forward 거부: PASS
- non-fast-forward 거부 시 candidate build/service stop까지 진행하지 않음
- sandbox lock / pending target 잔여 없음
- sandbox 테스트 후 실제 서버폰 HEAD, PID, health 변경 없음
- committed updater의 update 없는 `--apply` no-op: PASS
- no-op `--apply`에서 candidate build / dependency install / service stop /
  fast-forward 경로에 진입하지 않음
- no-op `--apply` 전후 서비스 PID 동일 및 `/api/health` ready
- no-op 완료 후 updater lock / pending target state 잔여 없음

아직 실제 새 target에 대한 live `--apply` 성공/rollback 테스트는 수행하지 않았다.
첫 실제 update에서는 별도 검증된 fork commit을 대상으로 단계적으로 확인한다.

## 배포 브랜치 보호 정책

fork의 Git 배포 기준 브랜치인
`deploy/termux-pocketrisu`에는 GitHub branch protection을 적용한다.

현재 보호 계약은 다음과 같다.

- 관리자에게도 branch protection을 적용한다.
- force push를 허용하지 않는다.
- branch 삭제를 허용하지 않는다.
- required status checks는 강제하지 않는다.
- pull request review는 강제하지 않는다.
- 일반 fast-forward push는 계속 허용한다.

이 정책의 목적은 Git-safe updater가 신뢰하는 배포 브랜치의 이력이
강제 push로 재작성되거나 branch 자체가 실수로 삭제되는 것을 막으면서,
검증된 배포 commit과 문서 commit의 일반 push 흐름은 유지하는 것이다.

GitHub API로 적용 후 다음 값을 확인했다.

- `enforce_admins=true`
- `allow_force_pushes=false`
- `allow_deletions=false`
- `required_status_checks=null`
- `required_pull_request_reviews=null`

적용 후 `git push --dry-run`으로 일반 push 경로가 유지되는 것도 확인했다.

GitHub 화면에서 보이는 default `main` branch의 보호 경고는
이 별도 배포 브랜치 보호 정책과는 구분한다.

## v1.12.0 통합 후보 검증

PocketRisu upstream v1.12.0은 다음 기준으로 통합 후보를 만들었다.

- 이전 upstream 기준: `ca09a80746e74e5334145e5e78af47ce423e0eba` (v1.11.2)
- v1.12.0 upstream: `b315d898abd543fffaf5346d8eb3246b20da92cd`
- upstream 증가분: 15 commits
- upstream 변경 파일: 70 files
- package version: `1.12.0`

live checkout을 직접 merge하지 않고
`$HOME/.cache/pocketrisu-v1.12-merge-candidate` detached worktree에서
통합 후보를 만들었다.

merge 과정의 content conflict는 다음 한 파일뿐이었다.

- `src/ts/process/index.svelte.ts`

해당 conflict는 양쪽 기능을 모두 보존하는 방식으로 해결했다.

- v1.12.0의 `internalAbort` / `registerAbort()` generation abort 계약 보존
- Termux 배포 커스텀의 `requestStartedAt` / `responseModelLabel`
  notification relay 계약 보존
- 기존 upstream의 `responseStartedAt` 잔재는 제거
- recursive `sendChat()`에도 request 시작 시각과 model label을 계속 전달

자동 merge된 주요 custom hotspot도 별도로 검사했다.

- `server/node/server.cjs`
- `src/ts/storage/nodeStorage.ts`

다음 커스텀 계약이 후보에 유지되는 것을 확인했다.

- `/api/termux-notify`
- relay 대상 `127.0.0.1:39120/notify`
- `X-PocketRisu-Notify-Token`
- 서버폰에서 직접 `termux-notification`을 실행하지 않음
- background DB persist queue / generation / worker launch 계약
- snapshot restore 전 pending DB flush
- plugin snapshot atomic restore
- content-based DB ETag
- patch hash cache
- plugin-storage index/all API

후보 검증 결과는 다음과 같다.

- server Node syntax: PASS
- `pnpm install --frozen-lockfile`: PASS
- `NODE_OPTIONS="--max-old-space-size=2048" pnpm build`: PASS
- `dist/index.html`: 확인
- targeted test suite: 7 files / 180 tests PASS
- merge conflict marker: 없음
- live checkout과 live 서비스는 후보 검증 동안 변경하지 않음

### Termux 대형 lorebook regression test

`src/ts/storage/risuSavePatcher.test.ts`의

`character with a huge shifted lorebook does not trip the spread limit`

테스트는 30,000개 lorebook entry를 사용하는 병적 입력 회귀 테스트다.

서버폰 Termux 환경에서는 Vitest 기본 timeout 5초보다 오래 걸려
기본 설정에서 timeout이 발생했다.

이를 merge 회귀와 구분하기 위해 다음 대조를 수행했다.

- v1.11.2 live baseline도 동일 테스트가 기본 5초 timeout으로 실패
- v1.12.0은 `src/ts/storage/risuSavePatcher.ts` 구현을 변경하지 않음
- v1.12 merge candidate의 해당 구현도 live baseline과 동일
- candidate에서 해당 테스트에 30초 timeout을 적용하면 assertion PASS
- targeted suite 전체를 `--testTimeout=30000`으로 실행해 180/180 PASS

따라서 이 결과는 v1.12 merge 회귀가 아니라
서버폰 Termux 환경에서 병적 30k 입력 테스트가 기본 5초를 초과하는
테스트 실행시간 특성으로 취급한다.

저장소의 테스트 timeout 자체는 이 사유로 변경하지 않는다.

### upstream whitespace

v1.12.0 upstream의 `src/lib/SideBars/Sidebar.svelte`에는
12개의 trailing-whitespace 항목이 이미 포함되어 있다.

merge candidate의 해당 파일은 pure v1.12.0 upstream과 동일하며,
우리 custom delta 자체의 `diff --check`는 PASS했다.

따라서 upstream formatting을 이번 통합에서 별도로 정리하지 않고
upstream 원본을 그대로 유지한다.

## Provider Manager 404 운영 교훈

v1.11.2 live 운영 중 Provider Manager 진입 시
`pluginStorageIndex failed with HTTP 404`가 발생한 적이 있다.

당시 disk의 `server/node/server.cjs`에는
`/api/plugin-storage/index` route가 존재했지만,
장시간 실행 중이던 Node 프로세스는 이전 server 코드를 로드한 상태였다.

서비스 재시작 후 다음 결과를 확인했다.

- `/api/plugin-storage/index` unauthenticated probe: HTTP 400
- response: `No auth header`
- 존재하지 않는 control route: HTTP 404
- `/api/health`: ready
- 메인폰 Provider Manager: 정상 동작

즉 404 원인은 SSH tunnel이나 메인폰 경로가 아니라
서버 코드 갱신 후 live Node 프로세스가 재시작되지 않았던 운영 상태였다.

서버 코드 또는 server build를 직접 갱신한 경우에는
파일 변경만으로 live 적용됐다고 간주하지 않는다.

반드시 PocketRisu 서비스를 재시작하고 `/api/health`가 ready가 될 때까지
재시도 방식으로 확인한 뒤 메인폰 동작을 검증한다.

이 서버폰에서는 재시작 직후 4초 시점에는 아직 health 연결이 실패했고,
조금 더 기다린 뒤 정상 ready가 되었으므로
고정 4초 sleep만을 readiness 판정 기준으로 사용하지 않는다.

현재 v1.12.0은 이 문서 시점에서 아직 live 배포 완료 상태가 아니다.
검증된 merge candidate를 commit/push한 뒤 Git 배포 updater의
실제 새-target `--apply` 경로로 별도 배포 검증한다.
