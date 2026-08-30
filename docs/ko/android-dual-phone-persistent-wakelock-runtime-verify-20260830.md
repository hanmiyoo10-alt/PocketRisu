# Android 듀얼폰 서버 persistent wake lock 패치 후 런타임 검증 — 2026-08-30

## 배경

서버폰에서 `Disable child process restrictions=ON`만으로는 지속 wake lock을 대체하지 못했고, 장시간 후 Termux/runit 서비스 그룹 전체가 사라지는 재발이 확인되었습니다. 메인폰 direct SSH 8022는 `Connection refused`였고, 서버폰 Termux를 열자 `sshd`, `pocketrisu`, local-usage manager/engine, `llmgateway-bridge`가 모두 짧은 age로 동시에 재구성되었습니다.

이후 런타임 `termux-wake-lock`을 다시 획득했고 core/engine health가 모두 HTTP 200으로 회복되었습니다. 서버폰 boot script `$HOME/.termux/boot/00-pocketrisu-server`는 기존에 core startup 후 `termux-wake-unlock`을 실행하는 구조였으므로, 백업을 만든 뒤 자동 unlock/release/trap 부분만 제거해 부팅 후 wake lock을 지속 유지하도록 최소 수정했습니다.

## 백업 및 패치 기준

- 원본/백업 SHA-256: `db48fbc0f310fe028fc79217bca8f10e32c978843a86247ba4b2965d5db87692`
- 백업: `00-pocketrisu-server.bak-persistent-wakelock-20260830-174711`
- 백업 검증: PASS
- 패치 후 SHA-256: `f54c9bb1b68a6d41a05ff257f5adfdf71a6c40b069f8ccd0ef3a0e10c9f09004`
- 임시 파일 문법 검사: PASS
- 최종 파일 문법 검사: PASS
- 패치 후 wake 관련 호출은 `termux-wake-lock`만 남고 `termux-wake-unlock`, release 함수, 관련 trap은 제거됨
- 패치 직후에는 재부팅이나 서비스 재시작을 수행하지 않음

## 패치 후 현재 런타임 검증

패치 후 수정이 현재 실행 중인 서비스에 영향을 주지 않았는지 INSPECT_ONLY로 확인했습니다.

- boot script SHA는 패치 후 값과 일치
- `runsvdir` PID `26182` 유지
- `sshd` PID `26192`, age 약 798s
- `pocketrisu` PID `26189`, age 약 798s
- `llmgateway-bridge` PID `26194`, age 약 798s
- core health HTTP 200
- engine health HTTP 200

따라서 persistent wake lock boot script 수정 자체가 `runsvdir`, sshd, PocketRisu core, generic bridge를 재시작시키지 않았고 현재 서버 기능은 정상입니다.

## 예상 밖 관찰: local-usage manager/engine 중간 재시작

동일 검증에서 다음 두 서비스만 초기 복구 당시 PID와 달라졌습니다.

- `local-usage-runtime-manager`: 현재 PID `27611`, age 약 427s
- `local-usage-runtime-engine`: 현재 PID `27654`, age 약 423s

초기 wake lock 복구 직후에는 각각 PID `26193`, `26197`이었으므로 두 서비스는 그 사이에 중간 재시작된 것으로 보입니다. manager/engine의 age 차이는 약 4초이며 현재 engine health는 HTTP 200입니다.

이 재시작이 정상 manager lifecycle/engine regeneration에 따른 것인지, crash/restart인지 현재 증거만으로 단정하지 않습니다. 프로젝트 원칙에 따라 서버 재부팅 검증은 잠시 보류하고, 먼저 두 runit 서비스의 실제 run/log 구성을 INSPECT_ONLY로 확인해 원인을 분리합니다. 재귀 `grep -R`은 supervise FIFO에 걸릴 수 있으므로 사용하지 않습니다.

정확한 Tailscale 주소, 인증 토큰 등 비밀 정보는 기록하지 않습니다.
