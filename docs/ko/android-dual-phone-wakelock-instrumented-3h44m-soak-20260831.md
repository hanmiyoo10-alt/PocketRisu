# Android 듀얼폰 wake-lock 계측 부팅 장기 soak — 3시간 44분 체크포인트 PASS (2026-08-31)

## 배경

서버폰의 계측/2회 wake-lock 요청 boot script는 controlled reboot에서 다음을 이미 확인했습니다.

- `boot_initial rc=0`
- `core_ready=1`, `iterations=6`
- `post_core_wait rc=0`
- 서버폰 Termux UI를 직접 열지 않은 상태에서 전체 remote-path 자동복구 PASS
- 약 100분 whole backend 생존 PASS

이 문서는 그 뒤 장기 soak 체크포인트를 기록합니다.

## 기준 시각

`~/.termux/boot-wakelock-last`:

```text
time=2026-08-30T21:17:43+0900
phase=post_core_wait
rc=0
```

검사 시각:

- 메인폰: `2026-08-31T01:01:37+0900`
- 서버폰 direct SSH 내부 시각: `2026-08-31T01:01:37+0900`

따라서 `post_core_wait` 기준 경과시간은 약 3시간 43분 54초입니다.

## 메인폰 상태

- `pocketrisu-ssh-tunnel`: PID `24548`, age `13447s`
- `pocketrisu-notify-tunnel`: PID `24411`, age `13454s`
- forwarded PocketRisu core: HTTP `200`
- forwarded local-usage engine: HTTP `200`

초기/100분 체크와 같은 tunnel PID가 유지되고 있습니다.

## 서버폰 상태 — direct SSH INSPECT_ONLY

- sshd: PID `12440`, age `13448s`
- pocketrisu: PID `12448`, age `13448s`
- local-usage-runtime-engine: PID `12449`, age `13448s`
- llmgateway-bridge: PID `12438`, age `13448s`
- local-usage-runtime-manager: PID `6385`, age `9391s`
- server core: HTTP `200`
- server engine: HTTP `200`
- direct SSH: `ssh_rc=0`, `CLASS=DIRECT_SSH_OK`

`sshd`, `pocketrisu`, engine, bridge는 부팅 직후부터 같은 PID로 연속 생존했습니다.

manager PID `6385`는 별도 조사에서 `2026-08-30 22:25` successful manager self-update `/sync` 뒤 의도적인 `process.exit(0)` 및 runit 재기동으로 분류되었습니다. 따라서 이 PID 변경은 whole Termux/runit 소실이나 wake-lock soak 실패 증거로 보지 않습니다.

## 판정

**계측/2회 wake-lock 요청 boot 구성의 약 3시간 44분 whole-backend 장기 soak는 PASS입니다.**

근거:

- 서버폰 Termux UI를 직접 열지 않음
- main SSH/notify tunnel 지속 생존
- forwarded core/engine HTTP 200
- direct server SSH 8022 성공
- sshd/PocketRisu/engine/bridge의 핵심 PID가 부팅 직후부터 동일하게 유지
- 이전에 문제였던 whole Termux/runit/sshd 소실 패턴이 약 3시간 44분 시점까지 재현되지 않음

단, `termux-wake-lock` wrapper의 `rc=0`은 wake-lock service start 요청이 정상 전달되었다는 증거이며, Android wake lock 객체가 전체 3시간 44분 동안 연속 held 상태였음을 직접 읽은 것은 아닙니다. 장기 backend 생존 결과와 함께 해석합니다.

## 다음 단계

`post_core_wait=2026-08-30T21:17:43+0900` 기준 약 6시간 시점인 `2026-08-31 03:17:43 +0900` 이후 최종 체크를 수행합니다. 그때까지 서버폰 Termux UI를 열거나 `termux-wake-unlock`을 실행하지 않고 현재 상태를 보존합니다.

응답 알림/Discord/Web Push 전환 작업은 사용자 요청으로 현재 보류 상태이며, 이 soak 검증과 섞지 않습니다.

정확한 Tailscale 주소, 인증정보, 토큰 등 비밀/식별 정보는 기록하지 않습니다.
