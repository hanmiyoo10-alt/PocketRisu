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

## 현재 판단

정적 구성 기준으로는 재부팅 자동복구 조건이 상당 부분 충족되었습니다.

- `runsvdir` 부팅 기동 경로 존재
- core/notify/relay/watcher 모두 `down` 파일 없음
- core/notify SSH 서비스는 foreground 프로세스 종료 시 runit 재기동 대상
- reconnect watcher는 core health 복구 감시와 메인폰 복구 알림 담당

다만 실제 Android 재부팅에서 Tailscale 앱/VPN 준비 순서, Termux:Boot 실행, runit 서비스 자동 기동 및 core/notify 최종 복구가 정상인지 확인하기 전까지 재부팅 복구를 완료 판정하지 않습니다.

다음 단계는 서버폰을 그대로 둔 채 메인폰만 재부팅하고, 수동 `sv up` 없이 다음을 확인하는 것입니다.

1. Tailscale 연결 복구
2. `pocketrisu-ssh-tunnel` 자동 `run`
3. `pocketrisu-notify-tunnel` 자동 `run`
4. `pocketrisu-notify-relay` 자동 `run`
5. `pocketrisu-reconnect-watch` 자동 `run`
6. 메인폰 localhost `6001/api/health` 정상
7. 서버폰 localhost `39120/health` 및 실제 `/api/termux-notify` end-to-end 정상

현재 단계에서는 구성 파일을 수정하지 않았습니다.
