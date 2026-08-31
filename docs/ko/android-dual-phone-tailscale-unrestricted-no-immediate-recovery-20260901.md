# Tailscale 배터리 제한 없음 변경 후 즉시 복구 없음 (2026-09-01)

## 관찰 시각
- 메인폰 재검사: 2026-09-01 04:26 KST

## 선행 변경
- 서버폰 Tailscale 배터리 정책을 `최적화`에서 `제한 없음`으로 변경했다.
- Tailscale 앱 자체와 서버폰 Termux는 열지 않은 상태를 유지했다.

## 메인폰 재검사 결과
- `pocketrisu-ssh-tunnel`: runit 재시작 루프 상태(검사 시 age 약 2초)
- `pocketrisu-notify-tunnel`: runit 재시작 루프 상태(검사 시 age 약 18초)
- 서버 Tailscale 피어 ICMP: 2 packets transmitted, 0 received, 100% packet loss
- forwarded PocketRisu core health: HTTP 000 / 연결 실패
- SSH transport 로그는 04:26 KST까지 계속 `Connection timed out`

## 해석
- 배터리 정책을 `제한 없음`으로 바꾸는 것만으로 이미 중단된 Tailscale VPN 세션이 즉시 재기동되지는 않았다.
- 이것만으로 배터리 최적화가 장기 재발 원인이 아니라고 결론낼 수는 없다.
- 현 시점에서 확인된 것은 `설정 변경만으로 즉시 복구되지 않음`까지다.
- 서버폰 Termux를 아직 열지 않았으므로, 다음 진단에서는 Tailscale 앱만 수동으로 열어 VPN 경로를 복구한 뒤 Termux/sshd/PocketRisu가 이미 살아 있었는지를 분리할 수 있다.

## 주의
- private Tailscale endpoint는 문서에 기록하지 않는다.
- 서버폰 Termux를 열기 전까지 현재 증거 상태를 보존한다.
