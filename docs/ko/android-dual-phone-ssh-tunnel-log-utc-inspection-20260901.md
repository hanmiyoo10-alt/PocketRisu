# Android 듀얼폰 SSH tunnel 실제 로그/UTC 시각 inspection (2026-09-01)

## 배경

2026-09-01 새 장기 재발 케이스에서 메인폰의 `pocketrisu-ssh-tunnel` logger가 살아 있는데 기존 추정 로그 경로에서는 파일을 찾지 못했습니다.

서비스 `log/run` inspection 결과 실제 로그 경로는 다음과 같았습니다.

- `$HOME/.local/state/pocketrisu-ssh-tunnel`
- logger: `svlogd -tt`

logger 자체는 장시간 동일 PID로 정상 run 중이었습니다.

## 실제 로그 디렉터리 inspection

실제 로그 디렉터리에는 다음 항목이 있었습니다.

- `current` 약 898 KB, inspection 시점까지 계속 증가
- 과거 rotated 로그 파일들
- `boot-start.log`, `boot.log`
- 기타 과거 network watch 로그

따라서 앞선 `LOG_DIR_NOT_FOUND` 결과는 logger 부재가 아니라 잘못된 경로 추정 때문이었습니다.

## 시각 형식

`svlogd -tt`가 기록한 현재 로그의 시각은 메인폰 KST 표시와 9시간 차이가 나며 UTC 기준으로 해석해야 현재 사건 시각과 일치합니다.

예:

- 로그 `2026-08-31_17:41:11` ≈ KST `2026-09-01 02:41:11`

이는 현재 메인폰 검사 시각 `2026-09-01 02:41` 및 direct SSH `Connection refused` 상태와 일치합니다.

## 로그 내용

`current` 마지막 구간에서는 약 1초 간격으로 다음 오류가 계속 반복되었습니다.

- `ssh: connect to host [PRIVATE_IP] port 8022: Connection refused`

정확한 private endpoint는 기록하지 않습니다.

과거 rotated/current의 초반에는 8월 19일/27일 계열의 이전 `Network is unreachable` / `Connection refused` 기록도 존재하므로, 파일의 첫 failure line을 이번 사건의 최초 실패 시각으로 사용하면 안 됩니다.

## 현재 해석

- 메인 tunnel logger는 정상 생존
- 현재 tunnel 프로세스는 서버 8022 refusal 때문에 반복 재시작
- `Connection refused`는 현재 사건에서도 지속 중
- 이번 사건의 최초 실패 시각을 찾으려면 마지막 정상 확인 시점 이후 첫 refusal만 좁혀야 함
- 마지막 정상 확인: `2026-08-31 03:49:52 +0900`
- 이를 UTC 로그 기준으로 변환하면 약 `2026-08-30_18:49:52` 이후 구간을 검사해야 함

다음 단계는 `current`에서 위 기준 이후의 최초 `Connection refused` line을 INSPECT_ONLY로 찾는 것입니다.

서버폰 Termux는 이 단계까지 열지 않았습니다.
