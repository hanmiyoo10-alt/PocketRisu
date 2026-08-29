# Android 듀얼폰 원격 접속 메모

PocketRisu를 서버폰과 메인폰으로 분리해 운용할 때의 원격 접속 점검/도입 메모입니다.

## 현재 목표

- 서버폰: PocketRisu 본체, DB, pocketrisu 서비스, local-usage/DevPass/bridge, sshd
- 메인폰: Firefox/PocketRisu 사용, SSH core/notify 터널, 메인 알림 relay
- 목적: 서로 다른 Wi‑Fi/모바일망에서도 메인폰이 서버폰에 안정적으로 접근
- 후보: Tailscale 기반 사설 네트워크

## 2026-08-29 서버폰 INSPECT_ONLY 결과

- Android 15
- Termux에서 `tailscale` CLI는 발견되지 않음
- Android Tailscale 패키지는 Termux의 패키지 조회에서 발견되지 않음(패키지 가시성 제한 가능성은 별도 고려)
- `ip addr`, `ip route`, `ss -ltn`은 현재 Termux 권한 컨텍스트에서 netlink socket 접근이 `Permission denied`로 실패
- `ifconfig` fallback으로 `wlan0`가 UP/RUNNING이고 현재 IPv4 주소가 `192.168.0.19/24`임을 확인
- `termux-wifi-connectioninfo`에서도 현재 IP `192.168.0.19`, Wi‑Fi 연결 상태 `COMPLETED` 확인
- `sshd -T` 유효 설정:
  - `Port 8022`
  - `AddressFamily any`
  - `ListenAddress 0.0.0.0:8022`
  - `ListenAddress [::]:8022`
  - `PubkeyAuthentication yes`
  - `PasswordAuthentication yes`
- 따라서 SSH 구성상 서버폰은 IPv4/IPv6 모든 인터페이스의 TCP 8022에서 수신하도록 설정되어 있음
- 최종 프로세스 재확인에서 `sshd` 본체와 여러 `sshd-session`이 모두 실행 중임을 확인
- 로컬 TCP 8022 추가 검사에 사용하려던 `nc`는 서버폰 Termux에 설치되어 있지 않아 해당 검사만 미실행. 이는 sshd 장애를 의미하지 않음
- 결론: 서버폰 SSH 측 INSPECT_ONLY는 정상으로 종료.

## 2026-08-29 메인폰 INSPECT_ONLY 결과

- Android 16
- Wi-Fi 인터페이스 `wlan0`의 현재 IPv4 주소는 `192.168.0.11/24`
- 모바일 데이터 계열 인터페이스 `v4-rmnet_data0`도 존재
- Android 패키지 `com.tailscale.ipn`이 설치되어 있음
- Termux 내부 `tailscale` CLI는 없음. Android 앱 설치와 Termux CLI 존재 여부는 별개이므로 이상으로 보지 않음
- `~/.ssh/config`는 없음
- 현재 SSH 터널 프로세스 두 개가 동작 중이며 모두 서버폰 `u0_a34@192.168.0.19:8022`를 직접 목적지로 사용
  - reverse forward: `-R 127.0.0.1:39120:127.0.0.1:39120`
  - local forwards: `6001`, `39117`, `39118`, `39119`
- SSH 옵션은 `BatchMode=yes`, `StrictHostKeyChecking=yes`, `ExitOnForwardFailure=yes`, `ConnectTimeout=10`, `ServerAliveInterval=30`, `ServerAliveCountMax=3`로 구성되어 있음
- runit 서비스 `pocketrisu-ssh-tunnel`이 존재하며 `runsv`/`svlogd`로 관리 중
- Termux:Boot 파일:
  - `00-update-local-stack`
  - `05-pocketrisu-boot-trace`
  - `20-pocketrisu-ssh-tunnel`
