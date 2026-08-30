# Android 듀얼폰 재부팅 후 연결 불안정 점검 — 2026-08-30

서버폰 재부팅 자동복구 자체는 한 차례 성공했습니다. 서버폰 앱을 수동으로 열지 않은 상태에서 메인폰의 기존 “서버 연결이 정상입니다” 알림이 자동 발생했고, 이후 메인폰 `pocketrisu-ssh-tunnel`/`pocketrisu-notify-tunnel`이 수 분간 안정 run, core 및 bridge engine health가 HTTP 200이었습니다. 또한 서버폰의 `boot-probe-last` marker가 생성되어 Termux:Boot가 실제로 boot script를 실행한 것도 확인했습니다.

그러나 사용자는 성공 이후 서버 연결이 반복적으로 끊기는 불안정 현상을 관찰했습니다. 현 시점에서는 원인을 Termux, 메인 SSH tunnel, Tailscale, 서버 서비스 자체 중 하나로 확정하지 않습니다.

중요한 관찰:

- 이전에 서버폰 Termux를 수동으로 연 직후 `sshd`, `pocketrisu`, local-usage manager/engine, generic bridge의 service age가 모두 약 2초로 보인 적이 있습니다.
- 따라서 Termux shell 시작 시 `$PREFIX/etc/profile.d/start-services.sh`의 `service-daemon start` 실행과 서비스 supervisor 상태 변화가 연결 끊김에 관여하는지 확인할 가치가 있습니다.
- 사용자가 별도로 구성한 GPT 알림은 알림 자체만으로 SSH/PocketRisu 연결을 끊는 원인으로 보지 않습니다. 다만 해당 알림 구현이 Termux 프로세스 실행/재시작을 동반한다면 간접 영향 가능성은 분리 점검합니다.
- 서버폰에는 Android 알림을 새로 만들지 않으며, 정상/장애 알림은 기존 메인폰 경로만 사용합니다.

다음 진단 원칙:

1. 서버폰 Termux를 건드리지 않은 상태에서 메인폰에서 2~3분 동안 tunnel PID/age와 core/engine health를 주기적으로 표본화합니다.
2. 끊김이 발생하면 즉시 같은 메인폰에서 direct SSH 8022 결과를 확인하여 `Connection refused`/timeout/auth success를 구분합니다.
3. 그 결과가 서버 sshd 부재를 가리킬 때만 서버폰 Termux를 열어 기존 상태를 기록합니다. 먼저 재시작하거나 수정하지 않습니다.
4. GPT 알림 작업과 서버 연결 문제는 별도 원인으로 취급하고, 알림 구현이 Termux/process control을 건드리는지 확인 전에는 연결 원인으로 단정하지 않습니다.

## 성공 후 완전 단절 관찰

사용자가 이후 시점에 서버 연결이 단순한 순간 끊김을 넘어 **완전히 끊긴 상태**라고 보고했습니다. 이는 현재 문제를 단순한 짧은 SSH 재접속이나 UI 지연으로 보지 않고, 실제 원격 경로 단절로 취급해야 한다는 의미입니다.

이 완전 단절 상태는 원인 분리에 매우 유용하므로 서버폰의 Termux/Tailscale/PocketRisu를 수동으로 열거나 재시작하지 않고 보존합니다. 다음 검사는 메인폰에서 즉시 다음 세 가지를 동시에 확인합니다.

- supervised SSH tunnel 상태와 PID age
- localhost core/engine health
- tunnel과 동일한 서버 대상의 direct SSH 8022 결과

이 결과로 `Connection refused`이면 서버 sshd/Termux service 부재 쪽, timeout/no-route이면 Tailscale/네트워크 경로 쪽, direct SSH 성공인데 localhost API만 실패하면 메인 tunnel 또는 서버 PocketRisu/bridge 쪽으로 분리합니다.

## 완전 단절 시 direct SSH 결과: 서버 sshd 부재 확정

완전 단절 상태를 보존한 채 메인폰에서 즉시 확인했습니다.

- `pocketrisu-ssh-tunnel`은 age 약 1초로 runit 재시작 루프 상태
- localhost core health HTTP `000`
- localhost bridge engine health HTTP `000`
- tunnel과 동일한 서버 대상의 direct SSH 8022는 종료코드 255
- direct SSH 오류는 `Connection refused`
- timeout, no-route, network-unreachable 유형은 아님

따라서 이번 장기 불안정의 실제 실패층은 **메인 SSH tunnel 자체가 아니라 서버폰의 TCP 8022/sshd 부재**로 좁혀졌습니다. Tailscale 경로는 서버 측에서 즉시 연결 거부를 반환할 정도로 도달 가능한 상태로 판단합니다.

현재 가장 유력한 범위는 서버폰에서 시간이 지난 뒤 `sshd` 또는 더 상위의 Termux/runit supervisor가 내려가는 현상입니다. 아직 `sshd` 단독 종료와 `runsvdir` 전체 종료를 구분하지 않았으므로, 서버폰 Termux를 열기 전에 원인을 단정하지 않습니다. GPT 알림 역시 직접 원인으로 취급하지 않으며, 해당 작업이 Termux/process control을 건드리는지 별도 확인 전까지 분리합니다.

다음 단계는 자동복구 테스트 실패를 이미 확정한 상태에서 서버폰 Termux를 열어 즉시 runit 전체 서비스가 같은 짧은 age로 새로 시작되는지, supervisor/proc 상태와 관련 파일을 INSPECT_ONLY로 기록하는 것입니다. 재시작/수정은 그 뒤에만 진행합니다.

## Termux 수동 실행 직후: runit 전체 재기동 확인

완전 단절 뒤 서버폰 Termux를 열고 즉시 INSPECT_ONLY를 수행했습니다.

- `sshd`, `pocketrisu`, `local-usage-runtime-manager`, `local-usage-runtime-engine`, `llmgateway-bridge`가 모두 **약 2초 age**로 동시에 새로 올라옴
- `runsvdir` PID는 `20616`
- `/proc/20616/status`에서 `PPid: 1`, 상태 sleeping, RSS 약 3.2 MiB
- `/proc/20616/oom_score`는 `666`
- `/proc/20616/oom_score_adj`는 `0`
- `service-daemon` 바이너리는 존재하며, 현재 CLI는 `status` 단독 조회가 아니라 `{start|stop|restart}` 인자를 요구하는 형태
- Termux 권한 범위에서 `dumpsys power` wake-lock 관련 출력은 얻지 못함

이 패턴은 `sshd` 단독 종료와 맞지 않습니다. **Termux의 runit supervisor와 그 아래 서비스 묶음 전체가 백그라운드에서 사라졌다가, Termux shell을 다시 열면서 `$PREFIX/etc/profile.d/start-services.sh`의 `service-daemon start` 경로로 함께 재기동되는 현상**과 일치합니다.

따라서 현재 장애 범위는 PocketRisu/bridge 개별 코드보다 상위의 **서버폰 Termux background process 생존성**으로 좁혀집니다. 다만 wake lock은 CPU suspend 방지와 process 생존 보장이 동일하지 않으므로, 이 결과만으로 permanent wake lock을 정답으로 복구하지 않습니다. 다음 단계는 현재 설정을 보존한 채 짧은 A/B로 wake lock 유무에 따른 runit/SSH 생존 차이를 확인한 뒤, 필요하면 Android/Termux foreground 유지 방식과 함께 최소 전력 비용의 영구 조치를 결정합니다.

정확한 Tailscale 주소, 계정 정보, 인증 토큰 등 비밀/식별 정보는 기록하지 않습니다.
