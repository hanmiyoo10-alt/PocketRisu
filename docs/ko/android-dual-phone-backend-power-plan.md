# Android 듀얼폰 백엔드 연동 / 전력·발열 최적화 계획

2026-08-29 기준 PocketRisu 듀얼폰 구성의 Tailscale, core, notify reverse tunnel, 메인폰 Android 알림, 메인폰 재부팅 자동복구까지 end-to-end 검증을 완료한 뒤 진행하는 다음 단계 계획입니다.

## 현재 기준 상태

- 메인폰과 서버폰이 서로 다른 실제 네트워크에서도 Tailscale 기반으로 연결됨
- 메인폰 core SSH local forward 정상
- 메인폰 notify SSH reverse forward 정상
- 서버폰 `/api/termux-notify` → 메인폰 Android 알림 전체 경로 정상
- 메인폰 Android `Always-on VPN` 활성화 후 재부팅 시 Tailscale 자동 연결 및 PocketRisu core/notify 자동복구 확인
- `VPN 없이 연결 차단`은 꺼짐
- 메인폰 Tailscale 배터리 설정은 현재 `최적화` 상태에서도 재부팅 검증 통과

## 백엔드 연동 방향

레포의 현재 self-hosting 실사용 서버는 `server/node` 경로입니다. `server/hono`는 향후 Node 서버 대체를 목적으로 개발 중인 구현이며 아직 완전한 실사용 전환 대상으로 보지 않습니다.

따라서 현재 듀얼폰 환경의 백엔드 연동은 다음 원칙으로 진행합니다.

1. 현재 서버폰에서 실제 동작 중인 Node 서버를 기준으로 함
2. 네트워크/Tailscale 구성과 백엔드 코드를 한 번에 바꾸지 않음
3. 서버폰의 현재 `server/node/server.cjs`에는 로컬 작업 트리 변경이 크므로 파일 전체를 덮어쓰거나 원격 `main` 버전으로 교체하지 않음
4. 기존 notify relay 패치와 다른 로컬 개조를 보존한 채 백엔드 관련 변경만 별도로 식별하고 적용
5. 수정 전 INSPECT_ONLY → 백업 → 최소 수정 → 로컬 health/API 검증 → 메인폰 경유 검증 순서를 유지

## 전력·발열 최적화 방향

메인폰과 서버폰의 역할이 다르므로 각각 별도로 측정합니다.

### 메인폰

주요 상시 부하는 Tailscale Android VPN, Termux/runit, core·notify SSH 터널, notify relay, reconnect watcher, Firefox/PocketRisu입니다.

목표:
- Tailscale Always-on 안정성은 유지
- 불필요한 재연결/폴링을 줄여 CPU wakeup 감소
- SSH keepalive와 watcher 주기가 과도한지 측정 후 조정
- Firefox/PocketRisu 전면 사용 시와 대기 시 발열 차이 확인

### 서버폰

주요 상시 부하는 PocketRisu Node 서버, DB/스토리지 작업, local bridge류, sshd, Tailscale입니다.

목표:
- Node 프로세스의 idle CPU 확인
- bridge/보조 서비스의 불필요한 polling 확인
- 로그 과다 기록이나 반복 실패 루프 확인
- 장시간 idle 상태에서 배터리 온도와 충전 중 발열을 분리해 관찰

## Termux 화면 종료와 백그라운드 동작

PocketRisu 듀얼폰 구성은 Termux의 터미널 화면을 계속 열어 둘 필요는 없습니다. 홈으로 이동하거나 화면을 끄는 것은 허용하며, runit/SSH/relay 서비스는 백그라운드에서 계속 동작하도록 구성되어 있습니다.

다만 Android 설정의 `강제 종료`로 Termux 프로세스를 죽이면 Termux 아래에서 동작하는 runit과 관련 서비스도 종료될 수 있으므로 사용하지 않습니다. 최근 앱 화면에서 Termux를 스와이프로 제거하는 동작도 제조사/Android 정책에 따라 백그라운드 프로세스에 영향을 줄 수 있으므로 현재 안정성 검증이 끝나기 전에는 피합니다.