- `20-pocketrisu-ssh-tunnel`은 runsvdir 준비를 보장한 뒤 `sv up pocketrisu-ssh-tunnel`을 실행하고, `http://127.0.0.1:6001/api/health`를 최대 약 90초 동안 확인하는 부트 복구 스크립트임
- runit 서비스의 실제 `run` 파일에 서버 LAN 목적지 `u0_a34@192.168.0.19`가 직접 하드코딩되어 있음
- `pocketrisu-ssh-tunnel`은 local forward `6001`, `39117`, `39118`, `39119`를 담당함
- reverse `39120` 프로세스는 부모 PID가 `runsv pocketrisu-notify-tunnel`이며, 별도 runit 서비스 `pocketrisu-notify-tunnel`이 담당하는 것으로 확정됨
- `pocketrisu-notify-tunnel/run`도 `u0_a34@192.168.0.19:8022`를 직접 목적지로 사용하며 reverse forward `127.0.0.1:39120`을 담당함
- 즉 core/local forward 터널과 notify/reverse 터널은 runit 서비스 단위로 분리되어 있음
- `pocketrisu-notify-relay`는 별도 runit 서비스로 `receiver.cjs`를 실행 중이며, notify tunnel과 relay도 분리되어 있음
- `192.168.0.19` 검색에서 migration backup 파일들과 과거 상태 로그도 함께 발견됨. 이들 백업/로그는 현재 실행 구성 파일과 구분해서 다뤄야 함
- `.local/state/pocketrisu-ssh-tunnel/current`의 `Connection refused` 다수는 2026-08-27 기록으로, 현재 시점의 장애를 의미하지 않음
- `pidof com.tailscale.ipn` 및 `ps -A | grep -i tailscale`에서는 현재 Tailscale 프로세스가 보이지 않음
- 이는 Tailscale Android 패키지가 설치되어 있으나 현재 앱/VPN 프로세스가 활성 상태로 보이지 않는다는 뜻이며, 로그인 상태 자체까지 단정할 수는 없음
- 현재 구조는 LAN 주소 `192.168.0.19`에 직접 의존하므로 서로 다른 네트워크로 분리되면 그대로는 접속할 수 없음
- Tailscale 도입 시 core/notify 포워딩 구조 자체를 바꾸기보다 각 터널 서비스의 서버 목적지 주소만 Tailscale 주소 또는 MagicDNS 이름으로 치환하는 방향이 가장 단순함

## Tailscale 적합성 판단

현재까지 확인된 구조만 보면 듀얼폰 PocketRisu 환경은 Tailscale 도입에 매우 적합한 편이다.

- 서버폰 sshd가 `0.0.0.0:8022` 및 `[::]:8022`에 바인딩되어 있어 Tailscale 가상 인터페이스가 추가되어도 별도 SSH 바인딩 변경 없이 접근 가능할 가능성이 높다.
- 기존 LAN 주소 `192.168.0.19`에 의존하는 접속을 Tailscale의 고정 사설 주소 또는 MagicDNS 이름으로 치환하면 서로 다른 Wi‑Fi/모바일망에서도 같은 SSH 구조를 유지하기 쉽다.
- 메인폰에는 이미 Tailscale Android 앱 패키지가 설치되어 있어 메인폰 측 설치 단계는 줄어들 수 있다.
- core/local forward와 notify/reverse tunnel이 서로 다른 runit 서비스로 분리되어 있어, Tailscale 전환 시 서비스별 백업·검증·롤백이 가능하다.
- Android에서는 동시에 활성화 가능한 VPN이 하나뿐이므로, 메인폰/서버폰에서 다른 VPN을 사용 중인지가 가장 큰 도입 체크포인트다.
- 목적은 기존 core/notify/relay 기능을 대체하는 것이 아니라, 그 아래의 메인폰↔서버폰 네트워크 경로를 고정·암호화하는 것이다.
- 서버폰을 exit node나 subnet router로 쓰는 것은 현재 목표에 필요하지 않으므로 우선 제외한다.

## 진행 원칙

1. 서버폰 INSPECT_ONLY
2. 메인폰 INSPECT_ONLY
3. 기존 SSH core/notify 터널과 Tailscale 역할을 분리해 설계
4. 변경이 필요하면 백업 후 수정
5. 검증 후 다음 단계 진행

서버폰에는 Android 알림을 생성하지 않는다. 알림은 메인폰 전용으로 유지한다.
