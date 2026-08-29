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

## 재부팅 후 Tailscale 경로 INSPECT_ONLY — 2026-08-29

Tailscale 앱을 수동으로 열거나 터널 서비스를 수동 재시작하지 않은 상태에서 추가 검사했습니다.

- core/notify 서비스의 예상 로그 경로에서는 `current` 로그 파일을 찾지 못함
- Termux에서 `pidof com.tailscale.ipn` 결과는 비어 있었고 `ps -A`에서도 Tailscale 프로세스가 보이지 않았음
- 이 결과만으로 Android 시스템의 Tailscale VPN 비활성 상태를 절대적으로 증명하지는 않음. Android/Termux 프로세스 가시성 제한 가능성을 고려함
- 서버폰의 Tailscale 주소 TCP 8022에 `ssh-keyscan`을 시도했으나 종료코드 1, key 출력 0줄로 실패
- 해당 검사에서 별도 stderr 메시지는 얻지 못함
- 같은 시점 `http://127.0.0.1:6001/api/health`도 계속 연결 실패해 `core_health=FAILED`

이 결과는 재부팅 뒤 runit/Termux 서비스는 올라왔지만 Tailscale 경로를 통한 서버폰 SSH 도달성이 회복되지 않았다는 사실을 추가로 확인합니다. 특히 Tailscale Android VPN이 자동으로 활성화되지 않았을 가능성이 높아졌지만, 메인폰의 일반 인터넷/모바일 데이터 자체가 정상인지 확인하기 전까지 원인을 Tailscale 단독 문제로 확정하지 않습니다.

## 일반 인터넷 정상 / core 미복구 확인 — 2026-08-29

Tailscale 앱을 수동으로 열지 않은 상태에서 메인폰의 일반 인터넷 연결을 별도로 확인했습니다.

- HTTPS 요청은 종료코드 0으로 성공
- Cloudflare endpoint가 HTTP 200을 반환
- 따라서 재부팅 후 메인폰의 일반 인터넷/모바일 데이터 연결 자체는 정상으로 판단
- Termux에는 `getent` 명령이 설치되어 있지 않아 해당 DNS 보조 검사는 실행하지 못했으나, HTTPS 요청이 성공했으므로 이번 판정에는 영향 없음
- 같은 시점 `http://127.0.0.1:6001/api/health`는 계속 `core_health=FAILED`

따라서 현재 실패는 일반 인터넷 부재로 설명되지 않습니다. runit은 core/notify SSH를 재시도하고 있으나, Tailscale 경로만 회복되지 않은 상태와 가장 잘 일치합니다. 재부팅 후 Tailscale Android VPN이 자동 활성화되지 않았을 가능성이 현재 가장 유력합니다.

## Tailscale 앱 열기만으로 즉시 복구 — 2026-08-29

Tailscale 앱을 열기 전에는 일반 인터넷은 정상인 반면 tailnet SSH 도달성과 core health가 실패한 상태였습니다. 이후 사용자가 Tailscale 앱을 **열기만 했고 별도 연결 토글 조작은 하지 않은 상태에서**, 앱 화면이 즉시 나타남과 동시에 PocketRisu reconnect watcher의 `서버 연결 복구` Android 알림도 메인폰에 표시됐습니다.

이 관찰은 다음 순서와 가장 잘 일치합니다.

1. 재부팅 후 Termux:Boot와 runit은 정상 기동
2. core/notify SSH는 Tailscale 경로가 없어 반복 재시도
3. 일반 모바일 데이터/인터넷은 정상
4. Tailscale 앱을 여는 행위가 Android Tailscale VPN/세션 활성화를 촉발
5. tailnet 경로가 살아나자 runit의 다음 SSH 재시도에서 core가 연결됨
6. reconnect watcher가 health 연속 성공을 감지해 메인폰에 복구 알림 표시

따라서 첫 재부팅 자동복구 실패의 원인은 PocketRisu core, SSH runit 재시도, 일반 인터넷 문제가 아니라 **메인폰 Android에서 Tailscale이 재부팅 후 자동으로 활성화되지 않은 것**으로 사실상 확정합니다.

다음 조치 후보는 Android/Tailscale의 항상 켜짐 VPN(Always-on VPN), 백그라운드 실행/배터리 제한 해제 등 재부팅 후 Tailscale VPN 자동 활성화 조건을 점검하는 것입니다. 변경 전에는 현재 설정을 먼저 INSPECT_ONLY로 확인합니다.

## 현재 판단

PocketRisu 측 부팅 자동기동과 runit 재시도 구조는 정상입니다. 실패 지점은 메인폰 Android의 Tailscale 자동 활성화입니다. Tailscale 앱을 수동으로 열면 tailnet과 core가 즉시 복구되고 reconnect watcher 알림까지 정상 동작하므로, PocketRisu/SSH 구성 자체의 추가 수정은 우선 필요하지 않습니다.

현재 단계에서는 PocketRisu 구성 파일을 수정하지 않았습니다.
