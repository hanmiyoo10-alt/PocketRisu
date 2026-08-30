# Android 듀얼폰 local-usage manager/engine 부분 재시작 분류 — 2026-08-30

## 배경

서버폰 persistent wake lock boot script 패치 이후 현재 런타임을 재시작하지 않은 상태에서 검증했을 때, `runsvdir`, `sshd`, `pocketrisu`, `llmgateway-bridge`는 기존 PID와 age를 유지했고 core/engine health도 HTTP 200이었습니다. 다만 `local-usage-runtime-manager`와 `local-usage-runtime-engine`만 새 PID로 교체되어 있어 부분 재시작 원인을 별도로 분리했습니다.

## 부분 재시작 관찰

- manager PID: `27611`
- engine PID: `27654`
- 두 서비스의 `sv status` age는 약 4초 차이
- 서비스별 runit `log` 엔트리 없음
- `$PREFIX/var/log`에도 대응 regular log 파일 없음
- 따라서 로그만으로 crash 여부를 확정할 수 없음
- `ps`의 STARTED 시각이 1970년으로 표시되는 것은 이 환경에서 신뢰하지 않고, `sv status` age를 우선 사용

## manager 코드 경로 확인

`bridge-manager.cjs`에는 다음 관리 경로가 실제로 존재합니다.

- `RESTART_MODE` 환경변수 처리
- `scheduleRestart()`
- `RESTART_MODE === 'runit'`일 때 `process.exit(0)` 후 runit 재기동
- `/engine/sync`
- engine 서비스 `sv down` / `sv up`
- engine run-file 재생성
- bundled `bridge-engine.mjs` 교체
- engine descriptor/adopt 경로
- manager self-update 후 restart-required 처리

따라서 manager/engine PID 교체는 crash뿐 아니라 정상적인 self-update / engine sync / adopt 흐름에서도 발생할 수 있습니다.

## 실제 실행 환경

실행 중 manager 프로세스의 `/proc/<pid>/environ`과 run script를 확인한 결과:

- `LUD_MANAGER_RESTART_MODE=runit`
- manager run script도 동일하게 `LUD_MANAGER_RESTART_MODE=runit`을 export

즉 현재 manager는 의도적으로 `process.exit(0)`을 사용해 runit에 자기 자신을 다시 올리게 하는 정상 재시작 모드를 사용하고 있습니다.

## 같은 시각대 파일 갱신 증거

부분 재시작 시점과 겹치는 2026-08-30 17:42~17:49 구간에서 다음 runtime 파일들이 연속 갱신됐습니다.

- 17:43:56 `bridge-manager.cjs`
- 17:43:57 `bridge-manager.cjs.bak`
- 17:43:57 `cli/managed-cli.json`
- 17:43:57 `cli/managed-cli-state.json`
- 17:44:00 `bridge-engine.mjs`
- 17:44:02 `engine-adopted.json`

또한 engine run-file mtime도 17:44:01이었습니다.

이 시간 순서는 manager self-update / managed CLI 상태 갱신 / engine 교체 / engine adopt가 한 흐름으로 수행된 정황과 일치합니다.

## 판정

현재 증거상 이번 `local-usage-runtime-manager` / `local-usage-runtime-engine` pair의 PID 교체는 **Termux/runit 전체 소실이나 wake lock 실패로 분류하지 않습니다.** 또한 로그가 없으므로 crash를 100% 배제한다고 표현하지는 않지만, 실제 `runit` restart mode와 연속된 runtime 파일 갱신을 함께 보면 **manager-managed self-update / engine sync·adopt에 따른 의도적 부분 재시작으로 보는 것이 가장 타당**합니다.

따라서 이 부분 재시작 건은 persistent wake lock 부팅 검증을 막는 별도 장애로 취급하지 않습니다. 다음 단계는 persistent wake lock이 적용된 boot script로 서버폰을 재부팅하고, 서버폰 Termux UI를 수동으로 열지 않은 채 메인폰에서 SSH tunnel 및 forwarded core/engine 자동복구를 검증하는 것입니다.

정확한 Tailscale 주소, 계정 정보, 인증 토큰은 기록하지 않습니다.
