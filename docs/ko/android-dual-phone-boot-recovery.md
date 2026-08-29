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

## 현재 판단

현재 실행 상태는 정상입니다. 다만 재부팅 복구를 완료 판정하기 전 다음을 추가로 확인해야 합니다.

1. 위 네 runit 서비스에 `down` 파일이 있는지 여부
2. `$HOME/.local/bin/pocketrisu-reconnect-watch` 본체의 실제 복구 로직
3. Tailscale Android VPN이 Termux:Boot보다 늦게 준비되는 경우 core/notify SSH가 runit 재시도로 자동 복구되는지
4. notify tunnel과 relay가 재부팅 뒤 별도 수동 `sv up` 없이 자동으로 올라오는지

현재 단계에서는 재부팅을 아직 수행하지 않았고, 구성 파일도 수정하지 않았습니다.
