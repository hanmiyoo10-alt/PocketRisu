# Android 듀얼폰 manual wake lock 프로세스 검사 — 2026-08-30

## 목적

persistent wake lock boot 구성의 장기 soak 실패 이후 서버폰 Termux를 다시 연 상태에서 수동 `com.termux.service_wake_lock` 요청을 보낸 뒤, runit/PocketRisu/local-usage stack이 얼마나 연속 유지되는지와 Termux 앱 프로세스 식별 가능 여부를 확인했습니다.

## 현재 안정성 결과

수동 wake-lock 요청 이후 다음 서비스가 동일 PID를 유지한 채 약 `2261s`(약 37분 41초) 연속 run 상태였습니다.

- sshd PID `27587`
- PocketRisu PID `27585`
- local-usage manager PID `27588`
- local-usage engine PID `27590`
- generic bridge PID `27589`

동일 시점 health:

- PocketRisu core: HTTP `200`
- local-usage engine: HTTP `200`

따라서 이 시점까지는 수동 wake-lock 요청 후 전체 backend stack에 재구성/재시작 흔적이 없습니다. 다만 과거 실패가 더 긴 시간 뒤 발생했으므로 이 결과만으로 장기 PASS를 선언하지 않습니다.

## same-UID 프로세스 검사

이전 검사에서 `PPID`를 shell 변수로 사용해 bash의 readonly 특수변수와 충돌했던 문제를 수정해 다시 수행했습니다.

`uid=10034`로 직접 읽힌 주요 프로세스에는 다음이 포함되었습니다.

- interactive bash PID `27549`, parent PID `27508`
- runsvdir PID `27578`, parent PID `1`
- 각 runsv supervisor 및 sshd/Node child process

특히 bash의 parent PID가 `27508`임은 확인되었지만, `/proc/[0-9]*/status`를 이용한 same-UID 출력 자체에는 PID `27508`이 나타나지 않았습니다. 따라서 이 검사만으로 PID `27508`의 현재 UID/실체를 단정하지 않습니다.

## `COM.TERMUX CANDIDATES` 검사 결함

`cmdline`에 문자열 `com.termux`가 포함되는지로 앱 프로세스를 찾는 방식은 잘못된 검사였습니다. Termux 내부 실행 파일의 경로가 `/data/data/com.termux/...`이므로 bash, runsvdir, svlogd, node, sshd-session 등 다수의 일반 child process까지 모두 후보로 잡혔습니다.

따라서 해당 출력은 **Termux 앱 프로세스 식별 증거로 사용하지 않습니다.** 다음 검사에서는 PID `27508`을 직접 조회하거나 Android `ps` 출력에서 package process를 별도로 식별해야 합니다.

## 현재 판단

1. manual wake-lock 요청 후 약 37분 이상 backend stack은 같은 PID로 안정 유지 중
2. core/engine health는 모두 HTTP 200
3. `COM.TERMUX CANDIDATES` 결과는 path substring 오탐 때문에 무효
4. bash parent PID `27508`은 확인되지만 PID `27508` 자체의 현재 상태는 별도 직접 조회 필요
5. 장기 PASS는 아직 아님

정확한 Tailscale 주소, 토큰, 계정 정보 등 비밀/식별 정보는 기록하지 않습니다.
