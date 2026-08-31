# 재부팅 후 Tailscale Always-on 설정 유지 상태에서 피어 미도달

## 관찰 시점
- 2026-09-01 04:20 KST 전후

## Android VPN 설정 스크린샷
- Tailscale VPN 프로필 존재
- `VPN 항상 켜기` ON
- `연결 차단(VPN 제외)` OFF
- VPN 목록에서 Tailscale이 `항상 사용`으로 표시
- 상위 `기타 연결 설정` 화면의 VPN 요약 문구는 상세 화면과 표현이 엇갈려 단독 판정 근거로 사용하지 않음

## 직전 원격 관찰
- 메인폰에서 서버 Tailscale 피어 대상 ping: 100% packet loss
- 두 독립 SSH 터널 모두 `Connection timed out` 반복
- 따라서 서버폰 Termux/sshd보다 앞단의 Tailscale 피어 경로가 아직 성립하지 않은 상태

## 해석
`Always-on VPN`이 꺼져 있어서 재부팅 후 연결이 안 된다는 가설은 배제된다. 설정은 유지되지만 실제 Tailscale VPN 세션/피어 reachability가 재부팅 후 자동으로 성립하지 않은 상태로 분류한다.

이 단계에서는 서버 Termux를 열지 않고 증거를 보존한다. 다음 조사 우선순위는 Tailscale 앱의 배터리/백그라운드 제한 상태 및 Samsung 앱 절전 정책이다.

## 주의
- 설정 화면의 `항상 사용` 표시는 실제 피어 reachability를 직접 증명하지 않는다.
- 실제 연결 여부는 메인폰의 ping/SSH transport 결과와 함께 판단한다.
