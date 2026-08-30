# Android 듀얼폰 local-usage manager/engine 부분 재시작 검사 — 2026-08-30

## 배경

서버폰에서 persistent wake lock용 Termux:Boot 스크립트 패치를 적용한 뒤 현재 런타임을 재시작하지 않은 상태에서 확인한 결과, `runsvdir`, `sshd`, `pocketrisu`, `llmgateway-bridge`는 기존 PID/age를 유지했고 core/engine health도 HTTP 200이었습니다. 다만 `local-usage-runtime-manager`와 `local-usage-runtime-engine`만 중간에 새 PID로 교체되어 있어 원인을 별도 INSPECT_ONLY로 확인했습니다.

## 서비스 상태

- manager PID `27611`, 확인 시 age 약 `547s`
- engine PID `27654`, 확인 시 age 약 `543s`
- 두 서비스는 약 4초 차이로 다시 올라옴
- manager run SHA-256: `43efff83c20907a0fe4c9223f2d1be575df675a595a92a4822ecf053d8c629ec`
- engine run SHA-256: `58b7965f3b14af15e564032534c8817a3856325a381c8a756df81baa94c3a178`
- 서비스별 `log` 엔트리와 대응 regular log 파일은 확인되지 않음
- `ps`의 1970년 시작 시각 표시는 이 Android/Termux 환경에서 신뢰하지 않고 `sv status` age를 우선함

따라서 이 재시작은 Termux/runit 전체 재구성이 아니라 local-usage manager/engine pair에 국한된 부분 재시작입니다. 로그가 없으므로 crash 여부는 이 증거만으로 확정하지 않습니다.

## manager source의 재시작/재생성 경로

`~/.local/share/local-usage-dashboard/runtime/bridge-manager.cjs`를 읽기 전용으로 검사했습니다.

- manager 파일 SHA-256: `5af01c7106c7da20f00faef8ac471acb0ab7bdb27e79433f4444c10a70e55e49`
- size: `41006`
- mtime: `2026-08-30 17:43:56 +0900`
- `RESTART_MODE`는 환경변수 `LUD_MANAGER_RESTART_MODE`에서 읽고 기본값은 `manual`
- `scheduleRestart()`가 존재하며 `RESTART_MODE === 'runit'`이면 `process.exit(0)`으로 종료해 runit 재기동을 유도하는 경로가 존재
- manager self-update/rollback 결과가 `restartRequired=true`이면 응답 완료 후 `scheduleRestart()`를 호출하는 경로가 존재
- `/restart` endpoint도 manager 재시작을 요청할 수 있음
- `/engine/sync` endpoint가 존재
- engine service run file을 manager가 직접 `writeFileSync`로 재생성하는 경로가 존재
- `sv up`, `sv down`을 사용해 engine runit service를 의도적으로 내리고 올리는 여러 경로가 존재
- engine candidate process에 SIGTERM을 보내는 migration/adoption 경로도 존재

즉 manager/engine pair의 PID 교체는 코드 설계상 의도적인 sync/update/regeneration/restart로도 발생할 수 있으므로, PID 교체 자체를 crash 증거로 사용하면 안 됩니다.

## 파일 시각 단서

- manager source mtime: `2026-08-30 17:43:56 +0900`
- manager run mtime: `2026-08-19 16:07:30 +0900`
- engine run mtime: `2026-08-30 17:44:01 +0900`

manager source와 engine run file이 약 5초 차이로 갱신된 흔적이 있습니다. 이는 manager/engine pair의 부분 재시작이 manager update 또는 engine sync/regeneration 흐름과 관련됐을 가능성을 높이는 단서이지만, 현재 로그가 없고 실제 요청 시점/호출자를 확인하지 못했으므로 원인을 확정하지 않습니다.

## 다음 검사

다음 단계는 수정 없이 다음만 확인합니다.

1. manager run script가 `LUD_MANAGER_RESTART_MODE=runit`을 실제로 설정하는지
2. runtime 디렉터리의 regular file mtime들을 비교해 `17:43~17:48` 근처에 함께 갱신된 state/descriptor/update 파일이 있는지
3. 그 결과가 의도적 manager self-update/engine sync와 맞으면 이번 pair 재시작은 wake lock 패치와 별개인 정상 관리 동작으로 분리
4. 근거가 맞지 않으면 crash/runit 재기동 가능성을 계속 보류 상태로 조사

서버 재부팅 검증은 이 부분 재시작의 성격을 한 단계 더 분류한 뒤 진행합니다. 정확한 Tailscale 주소, 계정 정보, 인증 토큰 등 비밀/식별 정보는 기록하지 않습니다.
