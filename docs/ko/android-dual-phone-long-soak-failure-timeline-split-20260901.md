# Android 듀얼폰 장기 soak 재발 — forwarded target 실패와 sshd 실패 분리 (2026-09-01)

## 배경

6시간 32분 시점까지 whole backend 생존 PASS를 확인한 뒤, 다음날 메인폰에서 다시 연결 불가가 확인되었습니다.

- 메인 SSH/notify tunnel은 초단위 재시작 루프
- forwarded core/engine은 HTTP `000`
- direct SSH 8022는 `Connection refused`

이 때문에 처음에는 whole Termux/runit/sshd 소실 재발로 분류했습니다.

## 메인 SSH tunnel 실제 로그 위치

`pocketrisu-ssh-tunnel/log/run`은 다음 위치에 `svlogd -tt`로 기록합니다.

- `$HOME/.local/state/pocketrisu-ssh-tunnel`

logger 자체는 계속 살아 있었고, 앞선 두 로그 탐색은 경로 추정이 틀린 것이었습니다.

## 시간대 주의

`svlogd -tt` 출력은 현재 KST 표시보다 9시간 느린 UTC 형태로 기록되고 있습니다.

예:

- 로그 `2026-08-31_17:41:11` ≈ KST `2026-09-01 02:41:11`

따라서 로그 시각은 KST로 변환해서 해석해야 합니다.

## 첫 번째 중요한 분기

마지막 whole-stack 정상 확인 시각은 KST `2026-08-31 03:49:52`, 즉 로그 기준 UTC `2026-08-30_18:49:52`입니다.

이 이후 `Connection refused`를 단순 문자열로 처음 찾았을 때 다음이 나왔습니다.

- 로그: `2026-08-31_04:38:43.73282`
- KST 환산: `2026-08-31 13:38:43`
- 메시지: `channel 5: open failed: connect failed: Connection refused`

이 메시지는 `ssh: connect to host ... port 8022: Connection refused`와 성격이 다릅니다.

`channel ... open failed`는 기존 SSH 세션 내부에서 forwarding 대상 연결이 거부된 경우로 해석하는 것이 자연스럽습니다. 즉 이 시점에는 SSH transport/sshd 자체가 이미 죽었다고 단정할 수 없습니다.

따라서 현재 재발은 다음 두 단계로 분리해서 추적해야 합니다.

1. KST `2026-08-31 13:38:43` 시점까지 최소 한 forwarded target이 연결 거부 상태가 됨
2. KST `2026-09-01 02:30` 확인 시점에는 direct SSH 8022 자체도 `Connection refused`

이는 서버 내부 서비스가 먼저 내려간 뒤 sshd/Termux backend가 더 나중에 사라졌을 가능성을 열어 둡니다.

## 아직 미확정인 것

- `13:38:43 KST`의 channel failure가 정확히 core/engine 중 어느 target인지
- direct SSH transport가 처음 `Connection refused`가 된 정확한 시각
- forwarded target failure와 sshd 소실 사이의 시간 간격
- wake-lock held 상태가 언제/왜 해제되었는지

다음 단계는 마지막 known-good 이후 `ssh: connect to host ... port 8022: Connection refused` 패턴만 따로 찾아 transport failure 시점을 분리하는 것입니다.

정확한 private endpoint/IP는 기록하지 않습니다.
