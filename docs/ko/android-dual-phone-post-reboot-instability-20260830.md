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

정확한 Tailscale 주소, 계정 정보, 인증 토큰 등 비밀/식별 정보는 기록하지 않습니다.
