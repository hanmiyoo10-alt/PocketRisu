# Android 듀얼폰 수동 wake lock soak 및 logcat 추적 — 2026-08-30

## 목적

persistent wake lock용 Termux:Boot 스크립트가 부팅 직후 원격 backend 자동복구에는 성공했지만 장기 soak에서 다시 Termux/runit/sshd 전체 서비스층 소실 패턴이 재현되었습니다. 이후 서버폰 Termux를 직접 열어 서비스 그룹을 재구성한 뒤, boot wrapper와 동일한 `com.termux.service_wake_lock` action을 수동으로 요청하고 런타임 안정성과 Android logcat 흔적을 비교합니다.

## 수동 wake-lock 요청 기준점

서버폰 Termux를 다시 연 직후 `runsvdir`, sshd, PocketRisu, local-usage manager/engine, generic bridge가 모두 새 PID와 낮은 age로 동시에 재구성되었습니다. 그 뒤 `/system/bin/am startservice`로 `com.termux.service_wake_lock` action을 `com.termux/.app.TermuxService`에 직접 전달했습니다.

후속 확인 결과 해당 요청은 정상 반환했습니다.

- ActivityManager 요청 종료코드: `0`
- 출력에 `Starting service: Intent { act=com.termux.service_wake_lock cmp=com.termux/.app.TermuxService }` 확인
- 요청 직후 기존 runit 서비스 PID는 유지
- core / engine health는 HTTP 200

일반 Termux UID에는 `android.permission.DUMP` 권한이 없어 `/system/bin/dumpsys power` 및 `/system/bin/dumpsys activity services com.termux`는 실제 상태를 노출하지 않았습니다. 따라서 비-root Termux 환경에서는 dumpsys만으로 wake lock held 여부를 직접 증명할 수 없습니다.

Termux upstream `TermuxService` 구현에서는 `ACTION_WAKE_LOCK` 처리 시 `PowerManager.PARTIAL_WAKE_LOCK`과 Wi-Fi lock을 acquire하고, 이미 lock이 있으면 중복 획득을 무시합니다. `TermuxService`가 파괴될 때는 해당 wake/wifi lock을 release합니다. 따라서 서비스 프로세스 생존과 wake lock 생존은 연결되어 있습니다.

## logcat 관찰

일반 logcat은 접근 가능했고 약 1.4MB / 5천여 줄을 읽을 수 있었습니다.

부팅 직후에는 `18:05:43` 및 `18:05:44`에 `com.termux` PID `13707`이 foreground notification ID 1337을 연속 갱신한 흔적이 있었습니다. TermuxService는 foreground service 시작 시 notification을 만들고 wake lock acquire 후에도 notification을 갱신하므로, 이 연속 notification은 부팅 시 wake-lock action이 실제 처리되었을 가능성을 지지합니다. 다만 release build log에 `WakeLocks acquired successfully` 같은 내부 debug 문자열이 직접 남지 않았으므로 이것만으로 100% 직접 증명으로 취급하지 않습니다.

이후 실패 상태 보존 후 Termux를 직접 연 시각 `19:15:16`에는 `com.termux`의 새 앱 프로세스 PID `27508`이 시작되어 TermuxActivity lifecycle과 notification 생성이 기록되었습니다. 이는 부팅 시점의 PID `13707`과 재오픈 시점 PID `27508`이 서로 다름을 보여줍니다.

현재 events/system buffer에서는 PID `13707`에 대한 명시적인 `am_kill`, `am_proc_died`, LMKD, phantom-process kill reason을 확보하지 못했습니다. 따라서 정확한 Android kill reason은 아직 미확정입니다.

## same-UID 프로세스 검사 오류

현재 UID 프로세스를 `/proc`에서 열거하려던 검사에서 shell 변수명을 `PPID`로 사용했습니다. Bash에서 `PPID`는 readonly 특수변수이므로 다음 오류로 루프가 즉시 중단되었습니다.

```text
bash: PPID: readonly variable
```

따라서 이 same-UID 프로세스 출력은 무효이며, `PARENT_PID` 같은 일반 변수명으로 다시 검사해야 합니다.

## 수동 wake-lock 상태의 soak 관찰

수동 wake-lock 요청 이후 재검사 시점에 다섯 runit 서비스는 모두 동일 PID를 유지한 채 age 약 `1861s`(약 31분)까지 연속 증가했습니다.

- sshd: same PID, age 약 1861s
- pocketrisu: same PID, age 약 1861s
- local-usage-runtime-manager: same PID, age 약 1861s
- local-usage-runtime-engine: same PID, age 약 1861s
- llmgateway-bridge: same PID, age 약 1861s
- PocketRisu core: HTTP 200
- local-usage engine: HTTP 200

따라서 현재 수동 wake-lock 요청 이후 최소 약 31분 동안에는 이전의 전체 서비스층 소실이 재현되지 않았습니다. 다만 직전 reboot 기반 실패는 약 1시간 이상 지난 뒤 확인되었으므로, 31분만으로 수동 wake-lock 장기 안정성 PASS를 확정하지 않습니다.

## 현재 판정

1. persistent boot 구성은 부팅 직후에는 정상 자동복구됨
2. 장기 soak에서 server Termux/runit/sshd 전체 서비스층이 다시 사라짐
3. Termux를 열자 전체 stack이 새 PID/낮은 age로 재구성됨
4. 수동 `ACTION_WAKE_LOCK` 요청은 ActivityManager에 정상 접수됨
5. 수동 요청 후 약 31분 동안 서비스 5개와 core/engine은 연속 정상
6. 부팅 직후 notification 연속 갱신은 boot wake-lock action 처리 가능성을 지지하지만 직접적인 held 증명은 아님
7. exact Android kill reason은 logcat에서 아직 확보하지 못함
8. same-UID 프로세스 검사는 `PPID` readonly 변수 충돌로 실패했으므로 다시 수행해야 함

다음 단계는 수동 wake-lock을 해제하지 않은 채 same-UID 프로세스 열거를 수정해 현재 `com.termux` 앱/TermuxService 프로세스가 실제로 살아 있는지 확인하고, 충분한 시간의 manual-wakelock soak를 계속 진행하는 것입니다.

정확한 Tailscale 주소, 토큰, 계정 정보 등 비밀/식별 정보는 기록하지 않습니다.
