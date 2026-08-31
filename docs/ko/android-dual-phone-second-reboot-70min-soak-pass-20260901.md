# 듀얼폰 2차 재부팅 70분 soak PASS — 2026-09-01

## 요약

2차 통제 재부팅 이후 약 70분 시점에서 메인폰 SSH/notify 터널과 서버폰의 sshd, PocketRisu, llmgateway-bridge, local-usage runtime manager/engine이 모두 동일 세대에서 계속 생존 중임을 확인했다.

## 관측 시각

- 메인폰: 2026-09-01T05:51:00+0900
- 서버폰: 2026-09-01T05:51:00+0900

## 메인폰 상태

- pocketrisu-ssh-tunnel: 동일 프로세스 세대 4250초
- pocketrisu-notify-tunnel: 동일 프로세스 세대 4251초
- forwarded core health: HTTP 200
- forwarded engine health: HTTP 200

## 서버폰 상태

다음 서비스가 모두 동일 세대 4250초로 유지됨.

- sshd
- pocketrisu
- llmgateway-bridge
- local-usage-runtime-manager
- local-usage-runtime-engine

이는 약 1시간 10분 50초 연속 생존에 해당한다.

## wake marker

- time=2026-09-01T04:40:24+0900
- phase=post_core_wait
- rc=0

marker가 이번 2차 부팅 시각을 가리킨 채 유지되고 있으며, 관측 시점까지 서비스 세대 재생성 흔적은 보이지 않았다.

## 해석

- 과거 약 11분 뒤 발생했던 Termux/runit/sshd 재소실 패턴은 이번 부팅에서 70분 이상 재현되지 않았다.
- active boot 디렉터리에서 과거 `.bak-*` 실행 스크립트를 격리하고 wake-unlock 경로를 제거한 뒤 서버 스택의 단기 안정성은 크게 개선된 상태로 관측된다.
- Tailscale은 이번 2차 부팅에서 앱을 열지 않고 자동 복구되었고, 원격 경로와 SSH 터널도 70분 이상 유지됐다.
- 다만 `.bak-*` 격리 또는 Tailscale 배터리 `제한 없음` 설정 각각이 단독 원인임을 이 한 번의 soak만으로 확정하지는 않는다.

## 현재 판정

**2차 재부팅 70분 soak: PASS**

다음 단계는 추가 수정 없이 장시간 soak를 이어가며 동일 서비스 세대가 계속 유지되는지 확인하는 것이다.

민감한 사설 네트워크 주소, 인증 토큰, webhook 비밀값은 기록하지 않았다.
