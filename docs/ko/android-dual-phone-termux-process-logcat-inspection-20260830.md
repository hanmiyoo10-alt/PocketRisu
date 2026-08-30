# Android 듀얼폰 Termux app process / logcat 검사 — 2026-08-30

## 배경

persistent wake lock boot script 적용 후 재부팅 직후에는 sshd/core/engine 자동복구가 PASS였지만, 이후 soak 중 다시 core/engine HTTP 000 및 direct SSH 8022 `Connection refused`가 재현되었습니다. 실패 상태에서 서버폰 Termux를 열자 runsvdir와 sshd/PocketRisu/local-usage/bridge가 모두 약 1초 age로 동시에 재구성되었습니다.

수동 `/system/bin/am startservice -a com.termux.service_wake_lock com.termux/com.termux.app.TermuxService` 요청은 rc=0으로 ActivityManager에 접수되었습니다. 일반 Termux UID에서는 `dumpsys power`와 `dumpsys activity`가 `android.permission.DUMP` 부족으로 차단되어 wake lock held 상태를 직접 읽을 수 없습니다.

## 이번 logcat 검사 결과

`logcat -d -v threadtime` 자체는 rc=0으로 읽을 수 있었고 약 1.47 MB / 5462 lines가 확보되었습니다.

주요 관찰:

- 부팅 probe 시각은 18:05:27 +0900이었습니다.
- 18:05:43 및 18:05:44에 PID 13707의 `com.termux`가 notification id 1337을 갱신한 기록이 있습니다.
- 따라서 재부팅 직후 Termux 앱/서비스 프로세스가 실제로 존재했고 foreground notification 경로가 동작한 흔적이 있습니다.
- 실패 후 사용자가 Termux UI를 다시 연 시점인 19:15:16 무렵에는 새 `com.termux` PID 27508이 시작된 로그가 나타납니다.
- 이는 부팅 직후의 `com.termux` PID 13707과 재오픈 후 PID 27508이 서로 다른 프로세스 세대임을 보여 줍니다.
- 기존 단순 grep에서는 `ACTION_WAKE_LOCK`, `WakeLocks acquired successfully`, `onDestroy`, `Process com.termux died` 같은 직접 문자열은 잡히지 않았습니다. Termux 앱 로그 레벨 또는 Android/Samsung의 프로세스 종료 로그 형식 때문에 누락되었을 수 있으므로, 이것을 '정상 종료 없음'의 증거로 사용하지 않습니다.
- 현재 runit 서비스 5개는 동일 PID를 유지하며 age 약 1067초까지 연속 증가했고, local core/engine은 모두 HTTP 200이었습니다.

## upstream TermuxService 구현과의 연결

Termux upstream `TermuxService`는 `ACTION_WAKE_LOCK`을 처리하면 `PowerManager.PARTIAL_WAKE_LOCK`과 Wi-Fi lock을 acquire합니다. wake lock 객체는 `TermuxService` 프로세스 안에 보관되고, service destroy 시 release 경로가 있습니다. 따라서 TermuxService 앱 프로세스가 시스템에 의해 종료되면 그 프로세스가 보유하던 wake lock도 지속될 수 없습니다.

이번 PID 세대 변화는 persistent wake lock 실패를 설명할 수 있는 중요한 후보입니다. 즉 boot script의 wake-lock 요청이 성공했더라도, 그 lock을 소유한 `com.termux`/`TermuxService` 프로세스가 나중에 사라지면 wake lock 역시 사라지고, 별도 Linux child인 runsvdir/sshd/Node 프로세스가 잠시 더 생존한 뒤 이후 함께 사라질 수 있습니다.

다만 현재 증거만으로 Android가 PID 13707을 정확히 언제, 어떤 이유(OOM/phantom process/foreground-service 정책/사용자·시스템 stop 등)로 종료했는지는 확정하지 않습니다.

## 다음 INSPECT_ONLY

다음 검사는 일반 main log buffer의 넓은 grep 대신 Android `events` 및 `system` log buffer에서 PID 13707, 새 PID 27508, UID 10034를 중심으로 `am_proc_start`, `am_proc_died`, `am_kill`, LMK/phantom/process kill 사유를 찾습니다. 또한 `/proc` 기준 현재 동일 UID 프로세스 목록을 읽어 `com.termux` app process 존재 여부를 별도로 확인합니다.

정확한 Tailscale 주소, 인증 토큰, 개인 식별 정보는 기록하지 않습니다.
