# Android 듀얼폰 서버폰 wake lock 대체/우회 후보 — 2026-08-30

## 현재 관찰

서버폰에서 임시 `termux-wake-lock`을 유지한 동안에는 이전에 반복되던 완전 단절이 관찰되지 않았습니다. wake lock이 없는 구조에서는 시간이 지나면 메인폰 direct SSH 8022가 `Connection refused`가 되고, 그 뒤 서버폰 Termux를 수동으로 열면 `sshd`, `pocketrisu`, local-usage manager/engine, generic bridge가 모두 짧은 age로 함께 재기동되는 패턴이 확인됐습니다.

따라서 현재 운영상 wake lock은 매우 강한 안정화 수단이지만, 배터리/발열 비용을 줄이기 위해 wake lock 없이 Termux background process 생존성을 확보할 수 있는 대체책을 조사합니다.

## 1순위 후보: Android phantom process killer 비활성화

Termux upstream은 Android 12+에서 phantom process 제한과 excessive CPU process trimming 때문에 Termux가 불안정해질 수 있다고 공식 README에서 경고합니다. Android 14+에는 Developer options의 `Disable child process restrictions` 토글로 해당 phantom-process 감시/trim을 끌 수 있는 경로가 알려져 있으며, 서버폰은 Android 15이므로 적용 가능성을 우선 확인할 가치가 있습니다.

이 후보가 특히 중요한 이유:

- 현재 장애는 `sshd` 단독이 아니라 runit 아래 여러 child process가 함께 사라지는 패턴과 일치
- Termux의 서버형 사용은 다수의 child/phantom process를 장시간 유지하는 구조
- 배터리 `제한 없음`, 절전/초절전 목록 제외 상태에서도 장애가 재현됐으므로 일반 Samsung battery optimization만으로 설명되지 않음
- phantom process killer를 끄는 것은 CPU를 강제로 깨어 있게 하는 wake lock과 작동 원리가 다르므로, 성공하면 대기 전력 측면에서 더 유리할 가능성이 있음

단, 아직 이 서버폰에서 phantom process killer가 실제 원인이라는 직접 증거는 없으므로 즉시 변경하지 않습니다. 먼저 Developer options에 `Disable child process restrictions` 항목이 존재하는지와 현재 상태를 UI에서 INSPECT_ONLY로 확인합니다.

## 2순위: foreground service 기반 supervisor

Android 공식 문서상 foreground service를 호스팅하는 프로세스는 일반 background/cached process보다 높은 중요도로 취급되어 종료 우선순위가 낮아집니다. 장시간 끊기면 안 되는 작업의 정석적인 Android 수명주기 방식입니다.

하지만 foreground service는 사용자에게 보이는 지속 알림이 필요합니다. 현재 PocketRisu 듀얼폰 운영 원칙은 **서버폰에는 Android 알림을 만들지 않고 메인폰만 알림을 담당**하므로, 별도 companion foreground-service 앱/플러그인은 현재 설계 원칙과 충돌합니다. 따라서 기술적으로는 강한 대안이지만 현 프로젝트에서는 우선순위를 낮춥니다.

## 3순위: Doze/battery allowlist

Termux와 Termux:Boot는 이미 Samsung UI에서 배터리 `제한 없음`이고 절전/초절전 앱 목록에도 없습니다. Android의 Doze allowlist는 네트워크/JobScheduler/Alarm 제약 완화에는 도움이 되지만 low-memory/phantom-process kill 자체를 보장해서 막는 장치는 아닙니다.

따라서 추가 device-idle allowlist 확인은 보조 진단으로는 의미가 있지만, 현재 증거상 wake lock의 직접 대체 1순위는 아닙니다.

## 4순위: watchdog/주기적 재기동

Termux 또는 별도 Android 작업이 runit/sshd 사망을 감지해 다시 실행하는 구조도 가능합니다. 하지만 이것은 프로세스 종료를 예방하지 않고 장애 후 복구하는 방식이므로, SSH 8022가 닫혀 있는 시간과 PocketRisu 연결 단절이 생깁니다. 또한 Termux 자체가 죽은 경우 Termux 안의 watchdog은 함께 죽기 때문에 외부 Android component가 필요합니다.

