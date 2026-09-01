# 듀얼폰 2차 재부팅 8시간 25분 soak PASS — 2026-09-01

## 요약

Tailscale 배터리 설정을 `제한 없음`으로 변경한 뒤 수행한 2차 통제 재부팅에서, 서버폰 Termux 및 Tailscale 앱을 별도로 열지 않은 상태로 장시간 soak를 이어갔다.

2026-09-01 13:05 KST 점검에서 메인폰 SSH/notify 터널과 서버폰 주요 runit 서비스가 동일 세대/PID를 유지한 채 약 8시간 25분 생존했다. PocketRisu core와 local-usage engine health도 정상이다.

## 관찰값

점검 시각:

- 메인폰: `2026-09-01T13:05:15+0900`

메인폰 터널:

- `pocketrisu-ssh-tunnel`: pid `10229`, age `30305s`
- `pocketrisu-notify-tunnel`: pid `10226`, age `30306s`

전달 서비스:

- PocketRisu core: HTTP `200`
- local-usage engine: HTTP `200`

서버폰 서비스:

- `sshd`: pid `14047`, age `30306s`
- `pocketrisu`: pid `14051`, age `30306s`
- `llmgateway-bridge`: pid `14048`, age `30306s`
- `local-usage-runtime-manager`: pid `14049`, age `30306s`
- `local-usage-runtime-engine`: pid `14050`, age `30306s`

`30306s`는 약 8시간 25분 6초다.

## 판정

- 6시간 soak 기준을 충분히 통과했다.
- 과거 관찰된 부팅 후 약 11분 시점의 Termux/runit/sshd 재소실 패턴은 이번 2차 재부팅에서 재현되지 않았다.
- 메인 터널과 서버 서비스가 같은 세대/PID를 유지했으므로 이 점검 구간에서 서비스 재생성 흔적은 없다.
- core와 engine이 계속 HTTP 200이므로 원격 기능 스택도 정상이다.

## 해석 주의

이번 안정화는 `.termux/boot/` 내부 역사적 `.bak-*` 스크립트 격리와 Tailscale 배터리 `제한 없음` 변경 이후 관찰됐다. 다만 현재 증거만으로 각각의 변경이 단독 원인이라고 100% 단정하지는 않는다.

현재 단계에서는 장시간 안정성이 강하게 개선되었다는 실측 결과로 기록한다.

## 다음 단계

추가 수정 없이 동일 세대를 계속 soak하여 12시간 및 가능하면 24시간 경계를 확인하는 것이 가장 가치가 높다.
