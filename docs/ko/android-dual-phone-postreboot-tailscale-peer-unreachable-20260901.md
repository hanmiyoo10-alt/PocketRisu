# 재부팅 후 서버폰 Tailscale 피어 도달 불가 증거 — 2026-09-01

## 상황

부팅 디렉터리의 실행 가능한 `.bak-*` 백업 4개를 `~/.termux/boot/` 밖으로 격리하고 통제 재부팅한 뒤, 서버폰 Termux를 열지 않은 상태에서 메인폰에서 원격 자동복구를 검사했다.

## 메인폰 증거

- 2026-09-01 04:13 KST: main SSH/notify tunnel이 짧은 age로 반복 재시작 중.
- forwarded PocketRisu core/engine/manager는 모두 HTTP 000.
- 2026-09-01 04:15 KST까지 두 독립 SSH 세션 모두 `Connection timed out`을 반복.
- 2026-09-01 04:17:57 KST: SSH tunnel run 파일에서 서버 Tailscale 목적지를 추출해 일반 ICMP ping 3회를 수행.
- 결과: 3 packets transmitted, 0 received, 100% packet loss, `ping_rc=1`.
- 분류: `TAILSCALE_PEER_NOT_REACHABLE`.

## 해석

현재 단계에서는 서버폰 sshd나 PocketRisu 자체의 부팅 실패를 먼저 결론내릴 수 없다. 메인폰에서 서버폰의 Tailscale 피어 주소 자체가 응답하지 않으므로, 실패 지점은 sshd/Termux보다 앞단인 서버폰 Tailscale 또는 서버폰 네트워크 경로일 가능성이 높다.

따라서 서버 Termux UI를 열어 증거를 변경하기 전에, 서버폰에서 Tailscale의 재부팅 후 자동 연결 상태를 별도로 확인해야 한다.

## 주의

- private Tailscale 주소는 기록하지 않는다.
- 서버폰 Termux는 이 시점까지 열지 않았다.
- `.bak-*` 격리 수정의 장기 효과는 아직 판정하지 않는다. Tailscale 경로가 복구된 이후 sshd/core 상태를 다시 분리 확인해야 한다.
