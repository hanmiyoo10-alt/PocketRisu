# PocketRisu 자동 업데이트 사전점검 — 2026-09-04

## 목적

서버폰에서 실행 중인 PocketRisu에 자동 업데이트를 도입하기 전, 현재 서비스 실행 구조와 Git 작업트리 상태를 점검했다.

## 현재 실행 구조

- 서비스: Termux runit `pocketrisu`
- 실행 디렉터리: `$HOME/PocketRisu`
- 실행 명령: `node server/node/server.cjs`
- 서비스 run 파일은 `$HOME/PocketRisu`로 이동한 뒤 Node 서버를 직접 실행한다.
- 점검 시점 서비스는 정상 실행 중이었다.

## Git 상태

- 저장소: `$HOME/PocketRisu`
- 브랜치: `feat/restore-last-active-chat`
- 추적 원격: `fork/feat/restore-last-active-chat`
- 점검 시점 HEAD: `000dd8baf383200ecb180490d2c063ebdd11c004`
- upstream 공식 원격: `PocketRisu/PocketRisu`
- fork 원격: `hanmiyoo10-alt/PocketRisu`

## 중요 관찰

현재 작업트리는 clean 상태가 아니다.

여러 tracked 파일에 로컬 개조가 존재하며, 별도 bridge / local patch / runtime 관련 파일과 백업 파일도 함께 존재한다. 민감정보가 들어갈 수 있는 로컬 전용 파일은 이 문서에 경로나 값을 기록하지 않는다.

따라서 다음과 같은 단순 자동 업데이트 방식은 안전하지 않다.

```text
git pull
service restart
```

또한 아래와 같은 강제 동기화 방식은 현재 로컬 개조를 손실시킬 수 있으므로 자동화 대상으로 사용하면 안 된다.

```text
git reset --hard <remote>
git clean -fd
```

## 초기 설계 판단

현재 구조에는 실행 중인 dirty working tree를 직접 업데이트하는 방식보다 **세대 교체식 업데이트**가 더 적합하다.

권장 흐름:

1. 현재 실행 세대와 데이터 경로를 그대로 유지한다.
2. 새 버전을 별도 디렉터리 또는 staging worktree에 준비한다.
3. 공식 upstream / fork의 목표 커밋을 명시적으로 선택한다.
4. 필요한 로컬 개조를 재적용한다.
5. 의존성 설치 및 빌드 검증을 수행한다.
6. 별도 포트 또는 비활성 상태에서 서버 기동 검증을 수행한다.
7. health check가 통과한 경우에만 runit 서비스의 실행 세대를 전환한다.
8. 실패 시 기존 세대를 계속 사용하거나 즉시 롤백한다.

## 자동 업데이트에 반드시 포함할 보호장치

- dirty working tree 직접 `pull` 금지
- 업데이트 전 현재 commit / branch / 서비스 상태 기록
- 코드 세대와 사용자 데이터/DB 분리
- update staging 디렉터리 사용
- build 실패 시 전환 금지
- `/api/health` 확인 후에만 새 세대 채택
- 서비스 전환 실패 시 이전 세대로 롤백
- 업데이트 로그 보존
- 로컬 개조 적용 실패 시 자동 업데이트 중단
- 비밀값, 토큰, 개인 데이터는 Git 기록 대상에서 제외

## 검사 명령 관련 메모

초기 광범위 `grep -R` 검사는 runit 서비스 디렉터리의 `supervise` 계열 특수 파일을 재귀 탐색하면서 멈출 수 있었다. 사용자가 수동으로 중단했으며, 파일 변경이나 서비스 재시작은 발생하지 않았다.

향후 점검에서는 다음 원칙을 사용한다.

- Git 추적 파일: `git grep`
- Termux 서비스/부트 디렉터리: `find -type f`로 일반 파일만 선별
- `supervise` 디렉터리와 특수 파일 제외

## 상태

현재 단계는 **INSPECT_ONLY 완료**다.

아직 자동 업데이트 스크립트 작성, Git 동기화, 서비스 변경, 재시작은 수행하지 않았다.
