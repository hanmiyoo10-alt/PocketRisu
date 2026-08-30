# Android 듀얼폰 persistent wake lock 재부팅 검증 — 2026-08-30

## 배경

서버폰에서 wake lock 없이 장기 운용했을 때 Termux/runit/sshd 전체 서비스 그룹이 사라지는 장애가 반복 재현되었고, `Disable child process restrictions=ON`만으로는 장기 생존을 보장하지 못했습니다. 반면 wake lock을 유지한 동안에는 동일한 완전 단절이 재현되지 않아, 운영 기본값을 persistent wake lock으로 되돌리기로 했습니다.

서버폰 Termux:Boot의 `00-pocketrisu-server`는 기존에 부팅 초기에만 `termux-wake-lock`을 획득한 뒤 core health가 준비되거나 타임아웃되면 `termux-wake-unlock`을 호출하도록 되어 있었습니다. 이를 백업한 뒤 자동 unlock/trap 경로를 제거하고 부팅 후 wake lock을 계속 유지하도록 최소 수정했습니다.

패치 후 boot script SHA-256은 `f54c9bb1b68a6d41a05ff257f5adfdf71a6c40b069f8ccd0ef3a0e10c9f09004`이며, shell syntax 검증은 PASS였습니다. 패치 직후 기존 `runsvdir`, sshd, PocketRisu, bridge는 유지되었고 core/engine health는 모두 HTTP 200이었습니다.

중간에 local-usage manager/engine pair의 PID가 바뀐 것은 별도 조사 결과 manager의 `LUD_MANAGER_RESTART_MODE=runit` 설정과 self-update/engine sync 경로가 실제로 활성화되어 있고, 같은 시간대에 manager/CLI/engine/adopted descriptor가 순차 갱신된 사실이 확인되어 persistent wake lock 패치 문제와 분리했습니다.

## 재부팅 관찰

서버폰을 Android 전원 메뉴에서 정상 재부팅했습니다.

재부팅 완료 후 사용자 관찰:

- 서버폰은 정상 부팅됨
- Termux UI는 다시 화면에서 사라짐

이 현상만으로는 backend 실패로 판정하지 않습니다. 이전에도 Termux UI가 보이지 않는 상태에서 Termux:Boot가 실행되어 sshd/PocketRisu/local-usage backend가 정상 동작한 사례가 있었기 때문입니다. persistent wake lock의 목적도 Termux UI를 계속 표시하는 것이 아니라 background service stack의 생존을 유지하는 것입니다.

따라서 현재 서버폰에서는 Termux를 직접 다시 열지 않고 실패/성공 상태를 보존합니다. 다음 검증은 메인폰에서만 수행합니다.

1. main의 `pocketrisu-ssh-tunnel` / `pocketrisu-notify-tunnel` 상태와 age 확인
2. forwarded core / engine HTTP health 확인
3. 필요 시 실제 tunnel destination으로 direct SSH 8022를 1회 시도해 sshd 생존 여부 분류
4. 원격 경로가 PASS면 서버폰 UI를 열지 않은 상태에서 boot autorecovery가 성공한 것으로 판단
5. 원격 경로가 FAIL이면 실패 유형을 먼저 보존한 뒤 서버폰 Termux를 열지 여부를 결정

## 첫 post-reboot direct SSH 시도: 결과 미출력

메인폰에서 실제 tunnel destination을 사용한 direct SSH 8022 명령을 실행했으나, 사용자가 붙여넣은 블록에는 stderr를 임시 파일로 리다이렉트하는 부분까지만 포함되었고 `RC=$?`, 오류 분류, health/tunnel 상태 출력 부분이 실행되지 않았습니다. 동일한 direct SSH 명령이 두 번 실행된 뒤 프롬프트로 복귀했지만, 종료코드와 stderr 내용이 출력되지 않았으므로 **성공/Connection refused/timeout/auth 중 어느 쪽인지 판정할 수 없습니다.**

이 시도는 post-reboot backend 성공/실패 증거로 사용하지 않습니다. 서버폰 Termux는 계속 열지 않아 현재 상태를 보존하고, 다음 메인폰 검사는 tunnel status, forwarded core/engine health, direct SSH 8022 결과를 한 블록에서 반드시 출력하도록 다시 수행합니다.

## post-reboot 메인 원격 경로 확인: PASS

서버폰 Termux UI를 다시 열지 않은 상태에서 메인폰에서 재확인했습니다.

- `pocketrisu-ssh-tunnel`: PID `17147`, age 약 `629s`
- `pocketrisu-notify-tunnel`: PID `17145`, age 약 `630s`
- forwarded PocketRisu core: HTTP `200`
- forwarded local-usage engine: HTTP `200`

따라서 서버폰 재부팅 후 Termux UI가 화면에서 사라진 상태에서도 최소 약 10분 동안 메인폰의 SSH tunnel과 PocketRisu/local-usage 원격 경로가 정상적으로 유지되었습니다. 이 시점의 **boot autorecovery 및 원격 backend 경로는 PASS**로 판정합니다.

