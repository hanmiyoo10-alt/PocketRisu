# Android 듀얼폰 Termux wake lock 명령 구현 검사 — 2026-08-30

## 배경

persistent wake lock용 Termux:Boot 스크립트를 적용한 뒤 재부팅 직후에는 sshd/PocketRisu/local-usage 원격 경로가 정상 복구되었지만, 이후 soak 중 다시 전체 Termux/runit 서비스층이 사라지는 장애가 재현되었습니다.

실패 상태에서 메인폰 direct SSH는 `Connection refused`였고, 서버폰에서 Termux를 다시 열자 `runsvdir`, sshd, PocketRisu, local-usage manager/engine, llmgateway bridge가 모두 약 1초 age로 동시에 재구성되었습니다. boot script SHA는 persistent wake lock 패치값 그대로였고 boot probe도 실제 부팅 시각에 실행되어 Termux:Boot 자체는 실행된 것으로 확인되었습니다.

이후 수동 wake lock을 아직 다시 걸지 않은 상태에서 `termux-wake-lock` 구현과 power-state 확인 가능 여부를 INSPECT_ONLY로 확인했습니다.

## termux-wake-lock 구현

`termux-wake-lock` 경로:

`/data/data/com.termux/files/usr/bin/termux-wake-lock`

파일은 약 398바이트의 shell script이며 핵심 동작은 다음과 같습니다.

- 인자 없이 실행
- `TERMUX__USER_ID`를 정규화
- Android activity manager의 `am startservice` 호출
- action: `com.termux.service_wake_lock`
- component: `com.termux/com.termux.app.TermuxService`

즉 `termux-wake-lock` 자체가 kernel wake lock을 직접 다루는 바이너리가 아니라, Termux Android app service에 wake-lock action을 전달하는 wrapper입니다.

## 현재 boot script의 관측 한계

현재 persistent wake lock boot script는 다음 형태로 호출합니다.

`termux-wake-lock >/dev/null 2>&1 || true`

따라서 부팅 당시 `am startservice`가 성공했는지, Android가 service start를 거부했는지, 어떤 stderr를 반환했는지 모두 버려집니다. `|| true` 때문에 실패해도 boot script 전체는 정상 진행합니다.

따라서 현재까지 확인된 사실은 **부팅 스크립트가 wake lock 명령을 호출하도록 작성되어 있다**는 것뿐이며, 실제 부팅 시 wake lock 획득 성공 여부는 아직 독립적으로 증명되지 않았습니다.

## 현재 Termux runtime 기준점

Termux를 다시 연 직후 runit stack이 재구성된 상태에서, 수동 `termux-wake-lock`을 아직 실행하지 않은 기준점을 유지했습니다.

관찰된 Termux UID 프로세스에는 bash, runsvdir, 여러 Node 서비스, sshd-session 등이 존재했습니다. 이는 Termux UI 오픈 후 backend stack이 재구성된 상태와 일치합니다.

## dumpsys 확인

Termux PATH에서 `dumpsys`는 `NOT_FOUND`였습니다. 따라서 이번 검사에서는 `dumpsys power`를 통해 Android wake lock 목록을 직접 확인하지 못했습니다.

이는 wake lock이 없다는 뜻이 아니라, 현재 Termux PATH 기반 검사 경로로 `dumpsys`를 실행하지 못했다는 뜻입니다. 다음 단계에서는 `/system/bin/dumpsys` 등 Android system binary의 직접 접근 가능 여부를 읽기 전용으로 확인하거나, 수동 `am startservice` 호출의 반환코드/출력을 보존해 wake lock 요청 성공 여부를 비교합니다.

## 현재 판정

1. Termux:Boot는 실행됨
2. boot script 파일은 persistent wake lock 패치 상태 그대로 유지됨
3. `termux-wake-lock`은 `am startservice` wrapper임
4. 현재 boot script는 wake lock 요청의 성공/실패 증거를 남기지 않음
5. 따라서 soak 실패만으로 `wake lock을 확실히 유지하고 있었는데도 Termux stack이 죽었다`고 단정할 수 없음
6. 다음 단계는 수동 wake-lock 요청의 실제 반환값을 보존하고, 가능한 경우 Android system service 상태를 읽기 전용으로 비교하는 것

정확한 Tailscale 주소, 인증 토큰 등 비밀/식별 정보는 기록하지 않습니다.