따라서 무중단에 가까운 서버 역할에는 보조책으로만 적합합니다.

## 5순위: root/system init 수준 서비스

root 환경에서 Android init/Magisk service 등으로 Termux UID 밖의 더 강한 생명주기를 확보하는 방식은 이론적으로 가장 강하지만, 시스템 범위가 크고 유지보수/복구 비용도 큽니다. 현재는 비-root 방식으로 충분히 해결 가능성이 있으므로 검토만 남기고 적용 대상에서 제외합니다.

## 현재 권장 순서

1. 현재 임시 wake lock을 유지해 안정 상태를 보존
2. 서버폰 Developer options에서 `Disable child process restrictions` 항목 존재 여부와 현재 ON/OFF만 INSPECT_ONLY 확인
3. 항목이 있고 현재 OFF라면, wake lock을 유지한 상태에서 설정 변경 전 기준점/복구 방법을 기록한 뒤 한 번에 한 변수만 변경
4. phantom-process 제한을 끈 뒤에도 먼저 wake lock을 유지해 기능 이상이 없는지 확인
5. 그 다음 런타임에서만 wake lock을 해제해 화면-off/실사용 A/B 수행
6. wake lock 없이 장시간 안정성이 재현되면 영구 boot script에서 지속 wake lock을 제거하는 방향 검토
7. 실패하면 즉시 wake lock 유지 구조로 복귀

## 참고 근거

- Termux upstream README: Android 12+에서 phantom process 제한 및 excessive CPU process trimming으로 Termux가 불안정할 수 있다고 경고
- Android 14+ 계열: Developer options의 `Disable child process restrictions`로 phantom process monitoring/trim 비활성화 가능 경로가 알려져 있음
- Android 공식 process lifecycle 문서: foreground service process는 일반 background/cached process보다 높은 중요도로 취급됨
- Android 공식 Doze/App Standby 문서: battery optimization/allowlist는 background execution 제약을 완화하지만 장기 프로세스 생존을 보장하는 메커니즘과는 다름

## 서버폰 Developer option 기준점

서버폰에서 Developer options의 `Disable child process restrictions` 항목이 존재하며, 확인 시점에는 **OFF**였습니다. 따라서 지금까지 관찰된 wake-lock 미사용 시 runit/sshd 전체 종료 현상은 child-process 제한이 활성 상태인 조건에서 발생한 것으로 기록합니다.

다음 A/B에서는 다른 변수를 바꾸지 않고 현재 임시 wake lock을 유지한 채 이 옵션만 ON으로 변경합니다. 옵션 변경 직후에는 wake lock을 그대로 둔 상태에서 기능 이상이 없는지 먼저 확인하고, 그 다음 단계에서만 런타임 wake lock을 해제해 장시간 실사용 안정성을 비교합니다. 이 순서로 진행해야 child-process 제한 해제가 wake lock을 실제로 대체할 수 있는지 분리해서 판단할 수 있습니다.

## child-process 제한 해제 후 soak

서버폰에서 `Disable child process restrictions`를 ON으로 바꾼 뒤에도 임시 wake lock은 유지한 채 실사용을 계속했습니다. 사용자는 이후 충분한 시간 동안 PocketRisu를 정상 사용했고 즉시 끊김이나 기능 이상을 관찰하지 않았다고 보고했습니다.

정확한 분 단위 타이머를 두고 잰 soak는 아니므로 이 단계만으로 child-process 제한 해제가 안정성을 만들었다고 판정하지는 않습니다. 다만 **옵션 ON 자체가 현재 PocketRisu/runit/sshd 동작에 즉시 악영향을 주지 않는다는 1단계 확인은 통과**한 것으로 보고, 다음 단계에서만 wake lock을 런타임 해제하여 단일 변수 A/B를 수행할 수 있습니다.

정확한 Tailscale 주소, 계정 정보, 인증 토큰 등 비밀/식별 정보는 기록하지 않습니다.
