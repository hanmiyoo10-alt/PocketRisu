# Android 듀얼폰 wake-lock 계측 패치 재부팅 — 검증 기록 (2026-08-30)

## 배경

서버폰의 `~/.termux/boot/00-pocketrisu-server`에 다음 계측/보강을 적용한 뒤 controlled reboot를 수행했습니다.

- 부팅 직후 `boot_initial` wake-lock 요청 및 rc/시각 로깅
- PocketRisu core 준비 대기 결과(`core_ready`, `iterations`) 로깅
- core 준비 대기 종료 뒤 `post_core_wait` wake-lock 재요청 및 rc/시각 로깅

재부팅 전 wake-lock marker 파일은 존재하지 않았으므로, 이번에 생성된 marker/log는 이 reboot에서 생긴 증거로 분리할 수 있습니다.

## 재부팅 후 전체 remote-path 자동복구: PASS

서버폰 Termux 앱을 열지 않은 상태에서 메인폰에서 원격 경로를 검사했습니다.

초기 결과:

- `pocketrisu-ssh-tunnel`: PID `24548`, age 약 `264s`
- `pocketrisu-notify-tunnel`: PID `24411`, age 약 `271s`
- forwarded PocketRisu core: HTTP `200`
- forwarded local-usage engine: HTTP `200`

직전 direct SSH 8022 명령의 종료코드를 바로 보존해 확인한 결과:

- `ssh_rc=0`
- `CLASS=DIRECT_SSH_OK`

따라서 서버폰 Termux를 직접 열지 않은 상태에서 다음이 모두 성립합니다.

- main SSH tunnel: PASS
- main notify tunnel: PASS
- forwarded core: HTTP 200
- forwarded engine: HTTP 200
- direct SSH 8022: PASS

즉 **wake-lock 계측/2회 요청 패치가 적용된 첫 controlled reboot에서 전체 remote-path 자동복구는 PASS**입니다.

## boot wake-lock 계측 결과

메인폰 direct SSH를 이용해 서버폰의 로컬 계측 파일을 읽었습니다.

현재 boot script SHA256:

- `cfc8f89af4f6b564a3c359a5e1afea7c69e64ab2635482c78f9dde66504865ce`

boot probe:

- `boot_probe_ran=1`
- `time=2026-08-30T21:17:26+0900`

`~/.termux/boot-wakelock.log`:

```text
time=2026-08-30T21:17:26+0900
phase=boot_initial
rc=0

time=2026-08-30T21:17:43+0900
phase=core_wait
core_ready=1
iterations=6

time=2026-08-30T21:17:43+0900
phase=post_core_wait
rc=0
```

`~/.termux/boot-wakelock-last`:

```text
time=2026-08-30T21:17:43+0900
phase=post_core_wait
rc=0
```

같은 원격 검사 시점에서 서버 서비스 상태:

- sshd PID `12440`, age 약 `574s`
- pocketrisu PID `12448`, age 약 `574s`
- local-usage-runtime-manager PID `12434`, age 약 `575s`
- local-usage-runtime-engine PID `12449`, age 약 `575s`
- llmgateway-bridge PID `12438`, age 약 `575s`
- core HTTP `200`
- engine HTTP `200`
- 원격 검사 ssh 자체도 `ssh_rc=0`

## 해석

1. `boot_initial rc=0`이므로 부팅 직후 1차 `com.termux.service_wake_lock` service start 요청은 ActivityManager에 정상 전달되었습니다.
2. `core_ready=1`, `iterations=6`이므로 PocketRisu core는 boot script의 대기 루프에서 약 17초 뒤 준비 상태에 도달했습니다.
3. 준비 직후 `post_core_wait rc=0`이므로 안정화 뒤 2차 wake-lock service start 요청도 정상 전달되었습니다.
4. 이 시점에서 서버폰 Termux UI를 직접 열지 않았는데도 sshd/PocketRisu/manager/engine/bridge가 모두 정상이고 core/engine도 HTTP 200입니다.
5. 따라서 "boot script 자체가 실행되지 않았다" 또는 "두 wake-lock request가 ActivityManager에 전달되지 않았다"는 가설은 이번 reboot에서는 배제할 수 있습니다.
6. 다만 `rc=0`은 service start 요청 전달 성공의 증거이지, Android wake lock이 이후 장시간 계속 held 상태라는 직접 증명은 아닙니다. 이 부분은 장기 soak에서 backend 생존 여부로 계속 검증해야 합니다.

## 90분 soak 검사 시도 중 붙여넣기 오류

90분 soak 확인용 메인폰 명령을 붙여넣는 과정에서 health 출력 줄의 URL 부분이 중복 삽입되어 shell이 `>` continuation prompt 상태에 들어갔습니다.

이 시도에서 유효하게 실행된 출력은 다음 tunnel 상태까지입니다.

- `pocketrisu-ssh-tunnel`: PID `24548`, age `737s`
- `pocketrisu-notify-tunnel`: PID `24411`, age `744s`

그 이후 `core`, `engine`, direct SSH 및 서버 서비스 상태 블록은 실행 완료되지 않았으므로 이 시도는 **90분 soak 판정에 사용하지 않습니다.** 또한 위 `737s/744s`는 메인 tunnel 프로세스 age이며 wake-lock 또는 boot 경과시간으로 해석하지 않습니다.

현재 shell은 `>` continuation prompt에서 사용자가 Ctrl+C로 취소한 뒤, URL linkification을 피한 단순화된 검사 블록으로 다시 확인해야 합니다.

## 다음 검증

서버폰 Termux를 직접 열거나 `termux-wake-unlock`을 실행하지 않고 상태를 그대로 보존합니다. `post_core_wait` 기준 `2026-08-30T21:17:43+0900`에서 최소 90분 이후 메인폰에서 tunnel 상태, forwarded core/engine, direct SSH를 다시 확인합니다. 90분 기준점은 약 `22:47:43 +0900`입니다.

정확한 Tailscale 주소, 인증정보, 토큰 등 비밀/식별 정보는 기록하지 않습니다.
