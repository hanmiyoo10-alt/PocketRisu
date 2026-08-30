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

## 약 100분 instrumented boot soak 최종 결과: PASS

단순화한 검사 블록으로 `2026-08-30T22:57:48~49+0900`에 다시 확인했습니다. `post_core_wait=2026-08-30T21:17:43+0900` 기준 약 `6005초`, 즉 약 `100분` 경과 시점입니다.

메인폰:

- `pocketrisu-ssh-tunnel`: PID `24548`, age `6019s`
- `pocketrisu-notify-tunnel`: PID `24411`, age `6026s`
- forwarded PocketRisu core: HTTP `200`
- forwarded local-usage engine: HTTP `200`

메인폰 direct SSH를 통한 서버폰 상태:

- sshd PID `12440`, age `6020s`
- pocketrisu PID `12448`, age `6020s`
- local-usage-runtime-engine PID `12449`, age `6020s`
- llmgateway-bridge PID `12438`, age `6020s`
- local-usage-runtime-manager PID `6385`, age `1963s`
- `~/.termux/boot-wakelock-last`: `phase=post_core_wait`, `rc=0`, `time=2026-08-30T21:17:43+0900`
- server core HTTP `200`
- server engine HTTP `200`
- direct SSH: `ssh_rc=0`, `CLASS=DIRECT_SSH_OK`

따라서 이번 목표였던 **whole Termux/runit/sshd/backend 생존 기준에서는 약 100분 soak PASS**입니다. 서버폰 Termux UI를 직접 열지 않은 상태에서 sshd, PocketRisu, engine, bridge가 부팅 직후부터 약 100분 연속 생존했고, core/engine 및 direct SSH도 정상입니다.

다만 `local-usage-runtime-manager`만 초기 PID `12434`에서 `6385`로 바뀌어 중간 재시작이 있었습니다. 이는 whole Termux/runit 소실 패턴과는 다릅니다. engine/bridge/sshd/PocketRisu는 같은 PID로 계속 생존했고 health도 정상입니다. 과거에 확인한 manager 자체의 runit 재시작 경로와 관련될 가능성은 있으나, 이번 기록에서는 원인을 확정하지 않고 별도 로그 확인 대상으로 남깁니다.

## manager 단독 재시작 1차 inspection

메인폰 direct SSH를 통해 `local-usage-runtime-manager` 서비스의 로그 경로와 run 파일을 INSPECT_ONLY로 확인했습니다.

결과:

- 현재 manager: PID `6385`, age 약 `2424s`
- manager run 파일 SHA256: `43efff83c20907a0fe4c9223f2d1be575df675a595a92a4822ecf053d8c629ec`
- run 파일은 `LUD_MANAGER_RESTART_MODE=runit`을 export
- run 파일은 `exec "$PREFIX/bin/node" "$HOME/.local/share/local-usage-dashboard/runtime/bridge-manager.cjs"` 형태
- 예상한 runit log 후보 3개는 모두 없음
  - `$PREFIX/var/log/local-usage-runtime-manager/current`
  - `$PREFIX/var/service/local-usage-runtime-manager/log/main/current`
  - `$PREFIX/var/service/local-usage-runtime-manager/log/current`
- direct SSH inspection 자체는 `ssh_rc=0`

`$PREFIX/var/service/local-usage-runtime-manager/log`에 대해 별도 `ls -ld` 출력이 확인되지 않았고, `readlink -f`는 경로 문자열만 반환했습니다. 따라서 현재 단계에서는 manager용 runit logger가 실제 구성되어 있다고 보지 않습니다.

## manager FD / exit-path inspection

추가 INSPECT_ONLY 결과:

- manager PID `6385`, age 약 `2614s`
- service top level에는 `run`과 `supervise/`만 있고 `log`, `down`은 없음
- `supervise/` 디렉터리 시각은 `2026-08-30 22:25` 계열로 표시됨
- manager PID `6385`의 stdio:
  - fd0: `/dev/null`
  - fd1: `/dev/null`
  - fd2: `/dev/null`
- process status: `node-MainThread`, sleeping, PPid `12421`, Threads `7`
- runtime 파일은 `bridge-engine.mjs`, `bridge-manager.cjs`, 기존 backup들, `engine-adopted.json`
- manager 코드에는 `process.exit`, `restart`, `SIGTERM`, 여러 파일 쓰기 경로가 존재함
- 현재 manager status는 계속 run
- direct SSH inspection은 `ssh_rc=0`

이 결과로 **과거 manager 종료 원인을 stdout/stderr 로그에서 복원할 수 없다는 점이 확정**되었습니다. manager service는 별도 runit logger가 없고 stdout/stderr를 `/dev/null`로 버립니다.

`supervise/` 시각과 현재 PID age는 manager가 약 22:25 전후에 runit에 의해 다시 올라온 정황과 맞지만, 이 시각 정보만으로 실제 종료 원인이나 어떤 코드 경로가 `process.exit`을 호출했는지는 확정하지 않습니다.

코드 힌트상 다음 구간을 좁게 읽어 의도적 self-restart 경로와 오류 종료 경로를 분리해야 합니다.

- 약 230~295: `process.exit`, `LUD_MANAGER_RESTART_MODE`, restart 관련 분기
- 약 700~765: restart 관련 분기, console output, `process.exit`
- 필요한 경우 SIGTERM 처리 구간도 별도 확인

whole Termux/runit 소실과 manager 단독 runit 재기동은 계속 분리해 진단합니다.

## 현재 결론

- 계측/2회 wake-lock 요청 boot script는 실제 reboot에서 실행됨
- `boot_initial rc=0`
- core 준비 성공: `core_ready=1`, `iterations=6`
- `post_core_wait rc=0`
- 재부팅 직후 전체 remote-path 자동복구 PASS
- `post_core_wait` 기준 약 100분 뒤에도 whole backend 생존 PASS
- 이전의 whole Termux/runit/sshd 소실 패턴은 이번 약 100분 soak에서는 재현되지 않음
- 단, Android wake lock의 held 상태 자체를 직접 읽은 것은 아니므로 "wake lock이 100분 내내 held였다"고 단정하지 않음
- manager 단독 재시작 1회는 확인됨
- manager stdout/stderr 로그는 `/dev/null`이라 과거 종료 원인을 직접 복원할 수 없음
- manager 재시작 원인은 아직 미확정이며 코드의 좁은 restart/exit 경로 inspection이 다음 단계

정확한 Tailscale 주소, 인증정보, 토큰 등 비밀/식별 정보는 기록하지 않습니다.
