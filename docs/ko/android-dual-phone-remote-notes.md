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
- 즉 core/local forward 터널과 notify/reverse tunnel이 서로 다른 runit 서비스로 분리되어 있음
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
- `~/.ssh/known_hosts`에는 기존 LAN 주소의 TCP 8022 host key(ED25519/RSA/ECDSA)가 등록되어 있으나, Tailscale 주소의 TCP 8022 항목은 처음에는 등록되어 있지 않았음
- 두 터널 모두 `StrictHostKeyChecking=yes`를 사용하므로 목적지 주소를 Tailscale로 치환하기 전에 host key 등록이 필요함
- `known_hosts` 원본은 `migration-backups/known_hosts.bak-tailscale-*`로 백업 완료
- 별도 `ssh-keyscan` 진단에서 종료코드 `0`, stderr 없음, RSA/ECDSA/ED25519 세 fingerprint가 기존 검증값과 일치함을 재확인함
- 이후 기존 LAN `known_hosts`의 신뢰된 세 host key를 Tailscale 주소 항목으로 복제했고, `prepared_key_lines=3` 확인 후 ED25519/RSA/ECDSA 세 항목이 실제 `known_hosts`에 등록된 것을 검증함
- 따라서 `StrictHostKeyChecking=yes`를 유지한 채 Tailscale 주소로 SSH 접속할 준비가 완료됨
- 메인폰에서 `BatchMode=yes`와 `StrictHostKeyChecking=yes`를 유지한 직접 SSH 인증을 Tailscale 경로로 실행했고, 원격 명령이 성공하며 서버 사용자 `u0_a34`가 반환됨
- 따라서 Tailscale 경로에서 네트워크 도달성뿐 아니라 host key 검증과 기존 공개키 인증까지 모두 정상 동작함을 확인함
- `pocketrisu-ssh-tunnel/run` 수정 직전 별도 즉시 백업을 `migration-backups/pocketrisu-ssh-tunnel.run.bak-pre-tailscale-*`로 생성함
- core/local 터널 `run` 파일 사전검사에서 기존 LAN 목적지는 정확히 1회, 새 Tailscale 목적지는 0회인 것을 확인한 뒤 목적지 한 곳만 Tailscale 주소로 치환함
- 수정 후 기존 LAN 목적지는 0회, Tailscale 목적지는 정확히 1회로 확인되어 파일 수정이 의도대로 끝남
- 이 단계에서는 `pocketrisu-ssh-tunnel` 서비스를 재시작하지 않았으므로 실행 중인 기존 세션은 아직 영향을 받지 않았음
- `pocketrisu-notify-tunnel`은 이 단계에서 수정하거나 재시작하지 않고 기존 LAN 경로를 유지함
- 이후 `pocketrisu-ssh-tunnel`만 재시작했고 runit 재시작은 종료코드 0으로 성공함
- 재시작 후 실제 core SSH 프로세스가 Tailscale 목적지를 사용하며 local forward `6001`, `39117`, `39118`, `39119`를 그대로 유지하는 것을 확인함
- 같은 시점에 notify/reverse SSH 프로세스는 기존 LAN 목적지를 계속 사용하고 있어 단계적 전환 범위가 core에만 제한된 것도 확인함
- 메인폰의 `http://127.0.0.1:6001/api/health`가 `ok=true`, `status=ready`로 응답해 PocketRisu core/local 터널이 Tailscale 경로에서 정상 동작함을 검증함
- 따라서 core/local 터널의 Tailscale 전환은 완료로 판정함
- `pocketrisu-notify-tunnel/run`도 수정 직전 별도 즉시 백업을 `migration-backups/pocketrisu-notify-tunnel.run.bak-pre-tailscale-*`로 생성함
- notify/reverse 터널 `run` 파일 사전검사에서 기존 LAN 목적지는 정확히 1회, 새 Tailscale 목적지는 0회인 것을 확인한 뒤 목적지 한 곳만 Tailscale 주소로 치환함
- 수정 후 기존 LAN 목적지는 0회, Tailscale 목적지는 정확히 1회로 확인되어 notify 설정 파일 수정이 의도대로 끝남
- 이 단계에서는 `pocketrisu-notify-tunnel` 서비스를 아직 재시작하지 않아 실행 중인 기존 reverse 세션은 영향을 받지 않았음
- 이후 `pocketrisu-notify-tunnel`만 재시작했고 runit 재시작은 종료코드 0으로 성공함
- 재시작 후 reverse `39120` SSH 프로세스가 Tailscale 목적지를 사용하고, 기존 LAN reverse 프로세스는 사라진 것을 확인함
- 메인폰 `pocketrisu-notify-relay`는 계속 `run` 상태였고 `receiver.cjs` 프로세스도 유지됨
- 같은 시점에 core/local 터널도 `run` 상태를 유지했으며 `http://127.0.0.1:6001/api/health`가 계속 `ok=true`, `status=ready`로 응답함
- 따라서 core/local 및 notify/reverse 두 SSH 경로의 Tailscale 전환은 모두 완료로 판정함
- 메인폰 notify relay의 `run` 스크립트는 별도 래퍼 로직 없이 Node.js의 `receiver.cjs`를 직접 실행함
- `receiver.cjs`는 `127.0.0.1:39120`에만 listen하며 loopback 이외의 원격 주소는 403으로 거부함
- `GET /health`는 JSON `{"ok":true}`를 반환하고, 실제 알림은 `POST /notify`에서만 생성함
- `POST /notify`는 `x-pocketrisu-notify-token` 헤더가 메인폰의 로컬 token 파일과 일치해야 하며, 불일치 시 401로 거부함. 공개 문서에는 token 값 자체를 기록하지 않음
- JSON body는 `stage`, `elapsedMs`, `character`, `model`, `sound`를 읽고, `stage=start`가 아니면 완료 알림으로 처리함
- 실제 Android 알림 생성은 메인폰의 `termux-notification`을 사용하며 notification id `8472`, PocketRisu 제목/내용, high priority로 생성됨
- 따라서 reverse SSH `39120`은 서버폰 측 loopback 요청을 메인폰의 loopback-only relay로 전달하는 역할이며, Android 알림 자체는 메인폰에서만 생성되는 구조임
- 메인폰 loopback에서 `GET /health`가 정상 응답하고, token을 노출하지 않는 방식의 인증된 `POST /notify` 테스트가 JSON `{"ok":true}`와 HTTP 200을 반환함
- 같은 테스트에서 메인폰 Android에 실제 PocketRisu 테스트 알림이 표시되어 relay + token 인증 + `termux-notification` 구간이 정상임을 검증함
- 이어서 서버폰에서 `http://127.0.0.1:39120/health`를 호출했고 JSON `{"ok":true}`와 HTTP 200을 반환함
- 따라서 서버폰 localhost → Tailscale reverse SSH `39120` → 메인폰 loopback relay 경로도 실제로 정상 동작함을 확인함
- 다음 단계는 기존 서버 측 알림 발신 코드를 INSPECT_ONLY로 확인해 실제 PocketRisu 발신 경로를 보존한 end-to-end 알림 검증 → 모바일망/다른 Wi-Fi 최종 재검증 순으로 진행함

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
- `StrictHostKeyChecking=yes`를 유지하기 위한 Tailscale 주소 host key 등록도 완료되어 서비스 전환 준비가 됨
- `BatchMode=yes` + `StrictHostKeyChecking=yes` 직접 SSH 인증도 Tailscale 경로에서 성공해 기존 인증 체계를 그대로 유지할 수 있음이 확인됨
- core/local 터널은 실제 runit 재시작 후 Tailscale 목적지로 실행 전환되었고, `/api/health`까지 정상이라 core 전환은 완료됨
- notify/reverse 터널도 실제 runit 재시작 후 Tailscale 목적지로 실행 전환되었으며, 메인폰 notify relay와 core health가 모두 정상이라 SSH 경로 전환은 완료됨
- 메인폰 local relay 알림 생성과 서버폰→reverse→메인폰 relay health 모두 정상이라 notify 전송 기반 경로도 검증됨
- 목적은 기존 core/notify/relay 기능을 대체하는 것이 아니라, 그 아래의 메인폰↔서버폰 네트워크 경로를 고정·암호화하는 것이다.
- 서버폰을 exit node나 subnet router로 쓰는 것은 현재 목표에 필요하지 않으므로 우선 제외한다.

## 진행 원칙

1. 서버폰 INSPECT_ONLY
2. 메인폰 INSPECT_ONLY
3. 기존 SSH core/notify 터널과 Tailscale 역할을 분리해 설계
4. 변경이 필요하면 백업 후 수정
5. 검증 후 다음 단계 진행

서버폰에는 Android 알림을 생성하지 않는다. 알림은 메인폰 전용으로 유지한다.