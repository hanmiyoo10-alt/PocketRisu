# Android 듀얼폰 wake-lock 계측 부팅 — 6시간+ soak 결과 (2026-08-31)

## 체크 시각

- boot `post_core_wait`: `2026-08-30T21:17:43+0900`
- 최종 장기 체크: `2026-08-31T03:49:52+0900`
- 경과: 약 6시간 32분 9초

서버폰 Termux UI는 이 장기 soak 동안 직접 열지 않았고, wake unlock도 수행하지 않았습니다.

## 메인폰 상태

- `pocketrisu-ssh-tunnel`: PID `24548`, age `23542s`
- `pocketrisu-notify-tunnel`: PID `24411`, age `23549s`
- forwarded PocketRisu core: HTTP `200`
- forwarded local-usage engine: HTTP `200`

## direct SSH를 통한 서버폰 상태

- sshd: PID `12440`, age `23543s`
- pocketrisu: PID `12448`, age `23543s`
- local-usage-runtime-manager: PID `29392`, age `2782s`
- local-usage-runtime-engine: PID `29478`, age `2778s`
- llmgateway-bridge: PID `12438`, age `23543s`
- `boot-wakelock-last`: `phase=post_core_wait`, `rc=0`, `time=2026-08-30T21:17:43+0900`
- server core: HTTP `200`
- server engine: HTTP `200`
- direct SSH: `ssh_rc=0`, `CLASS=DIRECT_SSH_OK`

## 6시간+ soak 판정

**whole Termux/runit/sshd/backend 생존 기준 PASS**입니다.

근거:

- sshd PID `12440`이 부팅 직후부터 약 6시간 32분 연속 생존
- PocketRisu PID `12448`도 같은 기간 연속 생존
- llmgateway-bridge PID `12438`도 같은 기간 연속 생존
- 메인 SSH/notify tunnel PID도 유지
- forwarded/server-local core와 engine health 모두 HTTP 200
- direct SSH도 정상

따라서 과거에 반복되던 whole Termux/runit/sshd service-layer 소실 패턴은 이번 instrumented wake-lock boot에서 약 6시간 32분 동안 재현되지 않았습니다.

단, 이 결과는 Android wake lock held 상태를 직접 읽은 증거가 아닙니다. boot script에서 `boot_initial` 및 `post_core_wait` wake-lock 요청이 rc=0이었다는 계측과, 이후 장기 backend 생존 결과를 결합한 경험적 안정성 증거입니다.

## manager + engine 동반 재시작 발견

최종 체크에서 local-usage-runtime-manager와 local-usage-runtime-engine의 PID가 이전 3시간+ 체크와 달라졌습니다.

이전 3시간+ 체크 (`2026-08-31T01:01:37+0900`):

- manager PID `6385`, age `9391s`
- engine PID `12449`, age `13448s`

6시간+ 체크 (`2026-08-31T03:49:52+0900`):

- manager PID `29392`, age `2782s`
- engine PID `29478`, age `2778s`

두 서비스 age 차이가 약 4초이므로 거의 같은 시각에 manager와 engine이 재시작된 정황이 있습니다.

반면 다음 서비스는 같은 PID로 유지되었습니다.

- sshd `12440`
- pocketrisu `12448`
- llmgateway-bridge `12438`

따라서 이 현상은 whole Termux/runit 소실이 아니라 **local-usage runtime 내부 lifecycle 이벤트로 우선 분리**합니다.

이 manager/engine 동반 재시작의 정확한 원인은 아직 확정하지 않습니다. 이전 manager 단독 재시작은 self-update `/sync` → `process.exit(0)` → runit 재기동으로 분류되었지만, 이번에는 engine PID도 함께 변경되었으므로 별도 INSPECT_ONLY 확인이 필요합니다.

## 현재 결론

- instrumented boot wake-lock 요청 계측: 이전에 `boot_initial rc=0`, `post_core_wait rc=0` 확인
- 재부팅 직후 전체 remote-path 자동복구 PASS
- 약 100분 soak PASS
- 약 3시간 44분 soak PASS
- 약 6시간 32분 whole-backend soak PASS
- 과거 whole Termux/runit/sshd 소실 패턴은 6시간+ 동안 재현되지 않음
- manager + engine 동반 재시작은 별도 lifecycle 원인 확인 필요
- Android wake lock continuous-held를 직접 증명한 것으로 과장하지 않음

정확한 Tailscale 주소, 인증정보, 토큰, private endpoint는 기록하지 않습니다.
