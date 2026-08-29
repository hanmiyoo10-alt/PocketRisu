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
- 결론: 서버폰 SSH 측 INSPECT_ONLY는 정상으로 종료. 다음 단계는 메인폰의 기존 SSH core/notify 터널 및 VPN/Tailscale 상태 확인

## 진행 원칙

1. 서버폰 INSPECT_ONLY
2. 메인폰 INSPECT_ONLY
3. 기존 SSH core/notify 터널과 Tailscale 역할을 분리해 설계
4. 변경이 필요하면 백업 후 수정
5. 검증 후 다음 단계 진행

서버폰에는 Android 알림을 생성하지 않는다. 알림은 메인폰 전용으로 유지한다.
