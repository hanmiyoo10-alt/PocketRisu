# 서버폰 통제 재부팅 후 공통 timeout 상태 확인 (2026-09-01)

## 요약

부팅 디렉터리의 실행 가능한 `.bak-*` 파일을 active `~/.termux/boot/` 밖으로 격리한 뒤 서버폰을 통제 재부팅했다. 재부팅 후 서버폰 Termux UI를 열지 않은 상태에서 메인폰의 두 독립 SSH 터널을 점검했다.

두 터널 모두 재시작 루프에 있었고, 최신 오류는 `Connection refused`가 아니라 지속적인 `Connection timed out`이었다.

## 관찰

- `pocketrisu-ssh-tunnel`: 수 초 단위 age로 계속 재시작.
- `pocketrisu-notify-tunnel`: 수 초 단위 age로 계속 재시작.
- 두 로그 모두 2026-08-31 19:15 UTC대까지 `ssh: connect ... port 8022: Connection timed out`이 반복됨.
- `svlogd -tt` 시간은 UTC이므로 이는 2026-09-01 04:15 KST대에 해당.
- forwarded core / engine / manager는 모두 HTTP 000 상태.

## 해석

현재 단계에서는 서버 sshd가 단순히 리슨하지 않아 거부하는 상태(`Connection refused`)가 아니다. 메인폰에서 서버폰의 Tailscale/private endpoint 자체가 응답하지 않아 SSH transport 연결이 timeout되는 상태다.

따라서 이 시점만으로는 `.bak-*` 격리 수정이 실패했다고 판단할 수 없으며, Termux/sshd보다 앞단인 서버폰 Tailscale/네트워크 경로가 아직 복구되지 않았을 가능성을 우선 확인해야 한다.

서버폰 Termux UI를 열면 Termux 프로세스와 runit 상태를 변경할 수 있으므로, 추가 원격 증거 수집 전에는 열지 않는다.

## 보안

정확한 Tailscale/private IP는 문서에 기록하지 않았다.
