# Android 듀얼폰 manual wake lock soak 중간 체크 — 2026-08-30

## 배경

persistent wake lock boot 구성의 장기 soak 실패 이후 서버폰 Termux를 다시 열고 수동으로 `com.termux.service_wake_lock` 요청을 보낸 상태에서 장시간 안정성을 재검증 중입니다.

## 메인폰 중간 체크 결과

메인폰에서 `MANUAL WAKELOCK 90MIN SOAK CHECK` 블록을 실행한 중간 출력은 다음과 같습니다.

- `pocketrisu-ssh-tunnel`: PID `21582`, age 약 `3083s`
- `pocketrisu-notify-tunnel`: PID `21559`, age 약 `3084s`
- forwarded PocketRisu core: HTTP `200`
- forwarded local-usage engine: HTTP `200`

따라서 이 체크포인트에서 메인 원격 경로와 backend health는 정상입니다.

다만 `3083~3084s`는 메인 tunnel 프로세스 age이며, 이를 수동 wake-lock 자체의 경과시간으로 해석하지 않습니다.

## direct SSH 최종 분류: PASS

직전 direct SSH 8022 명령의 종료코드를 바로 보존해 확인한 결과:

- `ssh_rc=0`
- `CLASS=DIRECT_SSH_OK`

따라서 이 체크포인트에서는 메인 tunnel만 살아 있는 것이 아니라 서버폰 sshd 자체도 port `8022`에서 정상적으로 연결을 수락하고 원격 명령 실행까지 완료했습니다.

현재 체크포인트 판정:

- main SSH tunnel: PASS
- main notify tunnel: PASS
- forwarded core: HTTP 200
- forwarded engine: HTTP 200
- direct SSH 8022: PASS

## soak 시간 판정 정정

수동 wake-lock 요청과 일치하는 Termux notification 갱신 시각은 약 `19:21:12 +0900`이었고, direct SSH PASS를 확인한 현재 시각은 약 `20:24 +0900`입니다. 따라서 이 체크포인트는 수동 wake-lock 이후 약 `63분` 경과 시점입니다.

그러므로 명령 제목에 `90MIN`이 포함되어 있어도 **90분 soak PASS로 선언하지 않습니다.** 90분 기준점은 약 `20:51:12 +0900` 이후입니다.

## 90분 기준 이후 최종 health 체크

약 `20:55 +0900`에 90분 기준을 넘긴 뒤 메인폰에서 다시 확인했습니다. 수동 wake-lock 요청 기준 약 `94분` 경과 시점입니다.

결과:

- `pocketrisu-ssh-tunnel`: PID `21582`, age 약 `5971s`
- `pocketrisu-notify-tunnel`: PID `21559`, age 약 `5972s`
- forwarded PocketRisu core: HTTP `200`
- forwarded local-usage engine: HTTP `200`

따라서 90분 기준 이후에도 메인 tunnel과 backend health는 정상입니다. tunnel age는 wake-lock 자체의 경과시간이 아니지만, PID가 이전 체크포인트와 동일하게 유지되고 있어 메인 측 재시작 흔적도 없습니다.

## 90분 direct SSH 최종 분류: PASS

90분 기준 이후 실행한 direct SSH 8022의 종료코드를 즉시 보존해 확인한 결과:

- `ssh_rc=0`
- `CLASS=DIRECT_SSH_OK`

따라서 90분을 넘긴 시점에도 서버폰 sshd가 실제 port `8022`에서 연결을 수락하고 원격 명령 실행까지 완료했습니다.

## 90분 manual wake-lock A/B 최종 판정

수동 wake-lock 이후 90분을 넘긴 시점에서 다음 조건을 모두 만족했습니다.

- main SSH tunnel: 동일 PID 연속 run
- main notify tunnel: 동일 PID 연속 run
- forwarded PocketRisu core: HTTP `200`
- forwarded local-usage engine: HTTP `200`
- direct SSH 8022: `DIRECT_SSH_OK`
- 이전 whole-Termux/runit/sshd 소실 패턴 미재현

따라서 **수동 wake-lock 90분 A/B는 전체 PASS**로 판정합니다.

이 결과는 persistent wake-lock boot script의 장기 soak 실패와 강하게 대비됩니다. 다만 이것만으로 boot 당시 wake-lock이 처음부터 실패했다고 단정하지 않습니다. 기존 logcat에서는 reboot 직후 `com.termux` foreground notification 갱신이 관찰되어 boot-time TermuxService가 실제로 동작한 정황이 있었고, Termux wake lock은 TermuxService가 소유하므로 해당 서비스/앱 프로세스가 이후 사라질 경우 lock도 함께 소실될 수 있습니다.

따라서 다음 진단의 초점은 `wake lock 자체가 효과가 있는가`가 아니라 다음 차이를 분리하는 것입니다.

1. boot 초기에 `termux-wake-lock` action이 실제 성공했는지와 return/output을 영구 로그로 남기기
2. boot 초반 한 번만 요청한 lock과, Termux UI 재오픈 뒤 안정된 상태에서 수동 요청한 lock의 차이 확인
3. boot 이후 서비스 준비 완료 시점에 idempotent한 두 번째 wake-lock 요청을 넣는 방식의 A/B 검토
4. TermuxService/app process 소실 시 wake lock이 함께 사라지는 구조를 고려한 관측 보강

서버폰 Android 알림을 추가로 생성하는 별도 foreground supervisor 방식은 현재 운영 원칙과 충돌하므로 이 단계에서는 도입하지 않습니다.

정확한 Tailscale 주소, 인증정보, 토큰 등 비밀/식별 정보는 기록하지 않습니다.
