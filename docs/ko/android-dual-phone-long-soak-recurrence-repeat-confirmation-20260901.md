# Android 듀얼폰 장기 soak 이후 전체 서버 경로 소실 — 반복 확인 (2026-09-01)

## 배경

앞선 `2026-09-01 02:30:12 +0900` 검사에서 다음이 확인되었습니다.

- main SSH tunnel / notify tunnel이 초 단위 재시작 루프
- forwarded PocketRisu core HTTP `000`
- forwarded local-usage engine HTTP `000`
- direct SSH 8022: `Connection refused`

이는 메인 터널 자체 장애가 아니라 서버폰의 Termux/runit/sshd 쪽 전체 소실 재발로 분류되었습니다.

## 2분 뒤 반복 확인

`2026-09-01 02:32:29 +0900`에 동일 INSPECT_ONLY 검사를 다시 수행했습니다.

### main tunnels

- `pocketrisu-ssh-tunnel`: PID `5894`, age `0s`
- `pocketrisu-notify-tunnel`: PID `5665`, age `1s`

앞선 02:30 검사 당시 tunnel PID(`3124`, `3006`)와 이미 달라졌고 age도 다시 0~1초이므로, 두 tunnel은 계속 재시작 루프 중입니다.

### forwarded health

- core: `000`
- engine: `000`

### direct SSH

- `ssh_rc=255`
- `CLASS=CONNECTION_REFUSED`
- port 8022 connection refused

## 해석

이번 반복 확인으로 장애가 순간적인 일시 끊김이 아니라 적어도 수 분 이상 지속 중임이 확인되었습니다.

특히 direct SSH가 timeout이나 route/network 오류가 아니라 `Connection refused`이므로 원격 네트워크 경로 자체는 도달 가능하지만 서버폰의 sshd가 listening 상태가 아닌 패턴과 일치합니다.

따라서 현재 분류는 유지합니다.

- main tunnel 자체 문제: 아님
- 네트워크 route 단절: 아님
- local-usage manager/engine 단독 재기동: 아님
- 서버폰 Termux/runit/sshd 전체 소실 재발: 반복 확인으로 강화

서버폰 Termux UI는 아직 열지 않았고, 이번 단계는 INSPECT_ONLY입니다.

다음 단계는 main tunnel의 runit 로그에서 최초 `Connection refused` 시각을 좁혀 실제 서버 소실 시점을 추정하는 것입니다.

정확한 private endpoint 주소와 인증정보는 기록하지 않습니다.
