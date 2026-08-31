# Tailscale 포그라운드 실행 직후 서버 연결 복구 관찰 (2026-09-01)

## 관찰

- 서버폰 재부팅 후 Tailscale Always-on VPN 설정은 유지되어 있었지만 메인폰에서 피어 ping 및 SSH transport가 계속 timeout 상태였다.
- Tailscale 배터리 설정을 `최적화`에서 `제한 없음`으로 변경했지만 즉시 복구되지는 않았다.
- 이후 서버폰에서 **Termux는 열지 않은 채 Tailscale 앱만 포그라운드로 열었고**, 사용자가 촬영한 영상이 끝날 즈음 서버 연결이 즉시 복구된 것을 관찰했다.

## 의미

이 관찰은 재부팅 후 막힘이 Termux/sshd/PocketRisu보다 앞단인 Tailscale VPN 서비스의 자동 기동/복구 경로에 있을 가능성을 크게 높인다.

특히 Termux를 열지 않은 상태에서 Tailscale 앱 포그라운드 실행 직후 서버 연결이 살아났다는 점은 다음 가설을 강하게 지지한다.

- Termux/runit/sshd/PocketRisu는 이미 백그라운드에서 살아 있었을 수 있다.
- Tailscale VPN 세션만 재부팅 후 자동으로 올라오지 않았고, 앱 포그라운드 실행이 해당 세션 기동의 트리거가 되었을 수 있다.

다만 이 시점의 관찰만으로 Termux 서비스 생존까지 확정하지는 않는다. 메인폰에서 ping, SSH tunnel, core/engine/manager HTTP 복구를 즉시 재검증해야 한다.

## 현재 상태

- Tailscale Always-on: ON
- VPN 없이 연결 차단: OFF
- Tailscale 배터리: 제한 없음
- 서버 Termux UI: 재부팅 후 아직 열지 않음
- 다음 단계: 메인폰에서 transport 및 forwarded health 재검증
