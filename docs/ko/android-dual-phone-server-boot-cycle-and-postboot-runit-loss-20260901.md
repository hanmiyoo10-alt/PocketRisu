# 서버폰 부팅 사이클 및 부팅 후 runit 재소실 증거 (2026-09-01)

## 관측 시각
- 서버폰 Termux를 사용자가 직접 연 시각: 2026-09-01 03:17 KST
- 그보다 앞서 `~/.termux/boot-wakelock.log`에 새 부팅 스크립트 실행 흔적 존재
  - `2026-09-01T02:11:43+0900 phase=boot_initial rc=0`
  - `2026-09-01T02:12:00+0900 phase=core_wait core_ready=1 iterations=6`
  - `2026-09-01T02:12:00+0900 phase=post_core_wait rc=0`
- `~/.termux/boot-wakelock-last` mtime: 2026-09-01 02:12:01 KST

## 의미
- 사용자가 03:17에 Termux UI를 열기 전에 Termux:Boot 스크립트가 02:11~02:12에 새로 실행되었다.
- 단순한 Termux UI 재실행만으로 설명하기 어렵고, 서버폰이 이 시각에 Android 부팅/BOOT_COMPLETED 사이클을 탄 가능성이 매우 높다.
- 다만 `/proc/uptime`은 Android 권한 제한으로 `Permission denied`였으므로 이 출력만으로 Android uptime을 직접 확정할 수는 없다.
- `/proc/uptime` 읽기 실패 뒤 산술식이 출력한 `0d_0h_0m`은 무효값이며 실제 uptime이 아니다.

## 메인폰 터널 타임라인과 상관
- 두 독립 메인 SSH 세션은 2026-09-01 02:07:44~45 KST에 거의 동시에 `Timeout, server ... not responding.`으로 끊어졌다.
- 02:10:33~35 KST부터 두 터널 모두 서버폰 8022에 `Connection refused`를 받기 시작했다.
- 그 약 68~70초 뒤인 02:11:43 KST 서버폰 Termux:Boot `boot_initial`이 실행되었다.
- 따라서 `공통 연결 상실 -> 경로 복귀/8022 거부 -> 서버폰 부팅 후 Termux:Boot 실행`이라는 시간 상관이 강하다.

## 부팅 직후 서비스 기동 증거
- Termux:Boot 스크립트는 02:12:00 KST에 `core_ready=1`을 기록했다.
- 즉 부팅 직후 적어도 PocketRisu core는 localhost health check에 성공할 정도로 실제 기동했다.
- wake-lock wrapper도 `boot_initial`과 `post_core_wait` 모두 `rc=0`을 기록했다.

## 03:17 Termux UI 오픈 직후 상태
`sv status` 결과 모든 주요 서비스 age가 약 1초였다.
- `llmgateway-bridge`: age 1s
- `local-usage-runtime-engine`: age 1s
- `local-usage-runtime-manager`: age 1s
- `pocketrisu`: age 1s
- `sshd`: age 1s

이는 02:12에 기동된 runit/서비스들이 03:17까지 그대로 살아 있었던 상태와 맞지 않는다. 사용자가 Termux UI를 열면서 shell profile의 `start-services.sh`가 service-daemon을 다시 올리고 서비스들을 재구성한 것으로 해석하는 것이 자연스럽다.

## 현재 최선의 사건 모델
1. 2026-08-31 21:53 KST: 첫 공통 네트워크/서버 접근 장애
2. 22:12 KST 전후: 두 메인 SSH 터널 자동 재접속 성공
3. 약 3시간 55분 복구 구간
4. 2026-09-01 02:07 KST: 두 독립 SSH 세션이 동시에 서버 응답 상실
5. 02:10 KST: 경로는 다시 보이지만 서버폰 8022는 `Connection refused`
6. 02:11:43~02:12:00 KST: 서버폰 Termux:Boot 스크립트 재실행, core health 성공
7. 이후 어느 시점에 Termux/runit 계층이 다시 소실
8. 03:17 KST: 사용자가 서버폰 Termux UI를 열자 주요 runit 서비스가 age 1s로 재구성

## 아직 미확정인 점
- 실제 Android reboot의 boot reason
- 02:12 부팅 직후 sshd가 정상적으로 외부에서 접근 가능했는지
- 02:12 이후 runit/Termux가 다시 사라진 정확한 시각과 원인
- Samsung 자동 재시작/Device Care 정책 개입 여부
- wake-lock이 서비스 소실 전까지 실제로 지속 보유되었는지

## 다음 검사 원칙
- 수정 없이 INSPECT_ONLY 유지
- 서버폰 Android boot reason/property와 Samsung 자동 재시작 관련 설정을 먼저 확인
- 이후 sshd persistent logger/서비스 로그에서 02:11~02:12 부팅 직후 상태를 확인
- 서버폰에는 Android 알림을 만들지 않음
- PRIVATE IP/토큰은 저장소에 기록하지 않음
