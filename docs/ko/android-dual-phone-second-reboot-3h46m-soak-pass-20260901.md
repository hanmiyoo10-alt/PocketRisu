# Android 듀얼폰 2차 재부팅 3시간 46분 soak PASS (2026-09-01)

## 요약

2차 통제 재부팅 후 서버폰에서 Termux 및 Tailscale 앱을 수동으로 열지 않은 상태를 유지하면서 메인폰에서 장시간 soak 상태를 점검했다.

점검 시각은 2026-09-01 08:26 KST였고, 주요 메인 터널 및 서버 서비스가 약 13,569초(약 3시간 46분 9초) 동안 동일 세대에서 연속 생존했다.

## 메인폰 관측

- `pocketrisu-ssh-tunnel`: 동일 pid 유지, age 약 13,568초
- `pocketrisu-notify-tunnel`: 동일 pid 유지, age 약 13,569초
- PocketRisu core health: HTTP 200
- local-usage engine health: HTTP 200

## 서버폰 원격 관측

SSH를 통해 서버폰의 runit 서비스 상태를 확인했다.

- `sshd`: 동일 pid, age 약 13,569초
- `pocketrisu`: 동일 pid, age 약 13,569초
- `llmgateway-bridge`: 동일 pid, age 약 13,569초
- `local-usage-runtime-manager`: 동일 pid, age 약 13,569초
- `local-usage-runtime-engine`: 동일 pid, age 약 13,569초

모든 서비스가 같은 생성 시점의 세대로 보이며 중간 재시작 흔적이 관찰되지 않았다.

## 해석

이전 장애에서 관측됐던 부팅 후 약 11분 내외의 Termux/runit/sshd 재소실 패턴은 이번 2차 재부팅에서 약 3시간 46분 시점까지 재현되지 않았다.

현재까지의 증거는 다음 변경 조합 이후 안정성이 크게 개선되었음을 강하게 지지한다.

- `~/.termux/boot/` 내부의 실행 가능한 역사적 `.bak-*` 부팅 스크립트를 활성 부팅 디렉터리 밖으로 격리
- 활성 부팅 스크립트에는 `termux-wake-unlock`이 남아 있지 않음
- 서버폰 Tailscale 배터리 정책을 `최적화`에서 `제한 없음`으로 변경

다만 이 관측만으로 각각의 변경이 단독으로 원인이었다고 100% 확정하지는 않는다. 현재 판정은 장시간 안정화와의 강한 상관 증거이다.

## 판정

**3시간 46분 soak: PASS**

- 메인 SSH/notify 터널 연속 생존
- 서버 runit 서비스 5종 동일 세대 연속 생존
- core HTTP 200
- engine HTTP 200
- 이전 약 11분 재소실 패턴 미재현

다음 단계는 수정 없이 더 긴 soak를 지속해 장기 안정성을 확인하는 것이다.
