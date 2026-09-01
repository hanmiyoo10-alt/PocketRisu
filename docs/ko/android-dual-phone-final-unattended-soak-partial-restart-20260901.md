# Android 듀얼폰 최종 unattended soak 점검: core 계층 안정 + local-usage 부분 재시작

- 점검 시각: 2026-09-01 19:17 KST
- 서버폰 Termux UI는 점검 전까지 열지 않음
- 메인 SSH/notify 터널은 동일 세대 유지

## 관찰

메인폰:
- pocketrisu-ssh-tunnel: pid 10229, age 52645s
- pocketrisu-notify-tunnel: pid 10226, age 52646s
- core HTTP 200
- engine HTTP 200

서버폰:
- sshd: pid 14047, age 52646s
- pocketrisu: pid 14051, age 52646s
- llmgateway-bridge: pid 14048, age 52646s
- local-usage-runtime-manager: pid 16807, age 19693s
- local-usage-runtime-engine: pid 16864, age 19691s

## 해석

- sshd / pocketrisu / llmgateway-bridge 및 메인 양쪽 터널은 약 14시간 37분 동안 동일 세대를 유지했다.
- 과거 약 11분 뒤 발생하던 Termux/sshd 세대 소실은 이번 부팅에서 재현되지 않았다.
- local-usage manager/engine만 별도 PID로 바뀌었으며 현재 age로 역산하면 약 13:49:23~13:49:25 KST에 부분 재시작이 발생했다.
- 따라서 이번 결과를 전체 서비스 동일 세대 PASS로 기록하면 안 된다.
- 이 부분 재시작은 Termux 전체 세대 소실과는 다른 형태다.
- 과거 local plugin update와 manager/engine 재시작 상관이 있었지만, 이번 건의 원인은 로그 확인 전까지 같은 원인으로 단정하지 않는다.

## 19:21 KST 재확인

동일한 상태 점검을 다시 실행했다.

메인폰:
- pocketrisu-ssh-tunnel: pid 10229, age 52852s
- pocketrisu-notify-tunnel: pid 10226, age 52853s
- core HTTP 200
- engine HTTP 200

서버폰:
- sshd: pid 14047, age 52853s
- pocketrisu: pid 14051, age 52853s
- llmgateway-bridge: pid 14048, age 52853s
- local-usage-runtime-manager: pid 16807, age 19900s
- local-usage-runtime-engine: pid 16864, age 19898s

해석:
- core 계층 및 SSH/notify 터널은 계속 동일 세대를 유지했다.
- local-usage manager/engine도 13:49경 재시작된 뒤 19:21까지 추가 재시작 없이 유지됐다.
- 이 재확인은 부분 재시작이 반복 중인 현상은 아님을 보여주지만, 13:49 재시작의 원인을 설명하지는 않는다.

## 다음 단계

서버폰 Termux UI를 열기 전에 메인폰 SSH를 통해 manager/engine 관련 로그 및 런타임 변경 흔적을 검사해 13:49 부분 재시작 원인을 분류한다.

민감한 사설 주소, 토큰, 인증정보는 기록하지 않는다.
