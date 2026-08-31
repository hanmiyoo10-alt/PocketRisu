# Android 듀얼폰 SSH transport timeout 타임라인 정정 (2026-09-01)

## 배경

장기 wake-lock 재발 분석 중 메인폰 `pocketrisu-ssh-tunnel` 로그를 검사했습니다. 실제 로그는 `$HOME/.local/state/pocketrisu-ssh-tunnel/current`에 있으며 `svlogd -tt` 형식의 시각은 UTC로 기록됩니다.

## 이번 검사 결과

세션 종료 원인 검색용 첫 번째 `awk` 블록은 문법 오류로 실패했습니다. 따라서 그 블록으로는 세션 종료 원인을 판정하지 않습니다.

두 번째 블록은 성공했고, 이전에 `2026-08-31_17:07:56 UTC` (2026-09-01 02:07:56 KST)를 최초 SSH transport timeout으로 본 해석이 틀렸음을 확인했습니다.

그 직전 문맥에는 이미 다음과 같은 새 SSH 연결 timeout이 존재합니다.

- `2026-08-31_13:07:08 UTC` = `2026-08-31 22:07:08 KST`
- 이후 약 11초 간격으로 `ssh: connect to host [PRIVATE_IP] port 8022: Connection timed out` 반복
- 적어도 `13:12:18 UTC`까지 반복

또한 `2026-08-31_17:07:45 UTC` = `2026-09-01 02:07:45 KST`에는 `Timeout, server [PRIVATE_IP] not responding.` 메시지가 있고, 직후 새 연결 timeout이 이어집니다.

## 정정

따라서 현재 확정할 수 있는 것은 다음입니다.

- SSH transport timeout은 최소 `2026-08-31 22:07 KST` 무렵에는 이미 발생하고 있었음
- `2026-09-01 02:07 KST`는 최초 timeout이 아니라 더 뒤의 별도 timeout 구간임
- 정확한 최초 transport timeout 시각은 아직 확정하지 않음
- 세션 종료 원인 검색은 첫 `awk` 문법 오류 때문에 미완료

기존의 `2026-09-01 02:07:56 KST`를 최초 transport timeout으로 본 기록은 이 문서로 정정합니다.

정확한 private endpoint/IP는 기록하지 않습니다.