또한 현재 메인폰의 `20-pocketrisu-ssh-tunnel` Termux:Boot 스크립트가 부팅 시 `termux-wake-lock`을 호출하는 것이 확인되어 있습니다. 이 wake lock이 장시간 유지되면 화면이 꺼진 뒤에도 CPU의 깊은 절전 진입을 방해해 배터리 소모와 발열에 영향을 줄 가능성이 있으므로, 전력 최적화에서 우선 점검 대상으로 둡니다. 실제 변경 전에는 현재 wake lock 유지 여부와 서비스 안정성에 미치는 영향을 INSPECT_ONLY로 확인합니다.

## 서버폰 전력 기준값 INSPECT_ONLY — 2026-08-29

서버폰에서 첫 전력/발열 기준값을 수집했습니다.

- 배터리: 4%, 충전 안 됨(`DISCHARGING`)
- 배터리 health: `GOOD`
- 배터리 온도: 37.1°C
- 배터리 전압: 약 3.314 V
- 순간 전류: 약 -675 mA로 보고됨
- 배터리 sysfs와 thermal zone은 Termux 권한/가시성 제한으로 유효한 값을 얻지 못함
- `top -b -n 1` 순간 샘플에서는 전체 CPU가 거의 idle로 보였음
- `pocketrisu`와 `sshd` runit 서비스는 약 58,800초 동안 유지 중
- `server/node/server.cjs`는 약 563 MiB RSS, 누적 CPU 시간 약 81분 14초, `ps` 기준 CPU 약 8%로 관찰됨
- 서비스 uptime과 누적 CPU 시간을 비교하면 `server.cjs`가 장기 평균으로 한 코어의 약 8.3%를 사용한 셈이라 서버폰 대기 전력/발열의 우선 조사 대상으로 판단
- `generic_local_json_bridge.cjs`, local-usage manager/engine, sshd는 같은 시점에서 상대적으로 가벼웠음
- taskbridge coordinator도 장기 누적 CPU 시간이 보여 별도 조사 후보로 남김

현재 배터리가 4%로 매우 낮으므로 이 한 번의 측정만으로 전력 최적화 값을 확정하지 않습니다. 수정 전 `server.cjs`와 보조 프로세스들의 짧은 반복 CPU 샘플을 추가로 수집하고, 이후 더 안정적인 배터리 잔량 조건에서도 비교 측정합니다.

## 서버폰 15초 CPU 재측정 해석 — 2026-08-29

5초 간격 4회, 총 약 15초 동안 `server.cjs`, taskbridge, bridge, sshd 관련 프로세스를 다시 확인했습니다.

- `server/node/server.cjs`의 `ps %CPU` 값은 약 8.2%로 계속 표시됐지만, 누적 CPU 시간 `01:21:14`는 4개 샘플 동안 증가하지 않았음
- 따라서 이 `8.2%`는 해당 15초 구간의 실시간 사용률이 아니라 프로세스 실행 기간 전체를 반영한 누적 평균 성격의 값으로 해석해야 함
- 이번 짧은 샘플 구간에서는 `server.cjs`가 실제로 CPU 시간을 추가 소비하지 않아 사실상 idle 상태였음
- taskbridge coordinator도 누적 CPU 시간 `00:29:53`이 증가하지 않아 같은 구간에서는 idle이었음
- generic bridge와 local-usage manager/engine도 누적 CPU 시간이 변하지 않거나 매우 낮은 수준이었음

따라서 첫 기준값에서 보인 `server.cjs` 장기 평균 CPU만으로 현재 대기 발열의 직접 원인이라고 확정할 수 없습니다. 과거의 실제 사용 구간에서 CPU를 집중 사용했을 가능성과 현재 idle 상태를 분리해 봐야 합니다.

