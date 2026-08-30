# Android 듀얼폰 manual wake lock 프로세스 검사 — 2026-08-30

## 목적

persistent wake lock boot 구성의 장기 soak 실패 이후 서버폰 Termux를 다시 연 상태에서 수동 `com.termux.service_wake_lock` 요청을 보낸 뒤, runit/PocketRisu/local-usage stack이 얼마나 연속 유지되는지와 Termux 앱 프로세스 식별 가능 여부를 확인했습니다.

## 현재 안정성 결과

서버폰 Termux를 다시 연 뒤 다음 서비스가 동일 PID를 유지한 채 최신 검사에서 약 `2540~2541s` 연속 run 상태였습니다.

- sshd PID `27587`
- PocketRisu PID `27585`
- local-usage manager PID `27588`
- local-usage engine PID `27590`
- generic bridge PID `27589`

동일 시점 health:

- PocketRisu core: HTTP `200`
- local-usage engine: HTTP `200`

중요하게 `sv status`의 age는 **수동 wake-lock 요청 이후 경과시간이 아니라 Termux 재오픈으로 서비스가 재구성된 시점 이후의 경과시간**입니다. Termux 재오픈은 약 `19:15:16`, 수동 wake-lock 요청과 시점이 맞는 Termux notification 갱신은 약 `19:21:12`, 최신 TermuxActivity 로그는 약 `19:57:36`이므로, 수동 wake-lock 상태의 관찰 시간은 이 최신 시점 기준 약 36분입니다.

따라서 최신 시점까지는 수동 wake-lock 요청 이후 전체 backend stack에 재구성/재시작 흔적이 없습니다. 다만 과거 실패가 더 긴 시간 뒤 발생했으므로 이 결과만으로 장기 PASS를 선언하지 않습니다.

## same-UID 프로세스 검사

이전 검사에서 `PPID`를 shell 변수로 사용해 bash의 readonly 특수변수와 충돌했던 문제를 수정해 다시 수행했습니다.

`uid=10034`로 직접 읽힌 주요 프로세스에는 다음이 포함되었습니다.

- interactive bash PID `27549`, parent PID `27508`
- runsvdir PID `27578`, parent PID `1`
- 각 runsv supervisor 및 sshd/Node child process

특히 bash의 parent PID가 `27508`임은 확인되었지만, `/proc/[0-9]*/status`를 이용한 same-UID 출력 자체에는 PID `27508`이 나타나지 않았습니다.

## `COM.TERMUX CANDIDATES` 검사 결함

`cmdline`에 문자열 `com.termux`가 포함되는지로 앱 프로세스를 찾는 방식은 잘못된 검사였습니다. Termux 내부 실행 파일의 경로가 `/data/data/com.termux/...`이므로 bash, runsvdir, svlogd, node, sshd-session 등 다수의 일반 child process까지 모두 후보로 잡혔습니다.

따라서 해당 출력은 **Termux 앱 프로세스 식별 증거로 사용하지 않습니다.**

## PID 27508 직접 조회와 Android `/proc` 가시성

interactive bash의 부모 PID `27508`을 직접 검사했습니다.

- shell PID: `27549`
- shell이 보고하는 parent PID: `27508`
- `/proc/27508`: `No such file or directory`
- `/system/bin/ps`의 exact PID 조회: PID `27508` 행이 보이지 않음

그러나 같은 검사에서 logcat은 PID `27508`로 다음 TermuxActivity 이벤트를 최신 약 `19:57:36`까지 계속 보여주었습니다.

- `TermuxActivity` visibility/resize 이벤트
- `com.termux` IME/InputMethod 이벤트
- PID `27508` 자체에서 발생한 앱 로그

따라서 `/proc/27508` 미표시는 **PID 27508의 소실 증거로 사용하지 않습니다.** shell의 parent PID가 여전히 `27508`이고 logcat에서 같은 PID의 TermuxActivity 로그가 계속 발생하므로, Android의 `/proc`/process visibility 제한 때문에 해당 앱 프로세스가 이 Termux 셸에서 직접 보이지 않는 상황과 더 잘 맞습니다.

## wake-lock 시점 보조 증거

Termux upstream `TermuxService` 구현상 `ACTION_WAKE_LOCK` 처리 시 partial wake lock과 Wi-Fi lock을 acquire한 뒤 notification을 갱신합니다. 이번 logcat에는 Termux 재오픈 직후 notification과 별도로 약 `19:21:12`에 `com.termux` ongoing notification 갱신이 확인되었고, 이는 사용자가 수동 `com.termux.service_wake_lock` 요청을 수행한 시점과 맞습니다.

다만 release log에 `ACTION_WAKE_LOCK` 또는 `WakeLocks acquired successfully` 자체가 직접 남지 않았고 일반 Termux 권한으로 `dumpsys power`도 DUMP permission 때문에 차단되므로, 이 notification 갱신만으로 lock-held를 독립적으로 100% 증명한다고 표현하지 않습니다. 수동 `am startservice` 요청이 `rc=0`으로 정상 접수된 사실과 이후 장시간 runtime 생존을 함께 실증 근거로 사용합니다.

## 현재 판단

1. manual wake-lock service Intent는 ActivityManager에 정상 접수됨
2. Termux upstream 구현상 해당 action은 partial wake lock/Wi-Fi lock acquire 경로임
3. 수동 요청 후 최신 확인 시점까지 약 36분 동안 backend stack은 동일 PID로 안정 유지
4. core/engine health는 모두 HTTP 200
5. PID `27508`은 `/proc`에서 직접 보이지 않지만 같은 PID의 TermuxActivity logcat 이벤트가 계속 발생하므로 proc 미표시를 프로세스 사망으로 판정하지 않음
6. 정확한 Android kill reason은 아직 미확정
7. 장기 PASS는 아직 아니며 더 긴 background soak가 필요

정확한 Tailscale 주소, 토큰, 계정 정보 등 비밀/식별 정보는 기록하지 않습니다.
