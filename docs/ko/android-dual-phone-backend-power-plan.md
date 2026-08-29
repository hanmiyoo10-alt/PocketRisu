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

## 다음 단계

구성 변경 전 양쪽 폰에서 배터리 상태, 온도, CPU 상위 프로세스, 관련 서비스 상태를 INSPECT_ONLY로 수집합니다. 결과를 바탕으로 실제 소비 원인을 먼저 좁힌 뒤 한 번에 한 항목만 변경하고 재측정합니다.

정확한 Tailscale 주소, 계정 정보, 토큰 등 비밀/식별 정보는 이 문서에 기록하지 않습니다.
