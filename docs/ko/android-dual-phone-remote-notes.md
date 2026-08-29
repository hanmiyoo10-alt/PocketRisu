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
- 이는 Tailscale Android 패키지가 설치되어 있으나 당시 앱/VPN 프로세스가 활성 상태로 보이지 않는다는 뜻이며, 로그인 상태 자체까지 단정할 수는 없음
- Android 16 Termux에서 `settings get secure always_on_vpn_app` 및 `always_on_vpn_lockdown` 조회는 `Failed transaction (2147483646)`으로 실패함
- `dumpsys package com.tailscale.ipn` 필터와 `dumpsys connectivity` VPN 필터도 유효 출력을 얻지 못함
- 따라서 Termux 권한만으로 현재 always-on VPN/활성 VPN 여부를 확정하지 않으며, 이 빈 출력은 "VPN 없음"의 증거로 사용하지 않음
- 메인폰 Android VPN 설정 화면을 사용자가 직접 확인했으며, 당시 별도 VPN이 연결되어 있지 않음을 확인함. 따라서 Tailscale 도입의 가장 큰 충돌 변수였던 기존 활성 VPN은 없음으로 판단함
- 현재 구조는 LAN 주소 `192.168.0.19`에 직접 의존하므로 서로 다른 네트워크로 분리되면 그대로는 접속할 수 없음
- Tailscale 도입 시 core/notify 포워딩 구조 자체를 바꾸기보다 각 터널 서비스의 서버 목적지 주소만 Tailscale 주소 또는 MagicDNS 이름으로 치환하는 방향이 가장 단순함

## 2026-08-29 Tailscale 연결 확인

- Android Tailscale 앱 화면에서 두 기기가 모두 같은 tailnet에 온라인(초록 상태)으로 표시됨
- 기기명은 `s21-ultra`, `s25-ultra`로 확인됨
- Exit Node는 `None` 상태로, 현재 목적에 맞게 일반 tailnet 연결만 사용 중임
- 공개 저장소에는 계정 식별 정보와 정확한 Tailscale 100.x 주소를 기록하지 않음
- 메인폰에서 기존 LAN 경로와 Tailscale 경로 각각으로 서버폰 TCP 8022의 SSH host key를 `ssh-keyscan`으로 읽기 전용 조회함
- ECDSA, RSA, ED25519 세 host key fingerprint가 두 경로에서 모두 일치함
- 따라서 Tailscale 경로의 TCP 8022가 기존 LAN 경로와 동일한 서버폰의 Termux sshd에 도달하는 것이 검증됨
- 이후 메인폰에서 모바일 데이터 경로 검증용 `ssh-keyscan`을 실행했고, Tailscale 경로에서 동일한 RSA/ECDSA/ED25519 세 fingerprint가 다시 확인됨
- 단, 터미널 출력 자체만으로 Wi-Fi 비활성 상태를 독립적으로 증명할 수는 없으므로 외부망 최종 판정은 테스트 당시 메인폰 Wi-Fi가 실제로 꺼져 있었다는 조건과 함께 기록함
- 전환 직전 `pocketrisu-ssh-tunnel/run`과 `pocketrisu-notify-tunnel/run`을 `migration-backups` 아래에 같은 타임스탬프로 백업했으며, 두 백업 파일 생성 및 원본과 동일한 실행 권한을 확인함
- `~/.ssh/known_hosts`에는 기존 LAN 주소의 TCP 8022 host key(ED25519/RSA/ECDSA)가 등록되어 있으나, Tailscale 주소의 TCP 8022 항목은 아직 등록되어 있지 않음을 확인함
- 두 터널 모두 `StrictHostKeyChecking=yes`를 사용하므로 목적지 주소를 Tailscale로 치환하기 전에, 이미 fingerprint 일치가 검증된 Tailscale 주소 host key를 `known_hosts`에 안전하게 추가해야 함
- `known_hosts` 추가 직전 원본을 `migration-backups/known_hosts.bak-tailscale-*`로 백업했고 파일 생성도 확인함
- host key 재수집/비교/추가를 한 번에 수행하려던 스크립트는 `set -e` 상태에서 `ssh-keyscan` 단계 직후 종료되어 실제 추가 단계까지 도달하지 않음. 따라서 `known_hosts`는 아직 수정되지 않았으며, 다음에는 `ssh-keyscan`의 실제 출력과 종료코드를 별도로 관찰한 뒤 추가 여부를 판단해야 함
- 다음 전환 단계는 `ssh-keyscan` 진단 → 검증된 Tailscale host key 추가 및 재확인 → 서버 목적지 주소 치환 → core/local forward 검증 → notify/reverse 검증 → Wi-Fi/모바일망 재검증 순으로 진행함

## Tailscale 적합성 판단

현재까지 확인된 구조만 보면 듀얼폰 PocketRisu 환경은 Tailscale 도입에 매우 적합한 편이다.

- 서버폰 sshd가 `0.0.0.0:8022` 및 `[::]:8022`에 바인딩되어 있어 Tailscale 가상 인터페이스가 추가되어도 별도 SSH 바인딩 변경 없이 접근 가능할 가능성이 높다.
- 기존 LAN 주소 `192.168.0.19`에 의존하는 접속을 Tailscale의 고정 사설 주소 또는 MagicDNS 이름으로 치환하면 서로 다른 Wi‑Fi/모바일망에서도 같은 SSH 구조를 유지하기 쉽다.
- 메인폰에는 이미 Tailscale Android 앱 패키지가 설치되어 있어 메인폰 측 설치 단계는 줄어든 상태다.
- core/local forward와 notify/reverse tunnel이 서로 다른 runit 서비스로 분리되어 있어, Tailscale 전환 시 서비스별 백업·검증·롤백이 가능하다.
- 메인폰의 Android VPN 설정 UI 확인 결과 기존 별도 활성 VPN이 없어 Tailscale과의 VPN 슬롯 충돌 가능성도 낮다.
- 두 기기가 실제로 같은 tailnet에 온라인 상태로 들어온 것이 확인되어 네트워크 오버레이 도입 자체는 성공함
- LAN 경로와 Tailscale 경로의 SSH host key가 모두 일치해 Tailscale이 동일한 서버폰 sshd까지 도달하는 것도 검증됨
- 모바일 데이터 검증에서도 동일한 SSH host key 세트가 다시 확인되어 외부망 운용에 필요한 핵심 경로가 동작하는 것으로 판단함(테스트 당시 Wi-Fi off 조건 전제)
- 목적은 기존 core/notify/relay 기능을 대체하는 것이 아니라, 그 아래의 메인폰↔서버폰 네트워크 경로를 고정·암호화하는 것이다.
- 서버폰을 exit node나 subnet router로 쓰는 것은 현재 목표에 필요하지 않으므로 우선 제외한다.

## 진행 원칙

1. 서버폰 INSPECT_ONLY
2. 메인폰 INSPECT_ONLY
3. 기존 SSH core/notify 터널과 Tailscale 역할을 분리해 설계
4. 변경이 필요하면 백업 후 수정
5. 검증 후 다음 단계 진행

서버폰에는 Android 알림을 생성하지 않는다. 알림은 메인폰 전용으로 유지한다.
