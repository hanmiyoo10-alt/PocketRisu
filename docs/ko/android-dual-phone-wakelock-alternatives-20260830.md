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

## wake lock 해제 직전 안정 기준점

`Disable child process restrictions=ON` 상태에서 wake lock을 계속 유지한 채 최종 기준점을 수집했습니다.

- `runsvdir` PID: `20616`
- `sshd`, `pocketrisu`, `local-usage-runtime-manager`, `local-usage-runtime-engine`, `llmgateway-bridge` 모두 약 `3639s`(약 60분 39초) 동안 동일 PID로 안정 run
- PocketRisu core health HTTP 200
- local bridge engine health HTTP 200

따라서 옵션 ON + wake lock ON 조건은 최소 약 1시간 동안 안정적으로 유지된 것으로 확인했습니다. 다음 단계에서는 파일을 수정하지 않고 런타임 wake lock만 해제하여 `Disable child process restrictions=ON + wake lock=OFF` 조건을 만들고, 실사용/백그라운드 생존성을 비교합니다.

## wake lock OFF A/B 시작

파일이나 runit service 정의는 수정하지 않고 런타임에서 `termux-wake-unlock`만 실행했습니다.

- `termux-wake-unlock` 종료코드: `0`
- 해제 전 `runsvdir` PID: `20616`
- 해제 2초 후 `runsvdir` PID: `20616`으로 동일
- `sshd`, `pocketrisu`, `local-usage-runtime-manager`, `local-usage-runtime-engine`, `llmgateway-bridge`는 모두 기존 PID를 유지했고 service age는 약 `3932s`까지 연속 증가
- wake lock 해제 자체로 supervisor/service 재시작이나 즉시 장애는 발생하지 않음

따라서 현재 A/B 조건은 **`Disable child process restrictions=ON + wake lock=OFF`**로 깨끗하게 시작됐습니다. 서버폰 Termux는 홈으로 백그라운드에 두고 최근 앱에서 제거하지 않으며, 평소 메인폰 PocketRisu 실사용 중 이전과 같은 완전 단절이 재현되는지 관찰합니다. 장애가 다시 발생하면 서버폰 Termux를 열기 전에 메인폰에서 direct SSH 8022 결과를 먼저 확보해 이전 `Connection refused` 패턴과 비교합니다.

## 1차 운영 판정: provisional pass

wake lock을 해제한 뒤에도 `Disable child process restrictions=ON` 조건에서 사용자가 계속 PocketRisu를 정상 실사용하고 있으며, 이전에 wake lock이 없을 때 비교적 짧은 시간 안에 재현되던 완전 단절이 현재까지 다시 나타나지 않았습니다.

따라서 현 시점에서는 이 조합을 **PROVISIONAL PASS**로 판정합니다. 다만 정확한 장시간 soak와 재부팅 후 자동복구/장기 생존 검증이 아직 남아 있으므로 permanent fix로 확정하지 않습니다.

다음 단계는 추가 설정 변경 없이 같은 조건을 몇 시간 더 유지하면서 화면-off와 평소 실사용을 포함해 관찰하는 것입니다. 이후에도 안정적이면 마지막 검증으로 서버폰 재부팅 후 자동복구와 wake lock 없는 장기 생존을 확인합니다. 이 두 단계까지 통과하면 `Disable child process restrictions=ON`을 서버폰의 wake lock 대체 수단으로 채택할 수 있습니다.

## 재부팅 직후 UI 종료 관찰 — 원격 경로는 사용 가능

서버폰을 재부팅한 뒤 Termux UI가 잠시 보였다가 갑자기 사라지는 현상이 관찰됐습니다. 그러나 사용자는 같은 시점에도 메인폰에서 PocketRisu를 계속 사용할 수 있다고 보고했습니다.

이 관찰만으로 Termux 전체 프로세스가 종료됐다고 해석하면 안 됩니다. Android에서는 Activity/UI가 닫히거나 사라져도 별도의 background service/runit child process는 계속 살아 있을 수 있습니다. 오히려 PocketRisu가 실제로 계속 사용 가능한 상태라면 서버 쪽 `sshd`/PocketRisu 경로가 살아 있을 가능성이 높습니다.

따라서 현 시점 판정은 **재부팅 후 UI disappearance가 있었지만 backend survival 가능성이 높음 — 원격 검증 대기**입니다. 서버폰 Termux를 다시 열어 상태를 오염시키지 않고, 메인폰에서 supervised SSH/notify tunnel 상태와 forwarded core/engine health를 먼저 INSPECT_ONLY로 확인합니다. 이 결과가 정상이라면 이번 재부팅은 `Disable child process restrictions=ON + 장기 wake lock 없음` 조건에서 UI와 backend 생명주기가 분리되어 backend가 살아남은 중요한 성공 신호로 기록합니다.

## 재부팅 후 메인폰 원격 검증: PASS

서버폰 Termux UI를 다시 열지 않은 상태에서 메인폰에서 원격 경로를 INSPECT_ONLY로 확인했습니다.

- `pocketrisu-ssh-tunnel`: PID `29315`, 약 `426s` 연속 run
- `pocketrisu-notify-tunnel`: PID `29288`, 약 `430s` 연속 run
- core forwarded health: HTTP `200`
- local bridge engine forwarded health: HTTP `200`

이는 재부팅 뒤 서버폰의 Termux Activity/UI가 사라졌더라도, 서버 쪽 SSH/PocketRisu/bridge backend는 실제로 살아 있고 메인폰 tunnel이 정상 재연결되어 요청을 처리하고 있음을 보여줍니다. 이전 실패에서는 서버 8022가 `Connection refused`가 되고 core/engine이 HTTP `000`으로 떨어졌으므로 이번 상태와 명확히 다릅니다.

따라서 이번 재부팅은 **자동복구 PASS**로 올립니다. 다만 최종 wake-lock 대체 확정에는 재부팅 후 이 상태가 장시간 유지되는지 추가 soak가 필요합니다. Termux UI가 보이지 않는 것 자체는 backend failure로 취급하지 않습니다.

정확한 Tailscale 주소, 계정 정보, 인증 토큰 등 비밀/식별 정보는 기록하지 않습니다.
