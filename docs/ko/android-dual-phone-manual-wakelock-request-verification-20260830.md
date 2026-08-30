# Android 듀얼폰 수동 wake lock 요청 검증 — 2026-08-30

## 배경

persistent wake lock용 Termux:Boot 스크립트는 `termux-wake-lock`을 호출하지만 stdout/stderr를 버리고 `|| true`로 종료 상태를 무시하므로, 부팅 당시 Android wake lock 요청이 실제 성공했는지 증거가 남지 않았습니다.

장기 soak 실패 후 서버폰 Termux를 직접 열었을 때 `runsvdir`, `sshd`, `pocketrisu`, `local-usage-runtime-manager`, `local-usage-runtime-engine`, `llmgateway-bridge`가 모두 약 1초 age로 동시에 재구성되어 전체 Termux/runit 서비스 그룹 소실 패턴이 다시 확인되었습니다.

## `termux-wake-lock` 구현

서버폰의 `/data/data/com.termux/files/usr/bin/termux-wake-lock`은 shell wrapper이며 다음 Android service 요청을 수행합니다.

- `/system/bin/am startservice`
- action: `com.termux.service_wake_lock`
- component: `com.termux/com.termux.app.TermuxService`

`/system/bin/am`, `/system/bin/dumpsys`, `/system/bin/cmd`는 모두 실행 가능한 것으로 확인했습니다.

## 수동 direct wake-lock 요청 결과

Termux를 연 뒤 서비스 5개가 동일 PID로 약 355초 연속 run 중인 상태에서 boot wrapper와 같은 의미의 direct service 요청을 실행했습니다.

후속 확인 결과, 직전 `am startservice`의 실제 종료코드는 다음과 같았습니다.

- `previous_rc=0`
- 보존된 stdout: `Starting service: Intent { act=com.termux.service_wake_lock cmp=com.termux/.app.TermuxService }`

따라서 이전에 출력 말미만 보고 해당 `am startservice`가 미반환 상태라고 해석한 것은 정정합니다. 실제로는 shell prompt로 복귀했고, **ActivityManager가 `com.termux.service_wake_lock` service start 요청을 정상 접수한 것까지는 확인**되었습니다.

다만 `am startservice`의 성공은 service start 요청 접수를 의미하며, TermuxService 내부에서 partial wake lock이 실제로 획득되어 계속 held 상태라는 것까지 직접 증명하지는 않습니다.

## `dumpsys power` 1차 검사

`/system/bin/dumpsys power`는 종료코드 `0`으로 실행되었습니다. 그러나 `com.termux`, `termux`, `wake lock`, `partial`, `held`, `mWakefulness` 등을 grep한 결과 매칭되는 줄이 하나도 나오지 않았습니다.

이 결과만으로 wake lock 부재를 판정하지 않습니다. 가능한 경우는 최소 다음과 같습니다.

- app UID에서 `PowerManagerService` dump 내용이 권한 제한되어 실제 상태가 출력되지 않음
- Samsung/Android 15의 dump 형식이 예상 grep pattern과 다름
- service start 요청은 접수됐지만 실제 wake lock 획득이 이뤄지지 않음

따라서 다음 단계는 `dumpsys power`의 raw 크기와 첫 부분/오류 내용을 직접 확인하고, 동시에 `dumpsys activity services com.termux`에서 TermuxService가 started 상태인지 읽기 전용으로 확인하는 것입니다.

## 수동 요청 후 runtime 상태

수동 wake-lock service 요청 전후로 서비스 재시작은 발생하지 않았습니다. 후속 검사 시 다섯 서비스는 동일 PID로 약 500초 연속 run 중이었고 로컬 health도 정상입니다.

- PocketRisu core: HTTP 200
- local-usage engine: HTTP 200

현재 단계에서는 **수동 wake-lock service 요청 접수 성공**은 확인했지만 **실제 Android partial wake lock held 상태는 아직 미확정**입니다. `termux-wake-unlock`은 실행하지 않습니다.

정확한 Tailscale 주소, 인증 토큰 등 비밀/식별 정보는 기록하지 않습니다.
