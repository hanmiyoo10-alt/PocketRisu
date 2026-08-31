# 서버폰 사망 전 로그 형태 점검 (2026-09-01)

## 관측 시각
- 서버폰 로컬 시각: 2026-09-01 03:42 KST

## sshd 로그 구조
- runit logger 경로: `$PREFIX/var/log/sv/sshd`
- `svlogd -tt` 사용.
- 최신 파일 목록에서 2026-09-01 02:11:57 KST에 닫힌 rotated 파일이 존재함.
- 다음 `current`는 2026-09-01 03:17:54 KST에 생성됨.
- 02:21~02:24 KST에 해당하는 timestamp 검색에서는 매치가 없었음.

주의: sshd는 이벤트가 없으면 로그를 남기지 않을 수 있으므로 02:22 근처 timestamp 부재만으로 정상 종료/비정상 종료 여부를 판정할 수 없음.

## PocketRisu 서비스 로그
- 로그 경로: `$HOME/pocketrisu-service.log`
- runit log service가 아니라 서비스 run 스크립트에서 직접 append.
- 로그 tail에 `Session boot registered`, `Write lock taken over by a freshly-booted session`, `HTTP server is running`이 여러 번 반복되어 서비스 재기동 흔적 자체는 존재함.
- 일부 줄은 timestamp가 없어 현재 tail만으로 02:12 및 02:22 경계에 직접 대응시키면 안 됨.

## 현재 해석
- 메인폰 두 SSH 터널 로그에서는 02:11:46 이후 약 11분간 실제 재접속 구간이 관측되고 02:22:51~58 KST에 다시 refusal이 시작됨.
- 서버 sshd 로그에는 02:22 시각의 명시적 종료 메시지가 아직 확인되지 않음.
- 다음 단계는 02:11:57에 닫힌 최신 pre-03:17 sshd rotated 파일 전체 내용과 PocketRisu 마지막 재기동 블록의 경계를 좁혀 확인하는 것.

## 안전 원칙
- INSPECT_ONLY 유지.
- wake-lock 변경 없음.
- 서비스 수동 재시작 없음.
- private endpoint/token은 기록하지 않음.
