# Android 듀얼폰 notify 발신자 조사 로그 — 2026-08-29

Tailscale 전환 후 서버폰의 기존 PocketRisu 알림 발신 경로를 확인하기 위한 INSPECT_ONLY 조사 기록입니다.

## 확인된 사실

- 서버폰의 runit `pocketrisu` 서비스는 `$HOME/PocketRisu`로 이동한 뒤 `node server/node/server.cjs`를 실행한다.
- 실행 중 프로세스에서 `pocketrisu` runit 서비스와 `generic_local_json_bridge.cjs`가 확인되었다.
- runit 서비스 디렉터리 자체에서는 `39120`, `/notify`, `x-pocketrisu-notify-token` 참조가 확인되지 않았다.
- `$HOME/PocketRisu` 전체에서 숫자 `39120`을 포함해 검색하자 `dist/token/**/tokenizer.json`의 토큰 ID 값들이 대량으로 잡혀 검색 노이즈가 발생했다. 이 값들은 notify 포트 참조가 아니므로 발신 코드 증거로 사용하지 않는다.
- notify 관련 파일명 탐색에서 `server/node/server.cjs.bak-notify-relay-20260819-175043` 및 `server/node/server.cjs.bak-notify-relay-20260819-175242` 백업 두 개가 발견되었다.
- 이 백업 파일명은 과거 `server.cjs`에 notify-relay 관련 작업이 있었을 가능성을 시사하지만, 현재 `server.cjs`에 동일한 발신 코드가 존재한다는 증거는 아직 아니다.

## 다음 INSPECT_ONLY 단계

전체 트리 검색을 반복하지 않고 현재 `server/node/server.cjs`와 위 두 백업 파일만 대상으로 파일 크기/해시/동일 여부를 확인하고, `39120`, `/notify`, `x-pocketrisu-notify-token` 등 정확한 문자열 주변의 짧은 문맥만 추출한다. 예상과 다른 결과가 나오면 수정이나 서비스 재시작 없이 원인을 먼저 확인한다.

서버폰에는 Android 알림을 생성하지 않는다. 알림 생성은 메인폰 전용으로 유지한다.
