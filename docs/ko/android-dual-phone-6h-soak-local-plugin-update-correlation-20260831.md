# Android 듀얼폰 6시간 soak 중 local plugin update 재기동 분류 (2026-08-31)

## 배경

wake-lock 계측/2회 요청 boot script 적용 후 장기 soak를 진행했습니다.

`post_core_wait=2026-08-30T21:17:43+0900` 기준 `2026-08-31T03:49:52+0900` 검사 시점은 약 6시간 32분 경과입니다.

## 6시간+ 검사 결과

메인폰:

- `pocketrisu-ssh-tunnel`: PID `24548`, age 약 `23542s`
- `pocketrisu-notify-tunnel`: PID `24411`, age 약 `23549s`
- forwarded PocketRisu core: HTTP `200`
- forwarded local-usage engine: HTTP `200`

서버폰 direct SSH 검사:

- sshd PID `12440`, age 약 `23543s`
- PocketRisu PID `12448`, age 약 `23543s`
- llmgateway-bridge PID `12438`, age 약 `23543s`
- local-usage-runtime-manager PID `29392`, age 약 `2782s`
- local-usage-runtime-engine PID `29478`, age 약 `2778s`
- server core HTTP `200`
- server engine HTTP `200`
- direct SSH: `ssh_rc=0`, `CLASS=DIRECT_SSH_OK`
- boot wake-lock marker는 `phase=post_core_wait`, `rc=0` 유지

따라서 whole Termux/runit/sshd/backend 소실 패턴은 약 6시간 32분 동안 재현되지 않았고, whole-backend 생존 기준은 PASS입니다.

## manager + engine PID 변경 원인

사용자가 검사 사이 구간에 **local plugin 버전을 업데이트했다고 확인**했습니다.

manager와 engine이 거의 같은 시각대에 함께 새 PID로 올라온 것은 이 local plugin update에 따른 runtime lifecycle/restart와 일치합니다.

동시에 다음 프로세스들은 그대로 유지되었습니다.

- sshd `12440`
- PocketRisu `12448`
- llmgateway-bridge `12438`
- 메인 SSH tunnel `24548`
- 메인 notify tunnel `24411`

또한 core/engine health와 direct SSH는 모두 정상입니다.

따라서 이번 manager/engine PID 변경은 whole Termux/runit 소실이나 wake-lock 실패 증거로 분류하지 않고, **사용자에 의해 수행된 local plugin version update에 수반된 local-usage runtime 재기동**으로 분류합니다.

정확한 plugin private data, 인증정보, token, private endpoint는 기록하지 않습니다.