다만 같은 블록의 direct SSH 8022 명령은 사용자가 붙여넣은 출력이 `ssh ... true >/dev/null 2>"$ERR"` 실행 부분에서 끝나 종료코드/분류가 아직 보이지 않습니다. 따라서 direct SSH 자체의 최종 분류는 보류합니다. 또한 이 원격 PASS만으로 Android wake lock이 실제로 획득·유지 중임을 독립적으로 직접 증명한 것은 아니며, persistent wake lock의 장기 안정성 판정에는 더 긴 soak가 필요합니다.

## direct SSH 8022 최종 분류: PASS

직전 direct SSH 명령의 종료코드를 바로 보존해 확인한 결과:

- `ssh_rc=0`
- `CLASS=DIRECT_SSH_OK`

따라서 서버폰 재부팅 후 Termux UI를 다시 열지 않은 상태에서도 실제 서버 sshd가 port `8022`에서 정상적으로 연결을 수락하고 명령 실행까지 완료했습니다. 이는 단순히 메인폰의 기존 tunnel 프로세스가 남아 있는 수준이 아니라, 서버폰의 sshd 자체가 살아 있음을 직접 확인한 결과입니다.

앞선 결과와 합치면 이번 persistent wake lock 패치 후 재부팅 검증은 다음 조건을 모두 만족했습니다.

- 메인 SSH tunnel 연속 run
- 메인 notify tunnel 연속 run
- forwarded PocketRisu core HTTP 200
- forwarded local-usage engine HTTP 200
- direct SSH 8022 성공
- 서버폰 Termux UI를 수동으로 다시 열지 않음

따라서 **persistent wake lock 구성의 재부팅 직후 자동복구는 PASS 확정**으로 판정합니다. 다만 과거 wake-lock-free 구성은 재부팅 직후에는 통과하고도 시간이 지난 뒤 전체 Termux/runit 서비스 스택이 사라졌으므로, 이번 구성의 최종 안정성 판정은 장시간 soak 이후에 별도로 수행합니다.

## persistent wake lock soak 재발: FAIL

이후 서버폰 Termux UI를 수동으로 다시 열지 않은 채 실사용 soak를 진행했고, 메인폰에서 다시 원격 상태를 확인했습니다.

결과:

- `pocketrisu-ssh-tunnel`: PID `17715`, age 약 `1s` — 재시작 루프 상태
- `pocketrisu-notify-tunnel`: PID `17550`, age 약 `8s` — 재시작 루프 상태
- forwarded PocketRisu core: HTTP `000`
- forwarded local-usage engine: HTTP `000`
- direct SSH 8022 시도 종료코드: `255`

후속 분류용 direct SSH를 stderr 보존 상태로 다시 수행한 결과:

- `ssh_rc=255`
- `CLASS=CONNECTION_REFUSED`

따라서 이번 실패는 timeout/route 문제와 분리됩니다. 메인폰에서 서버폰의 네트워크 endpoint에는 도달했지만 port `8022`에서 sshd가 listen 중이지 않은 상태입니다. 이는 과거 wake-lock-free 장기 실패 때 관찰된 패턴과 동일합니다.

현재 확정 가능한 것은 다음과 같습니다.

1. persistent wake lock용 boot script 적용 후 재부팅 직후에는 sshd/core/engine이 정상 자동복구됨
2. 이후 soak 중 메인 SSH/notify tunnel이 재시작 루프에 빠짐
3. forwarded core/engine은 HTTP `000`
4. direct SSH 8022는 `Connection refused`
5. 따라서 네트워크/Tailscale route 자체보다 서버 Termux/sshd 서비스층 소실 패턴과 더 잘 맞음
6. 다만 boot script에서 호출한 wake lock이 장애 시점까지 실제로 유지되었는지는 독립적으로 확인하지 못했으므로, **"wake lock이 확실히 유지 중인데도 서비스층이 죽었다"고 단정하지 않음**

다음 단계에서는 실패 증거가 충분히 보존되었으므로 서버폰 Termux를 직접 열어, 열자마자 runit/sshd/PocketRisu/local-usage 서비스들이 다시 낮은 age로 동시 재구성되는지 확인합니다. 그 뒤에야 boot-acquired wake lock의 실제 유지 여부와 수동 wake lock 안정성 차이를 분리합니다.

## Termux 재오픈 후 전체 service stack 재구성 재확인

실패 상태 보존 후 서버폰 Termux를 직접 열었습니다. 직후 `runsvdir` PID는 `27578`이었고, `sshd`, `pocketrisu`, `local-usage-runtime-manager`, `local-usage-runtime-engine`, `llmgateway-bridge`가 모두 약 `1s` age로 동시에 올라왔습니다. 따라서 이번 soak 실패도 다시 **Termux/runit 서비스 그룹 전체가 사라졌다가 Termux UI를 여는 순간 재구성되는 패턴**으로 확인했습니다.

동시에 다음도 확인했습니다.