또한 사용자 확인으로 **메인폰과 서버폰 모두 현재 Termux wake lock이 유지 중**인 상태입니다. 양쪽 모두 순간 CPU가 거의 idle인데도 wake lock이 상시 유지된다면 화면-off deep sleep을 제한해 대기 배터리와 발열에 영향을 줄 수 있으므로, 현재 전력 최적화의 우선 조사 항목을 dual-phone wake lock으로 올립니다. 단, 서비스 안정성을 깨지 않도록 즉시 영구 제거하지 않고 먼저 wake lock 요청 위치를 확인한 뒤 한 폰씩 임시 해제 A/B 검증을 수행합니다.

## 서버폰 wake lock 출처 확인 — 2026-08-29

서버폰에서 wake lock 요청 위치를 INSPECT_ONLY로 확인한 결과, `$HOME/.termux/boot/00-pocketrisu-server`의 3번째 줄에서 `termux-wake-lock`을 호출하는 것이 확인됐습니다. 따라서 서버폰 wake lock의 부팅 시 요청 위치는 이 파일로 확정합니다.

같은 검사에서 `$PREFIX/var/service`에 대해 `grep -R`을 실행한 뒤 명령이 끝나지 않는 현상이 발생했습니다. runit 서비스 트리에는 `supervise/control` 등 FIFO/특수 파일이 존재할 수 있어 재귀 grep이 해당 파일을 읽으려다 블록될 가능성이 있으므로, 이후 서비스 트리 검사는 재귀 `grep -R` 대신 `run` 등 일반 파일만 명시적으로 검사하는 방식으로 제한합니다. 이 현상은 서비스 고장으로 보지 않으며, wake lock 해제나 파일 수정도 아직 수행하지 않았습니다.

## 메인폰 전력 기준값 INSPECT_ONLY — 2026-08-29

메인폰에서 첫 전력/발열 기준값을 수집했습니다.

- 배터리: 13%, 충전 안 됨(`DISCHARGING`)
- 배터리 health: `GOOD`
- 배터리 온도: 36.8°C
- 배터리 전압: 약 3.685 V
- 순간 전류: 약 -812 mA
- 평균 전류: 약 -919 mA
- 해당 측정은 화면을 켜고 Termux에서 명령을 실행하는 중이므로 실제 화면-off idle 소비량으로 간주하지 않음
- core SSH local forward, notify SSH reverse forward, notify relay, reconnect watcher는 모두 `run`
- `top`/`ps`에서 두 SSH 터널, `receiver.cjs`, reconnect watcher의 순간 CPU 사용은 사실상 0% 수준
- 메인폰 thermal zone에서 CPU 계열은 대략 46~50°C, GPU/모뎀/기타 SoC 센서는 대략 44~46°C 범위로 관찰됨
- 따라서 이 시점의 발열은 Termux의 PocketRisu 백그라운드 프로세스가 지속적으로 CPU를 많이 쓰는 현상으로는 설명되지 않음
- 화면 켜짐, Android 시스템, Tailscale Always-on, 모바일 모뎀, Firefox/PocketRisu 전면 사용, 그리고 Termux wake lock 영향 등을 분리해서 봐야 함

메인폰 역시 배터리 잔량이 13%로 낮고 화면-on 측정이므로, 현재 전류 수치만으로 장시간 대기 소모를 확정하지 않습니다. 다음 우선 점검은 부팅 스크립트에서 요청한 Termux wake lock이 현재 장시간 유지 중인지 INSPECT_ONLY로 확인하는 것입니다.

## 다음 단계

구성 변경 전 양쪽 폰에서 wake lock 요청 위치를 먼저 INSPECT_ONLY로 확인합니다. 이후 배터리를 충분히 충전한 뒤 한 폰씩 `termux-wake-unlock`을 임시 적용하고 화면-off 상태에서 core/notify/서버 접근 안정성과 배터리·온도 변화를 비교합니다. 임시 해제 검증을 통과한 뒤에만 부팅 스크립트의 wake lock 영구 변경을 백업 후 진행합니다.

정확한 Tailscale 주소, 계정 정보, 토큰 등 비밀/식별 정보는 이 문서에 기록하지 않습니다.
