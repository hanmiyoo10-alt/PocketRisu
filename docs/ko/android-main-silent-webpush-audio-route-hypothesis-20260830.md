# 메인폰 무음 Web Push 전환과 오디오 라우팅 무한로딩 가설 (2026-08-30)

## 배경

현재 PocketRisu 사용 중 메인폰에서 통화, Discord 음성, 이어폰 연결/해제 등 오디오 라우팅이 바뀌는 상황과 알림 사운드가 겹칠 때 무한로딩 계열 문제가 재현될 가능성이 의심됩니다.

향후 알림 구조는 Discord를 기록/중계 채널로 사용하고, 메인폰에는 Discord 앱을 설치하지 않은 채 Firefox/PocketRisu 쪽 Web Push를 받는 방향을 검토합니다.

## 가설

문제의 핵심이 Discord 자체가 아니라 Android 알림 사운드 또는 오디오 포커스/출력 경로 변경과 PocketRisu/Firefox 상태의 상호작용이라면, 기존 Termux/Android 알림 사운드를 제거하고 메인폰 Web Push를 무음으로 운용하면 무한로딩 재현률이 낮아질 수 있습니다.

다만 이는 아직 가설이며, Discord/Web Push로 전환했다는 사실 자체만으로 문제가 사라진다고 단정하지 않습니다. Web Push가 실제 사운드를 재생하면 같은 변수가 남을 수 있으므로 메인폰 수신은 가능한 한 silent notification을 목표로 합니다.

## 권장 구조

- PocketRisu/GPT 응답 완료 및 상태 이벤트 -> 공통 notification dispatcher
- Discord Webhook -> 전용 Discord 채널에 기록/중계
- 메인폰 Firefox Web Push -> 시각 알림 중심, 가능하면 무음
- 기존 메인폰 Termux Android notification relay는 새 경로 검증 전까지 fallback으로 유지
- 서버폰에는 새 Android 알림을 만들지 않음
- Discord webhook URL 등 비밀값은 GitHub에 기록하지 않음

## 검증 방향

전환 전후로 다음 조건을 A/B 비교합니다.

- 통화 시작/종료
- Discord 음성 연결/해제
- 유선/블루투스 이어폰 연결/해제
- 알림 수신 시점
- PocketRisu 응답 완료 직후

가능하면 기존 사운드 알림과 무음 Web Push를 동일 조건에서 비교해 무한로딩 재현 여부를 분리합니다.

## 주의

이 문서는 원인 확정이 아니라 재현 변수 제거를 위한 실험 가설 기록입니다. 오디오 라우팅 변경 자체, Firefox 오디오 상태, PocketRisu UI 상태 등 다른 원인도 계속 분리해 진단합니다.
