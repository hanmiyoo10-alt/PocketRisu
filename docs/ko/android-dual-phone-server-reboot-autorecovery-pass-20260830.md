# Android 듀얼폰 서버폰 재부팅 자동복구 PASS — 2026-08-30

서버폰 재부팅 뒤 Termux:Boot 및 PocketRisu/local bridge 원격 경로가 실제로 자동 복구된 시도를 별도 기록합니다.

## 재부팅 전 진단 경과

앞선 두 번의 재부팅에서는 서버폰 Tailscale 경로에는 도달했지만 TCP 8022가 `Connection refused`였고, 메인폰 SSH tunnel이 재시작 루프에 빠졌습니다. Termux를 수동으로 연 직후에는 서버 runit 서비스들이 약 2초 age로 한꺼번에 올라와, 부팅 자동기동이 실패한 것으로 확인됐습니다.

Termux:Boot 설치/활성/receiver 상태, 공식 초기 1회 실행 조건, Samsung 배터리 제한 상태를 점검했지만 단독 원인으로 확정되지 않았습니다. 이후 Termux:Boot 실제 스크립트 실행 여부를 분리하기 위해 임시 `00-boot-probe`를 추가하고 기존 marker를 제거한 뒤 서버폰을 다시 재부팅했습니다.

## 메인폰에서 확인한 자동복구

서버폰의 Termux/Termux:Boot/PocketRisu를 수동으로 열지 않은 상태에서 메인폰에서 다음이 확인됐습니다.

- 기존 메인폰 전용 정상복구 알림 `서버 연결이 정상입니다` 자동 발생
- `pocketrisu-ssh-tunnel` 약 242초 동일 PID 안정 run
- `pocketrisu-notify-tunnel` 약 247초 동일 PID 안정 run
- `pocketrisu-notify-relay` 장시간 안정 run
- `pocketrisu-reconnect-watch` 장시간 안정 run
- localhost PocketRisu core health HTTP 200
- localhost bridge engine health HTTP 200

따라서 이번 시도에서는 서버 Tailscale reachability, 서버 sshd, 메인 SSH tunnel, PocketRisu core, local bridge engine까지 메인폰에서 관찰 가능한 end-to-end 재부팅 자동복구 경로를 PASS로 판정합니다.

## Termux:Boot 실제 실행 증거

자동복구 PASS를 메인폰에서 먼저 확인한 뒤 서버폰 Termux를 열어 marker를 검사했습니다.

- `BOOT_PROBE_MARKER=PRESENT`
- marker 내용에 `boot_probe_ran=1`
- marker 기록 시각: `2026-08-30T04:47:20+0900`

따라서 이번 부팅에서 Termux:Boot가 실제로 `~/.termux/boot` 아래 스크립트를 실행했다는 것이 확정됩니다.

Termux를 연 직후 `sshd`, `pocketrisu`, `local-usage-runtime-manager`, `local-usage-runtime-engine`, `llmgateway-bridge`의 표시 age가 모두 약 2초로 갱신됐습니다. 이는 shell 시작 시 `$PREFIX/etc/profile.d/start-services.sh`가 다시 실행되는 현재 구조 때문에 수동 Termux 오픈 뒤 상태가 오염된 것으로 해석하며, 부팅 자동복구 실패 증거로 사용하지 않습니다. 수동 오픈 전에 이미 메인 SSH/notify tunnel과 core/engine HTTP 200이 수 분간 안정적으로 확인됐기 때문입니다.

## 현재 판정

- Termux:Boot 실제 boot script 실행: PASS
- 서버 Tailscale 재부팅 자동 연결: PASS
- 서버 sshd 원격 접근 자동복구: PASS
- 메인 SSH/notify tunnel 자동복구: PASS
- PocketRisu core 원격 health: PASS
- local bridge engine 원격 health: PASS
- 메인폰 기존 정상복구 알림: PASS

성공 원인을 `00-boot-probe` 자체로 단정하지 않습니다. probe는 단순 marker 기록만 하며 서비스를 직접 시작하지 않습니다. 이전 실패와 이번 성공의 차이가 부팅/JobScheduler 타이밍인지 다른 요인인지는 별도 반복 검증이 필요할 수 있습니다.

다음 단계는 서버폰에서 bridge 영구 설정이 재부팅 뒤에도 유지됐는지 INSPECT_ONLY로 확인하는 것입니다. engine run SHA/env, manager SHA/version, 실제 engine process env, authenticated live APIs, circuit 상태를 확인한 뒤 임시 probe를 정리합니다.

정확한 Tailscale 주소, 계정 정보, 인증 토큰 등 비밀/식별 정보는 기록하지 않습니다.