- boot script SHA-256은 여전히 `f54c9bb1b68a6d41a05ff257f5adfdf71a6c40b069f8ccd0ef3a0e10c9f09004`
- boot script에는 `termux-wake-lock`만 남아 있고 `termux-wake-unlock`/trap은 없음
- boot probe 파일은 `2026-08-30 18:05:27 +0900`에 갱신되어 실제 Termux:Boot 실행 자체는 확인됨

따라서 boot script 미실행이나 파일 롤백으로 설명할 수 없습니다.

## wake lock 명령 구현 검사

`termux-wake-lock`은 바이너리가 아니라 다음 Android service 호출을 수행하는 짧은 shell wrapper임을 확인했습니다.

- `/system/bin/am startservice`
- action: `com.termux.service_wake_lock`
- component: `com.termux/com.termux.app.TermuxService`

현재 boot script는 이 wrapper의 stdout/stderr를 버리고 `|| true`로 종료 상태도 무시하므로, 부팅 시 wake lock 요청이 실제 성공했는지 증거가 남지 않습니다. Termux PATH에서는 `dumpsys`가 발견되지 않았으나 `/system/bin/dumpsys` 자체 존재 여부는 후속 검사 대상으로 남겼습니다.

## 수동 wake lock direct request 첫 시도: 명령 미반환

Termux 재오픈 후 서비스 5개가 모두 동일 PID로 약 `355s` 연속 run인 기준점에서 `/system/bin/am`, `/system/bin/dumpsys`, `/system/bin/cmd`가 모두 executable임을 확인했습니다.

그 뒤 boot wrapper와 동일 의미의 `/system/bin/am startservice --user ... -a com.termux.service_wake_lock com.termux/com.termux.app.TermuxService`를 stdout/stderr 보존 상태로 직접 실행했으나, 제공된 출력에서는 해당 명령 이후 shell prompt가 아직 복귀하지 않았습니다. 따라서 이 시점에는 `wake_request_rc`가 출력되지 않았고 **수동 wake lock 요청의 성공/실패는 판정하지 않습니다.**

예상과 다른 장시간 미반환이므로 다른 변경이나 재부팅은 하지 않고, 해당 `am startservice` 호출을 중단한 뒤 임시 출력과 `/system/bin/dumpsys power`로 실제 service/wake-lock 상태를 읽는 단계로 전환합니다.

## 수동 wake lock 요청 재판정 및 dumpsys 권한 한계

후속 출력으로 직전 `/system/bin/am startservice` 호출이 실제로는 정상 반환했음을 확인했습니다.

- `previous_rc=0`
- 저장된 출력: `Starting service: Intent { act=com.termux.service_wake_lock cmp=com.termux/.app.TermuxService }`

따라서 수동 wake lock service Intent는 ActivityManager에 정상 접수되었습니다. 같은 시점에 서비스 5개는 기존 PID를 유지한 채 age 약 `500s`까지 연속 증가했고 core/engine은 모두 HTTP 200이었습니다. 즉 수동 wake lock 요청 자체가 runit 서비스 재시작을 일으키지는 않았습니다.

`/system/bin/dumpsys power`와 `/system/bin/dumpsys activity services com.termux`를 직접 실행한 결과 둘 다 명령 종료코드는 `0`이었지만 실제 내용은 각각 한 줄의 `Permission Denial`뿐이었습니다.

- PowerManagerService dump: Termux UID `10034`에 `android.permission.DUMP` 권한 없음
- ActivityManager service dump: 동일하게 `android.permission.DUMP` 권한 없음

따라서 root/ADB 권한이 없는 현재 서버폰 Termux 세션에서는 `dumpsys`로 실제 wake lock held 여부나 TermuxService 내부 상태를 직접 판정할 수 없습니다. 이전에 grep 결과가 비어 있었던 것은 wake lock 부재의 증거가 아니라 dump 권한 차단 때문입니다.

Termux upstream `TermuxService` 구현도 확인했습니다. `ACTION_WAKE_LOCK`을 받으면 `PowerManager.PARTIAL_WAKE_LOCK`과 Wi-Fi lock을 획득하고, 이미 `mWakeLock`이 있으면 중복 획득을 무시합니다. `TermuxService.onDestroy()`에서는 해당 lock을 release하며 서비스 restart policy는 `START_NOT_STICKY`입니다. 따라서 향후 판정은 두 가능성을 분리해야 합니다.

1. 부팅 시 `termux-wake-lock` service Intent 자체가 실패하거나 너무 이른 타이밍에 실행됨
2. 부팅 시 lock은 정상 획득했지만 이후 TermuxService/process가 Android에 의해 종료되면서 lock도 같이 사라짐

현재 수동 요청은 정상 접수되었고 서버 runtime은 정상 유지 중이지만, 실제 wake lock held 상태를 직접 읽을 권한은 없습니다. 다음 단계는 기존 부팅 시점의 Termux/ActivityManager log 흔적을 읽을 수 있는지 INSPECT_ONLY로 확인해 boot-time request 성공/실패 근거를 찾는 것입니다.

정확한 Tailscale 주소, 계정 정보, 인증 토큰 등 비밀/식별 정보는 기록하지 않습니다.
