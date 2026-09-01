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
- 이 재확인은 부분 재시작이 반복 중인 현상은 아님을 보여줬다.

## 19:26 KST 원인 분류

서버폰 Termux UI를 여전히 열지 않은 상태에서 메인폰 SSH로 local-usage 서비스 파일과 runtime 파일의 mtime을 검사했다.

관찰:
- local-usage-runtime-manager/run mtime: 2026-08-19 16:07:30 KST
- local-usage-runtime-engine/run mtime: 2026-09-01 13:49:25.199 KST
- bridge-manager.cjs mtime: 2026-09-01 13:49:22.635
- bridge-manager.cjs.bak mtime: 2026-09-01 13:49:23.043
- bridge-engine.mjs mtime: 2026-09-01 13:49:24.587
- engine-adopted.json mtime: 2026-09-01 13:49:26.195
- manager 현재 세대 시작 시각은 age 역산상 약 13:49:23 KST
- engine 현재 세대 시작 시각은 age 역산상 약 13:49:25 KST

해석:
- runtime 파일 갱신과 manager/engine 재기동 시각이 초 단위로 맞물린다.
- 특히 manager runtime 코드 갱신 -> manager 재기동, engine runtime 코드 및 service run 파일 갱신 -> engine 재기동 -> engine-adopted.json 갱신 순서가 관찰됐다.
- 따라서 13:49 부분 재시작은 Termux 전체 세대 소실이나 Android 백그라운드 kill 패턴이 아니라 local-usage runtime 업데이트/배포 이벤트에 수반된 선택적 재기동으로 분류하는 것이 가장 잘 맞는다.
- 핵심 서버 계층인 sshd / pocketrisu / llmgateway-bridge와 메인 SSH/notify 터널은 이 이벤트를 가로질러 동일 세대를 유지했다.
- 과거 약 11분 Termux/sshd 세대 소실 문제는 이번 부팅에서 14시간 이상 재현되지 않았다.

## 최종 결론

- unattended soak 기준 핵심 서버 스택은 PASS로 본다.
- local-usage manager/engine의 13:49 재기동은 runtime 파일 교체와 동기화된 별도 업데이트 이벤트로 분류한다.
- 이 부분 재기동 때문에 전체 Termux 안정성 검증을 실패로 처리하지 않는다.
- 이 시점 이후 서버폰 Termux UI를 열어 일반 작업에 사용해도, 이미 수집된 unattended soak 증거는 유효하다.

민감한 사설 주소, 토큰, 인증정보는 기록하지 않는다.
