# 서버폰 Tailscale 배터리 최적화 상태 확인 — 2026-09-01

## 관찰

서버폰의 Android 설정에서 다음 상태를 확인했다.

- Tailscale VPN 항상 켜기: ON
- VPN 제외 연결 차단: OFF
- VPN 목록의 Tailscale: 항상 사용
- Tailscale 앱 배터리 설정: **최적화**

동일한 재부팅 검증 구간에서 메인폰에서는 서버폰 Tailscale 주소에 대한 ICMP가 100% 손실이었고, 두 독립 SSH 터널 역시 `Connection timed out`을 반복했다.

## 해석

Always-on VPN 설정 자체가 꺼져 있었던 것은 아니다. 따라서 재부팅 후 Tailscale 피어가 보이지 않은 현상을 단순한 Always-on 설정 누락으로 설명할 수 없다.

Tailscale 앱이 Samsung/Android 배터리 정책에서 `최적화` 상태였다는 점은 재부팅 후 백그라운드 VPN 서비스 복구를 방해하거나 지연시킬 수 있는 **후보 요인**이다. 다만 이 시점에는 원인으로 확정하지 않는다.

## 다음 검증

Tailscale 앱 배터리 설정을 `제한 없음`으로 변경한 뒤, Tailscale 앱과 Termux를 직접 열지 않은 상태에서 메인폰에서 피어 reachability 및 SSH 자동복구 여부를 재확인한다.

## 주의

- 서버폰 Termux는 열지 않는다.
- Tailscale 앱을 직접 열어 세션을 인위적으로 복구시키지 않는다.
- 이 문서에는 사설 Tailscale 주소나 인증 정보 등 민감 정보를 기록하지 않는다.
