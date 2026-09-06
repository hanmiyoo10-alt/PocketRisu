# PocketRisu 개조 작업 기록 정책

이 문서는 `hanmiyoo10-alt/PocketRisu` fork에서 PocketRisu 개조 작업을 진행할 때 지켜야 하는 기록/반영 원칙을 정리한다.

## 자동 기록 원칙

PocketRisu 개조와 관련해 코드, 배포 방식, 진단 결과, 운영 계약, 테스트 결과가 바뀌면 별도 요청을 기다리지 않고 저장소 문서에 정리한다.

변경이 검증된 뒤에는 다음을 한 작업 단위로 처리한다.

1. 관련 문서를 갱신한다.
2. 실제 변경 파일만 선택해 stage한다.
3. 검증 결과와 목적이 드러나는 commit을 만든다.
4. `hanmiyoo10-alt/PocketRisu`의 `deploy/termux-pocketrisu` 브랜치로 일반 fast-forward push한다.
5. remote tip이 새 commit과 일치하는지 확인한다.

따라서 PocketRisu 개조 작업의 완료 기준은 로컬 수정만이 아니라 **문서화 + commit + fork push + remote 검증**까지다.

## 예외

다음 항목은 자동 commit/push 대상에 포함하지 않는다.

- secret, token, 인증 정보
- runtime DB/state/cache/backup
- 의도적으로 로컬에만 두는 instrumentation
- 의도적으로 untracked 상태를 유지하는 테스트/bridge 파일
- 사용자가 명시적으로 저장소에 넣지 말라고 한 항목

현재 운영 예외에는 다음이 포함된다.

- `.local_usage_bridge_token`
- `src/ts/log-capture.ts`의 로컬 instrumentation 변경
- `generic_mock_bridge.cjs`

이 예외 항목은 다른 변경을 commit할 때도 실수로 stage하지 않는다.

## 안전 절차

가능하면 `INSPECT_ONLY -> backup -> modify -> verify -> document -> commit -> push -> remote verify` 순서를 따른다.

예상과 다른 출력이 나오면 덮어쓰거나 범위를 넓히지 않고 원인을 먼저 확인한다. 서버폰/메인폰 역할을 분리하고, 서버폰에서는 Android 알림을 직접 만들지 않는다.
