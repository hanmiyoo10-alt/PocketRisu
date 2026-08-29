# Android 듀얼폰 부팅/복구 점검 메모

PocketRisu 듀얼폰 구성에서 Tailscale 전환 이후 재부팅 및 자동 복구 동작을 점검한 기록입니다.

## 2026-08-29 메인폰 INSPECT_ONLY

Termux:Boot에는 다음 파일이 존재합니다.

- `00-update-local-stack`
- `05-pocketrisu-boot-trace`
- `20-pocketrisu-ssh-tunnel`

`20-pocketrisu-ssh-tunnel`은 다음 동작을 합니다.

- `termux-wake-lock` 시도
- `start-services.sh`를 source
- `$PREFIX/var/service`를 관리하는 `runsvdir` 존재 여부 확인
- 필요 시 `runsvdir` 직접 기동
- `pocketrisu-ssh-tunnel`에 대해 `sv up` 실행
- `http://127.0.0.1:6001/api/health`를 2초 간격, 최대 45회(약 90초) 확인
- health 성공 시 `tunnel=ready`, 시간 초과 시 `tunnel=timeout` 기록

현재 다음 runit 서비스는 모두 `run` 상태임을 확인했습니다.

- `pocketrisu-ssh-tunnel`
- `pocketrisu-notify-tunnel`
- `pocketrisu-notify-relay`
- `pocketrisu-reconnect-watch`

`pocketrisu-reconnect-watch/run`은 `$HOME/.local/bin/pocketrisu-reconnect-watch`를 실행합니다.

## 2026-08-29 runit 자동기동 / reconnect watcher 추가 확인

다음 네 서비스 모두 서비스 디렉터리에 `down` 파일이 없음을 확인했습니다.

- `pocketrisu-ssh-tunnel`: `down=ABSENT`
- `pocketrisu-notify-tunnel`: `down=ABSENT`
- `pocketrisu-notify-relay`: `down=ABSENT`
- `pocketrisu-reconnect-watch`: `down=ABSENT`

따라서 `$PREFIX/var/service`를 관리하는 `runsvdir`가 시작되면 네 서비스 모두 기본적으로 자동 기동 대상입니다. Termux:Boot 스크립트가 `pocketrisu-ssh-tunnel`만 명시적으로 `sv up`하더라도 notify tunnel, notify relay, reconnect watcher는 `runsvdir` 관리 아래 자동으로 시작될 수 있는 구성입니다.

`$HOME/.local/bin/pocketrisu-reconnect-watch` 본체도 INSPECT_ONLY로 확인했습니다. 이 watcher는 이름과 달리 SSH 서비스를 직접 재시작하지 않습니다.

- `http://127.0.0.1:6001/api/health`를 5초 간격으로 확인
- 연속 2회 실패하면 내부 상태를 `down`으로 전환하고 로그 기록
- 이후 연속 2회 성공하면 `up` 복구로 판단
- 복구 시 메인폰에서 `termux-notification`으로 `PocketRisu 연결 복구` 알림 생성
- 서버폰에는 Android 알림을 생성하지 않음

따라서 실제 SSH 재접속 책임은 watcher가 아니라 runit에 있습니다. core/notify 터널의 `run` 스크립트는 `ssh`를 foreground로 `exec`하므로 네트워크 또는 Tailscale 미준비 상태에서 SSH가 종료되면 runit이 해당 서비스 스크립트를 다시 실행할 수 있는 구조입니다. Tailscale Android VPN이 Termux:Boot보다 늦게 준비되는 경우에도 이 재실행 구조로 복구될 가능성이 높습니다.

## 첫 실제 메인폰 재부팅 관찰 — 2026-08-29

서버폰은 그대로 둔 채 메인폰을 재부팅했습니다. 재부팅 직후 사용자가 의도한 Firefox 선확인보다 Termux 쪽 부팅 동작이 먼저 화면에 나타났고, 그 시점 PocketRisu 접속은 `연결할 수 없음` 상태 및 장시간 로딩으로 관찰됐습니다.

이 관찰만으로는 자동복구 최종 실패를 의미하지 않습니다. 가능한 설명 중 하나는 Termux:Boot/runit이 Tailscale Android VPN 경로가 준비되기 전에 먼저 core SSH 연결을 시도한 부팅 순서 경쟁입니다. 다만 실제 원인은 부팅 로그, 서비스 상태, SSH 프로세스 및 localhost health를 확인하기 전까지 확정하지 않습니다.

따라서 현재 판정은 다음과 같습니다.

- 재부팅 직후 즉시 접속 성공은 확인되지 않음
- 부팅 직후 일정 시간 동안 core 경로가 준비되지 않은 현상은 실제로 관찰됨
- 이후 runit 재시도로 자동 복구됐는지는 아직 미확정
- 구성 수정 전 INSPECT_ONLY로 부팅 로그와 현재 서비스/health 상태를 확인해야 함

## 재부팅 후 로그/health 재확인 — 2026-08-29

재부팅 후 약 3분 이상 경과한 시점에 INSPECT_ONLY로 로그와 서비스 상태를 재확인했습니다.

- Termux:Boot 로그
  - `18:46:22 boot=start`
  - `18:46:23 runsvdir=ready`
  - `18:47:54 tunnel=timeout`
- reconnect watcher 로그
  - `18:46:22 watcher=started`
  - `18:46:27 state=down`
  - 확인 시점까지 `state=up recovered=1` 없음
- `pocketrisu-ssh-tunnel`은 `run` 상태였지만 PID 실행 시간이 수 초 수준으로 짧았음
- `pocketrisu-notify-tunnel`도 `run` 상태였지만 PID 실행 시간이 0초 수준이었음
- `pocketrisu-notify-relay`, `pocketrisu-reconnect-watch` 자체는 계속 `run`
- core SSH 프로세스는 서버폰 Tailscale 목적지를 사용해 실행 중인 순간이 관찰됨
- 그러나 `http://127.0.0.1:6001/api/health`는 즉시 연결 실패했고 `core_health=FAILED`
- notify reverse SSH 프로세스는 같은 검사 시점의 `ps` 출력에 유지된 세션으로 확인되지 않음

이 패턴은 runit 자체가 멈춘 것이 아니라 core/notify SSH 서비스를 반복 재기동하고 있으나 연결이 성립하지 않는 상태와 일치합니다. 즉 정적 runit 자동기동/재시도는 작동하지만, 재부팅 뒤 Tailscale 경로 또는 그 하위 네트워크 도달성이 준비되지 않아 자동복구가 완료되지 않은 것으로 판단합니다.

아직 Tailscale 앱을 수동으로 열거나 서비스를 수동으로 재시작하지 않은 상태에서 원인을 더 확인해야 합니다. 다음 단계는 core/notify runit 로그와 서버폰 Tailscale SSH 목적지 TCP 8022 도달성을 INSPECT_ONLY로 확인하는 것입니다.

## 현재 판단

정적 구성 기준으로 runit 자동기동/재시도는 동작하지만, 첫 실제 재부팅에서는 약 90초 대기 이후에도 core health가 회복되지 않았고 watcher도 down 상태에서 복구되지 않았습니다.

따라서 재부팅 자동복구는 현재 **실패**로 판정합니다. 원인은 아직 Tailscale Android VPN이 재부팅 후 자동으로 올라오지 않은 것인지, 올라왔지만 tailnet 경로가 준비되지 않은 것인지, 또는 다른 네트워크 문제인지 확정하지 않습니다.

현재 단계에서는 구성 파일을 수정하지 않았습니다.
