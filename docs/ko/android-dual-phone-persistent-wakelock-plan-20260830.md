# Android 듀얼폰 서버폰 지속 wake lock 전환 계획 — 2026-08-30

## 배경

`Disable child process restrictions=ON` 상태에서도 지속 wake lock 없이 운용하면 서버폰의 Termux/runit 서비스 그룹이 시간이 지나 다시 사라지는 현상이 재현됐습니다. 메인폰 direct SSH 8022는 `Connection refused`, forwarded core/engine은 HTTP 000이었고, 서버폰 Termux를 직접 열자 `sshd`, `pocketrisu`, local-usage manager/engine, `llmgateway-bridge`가 모두 짧은 age로 동시에 다시 올라왔습니다.

이후 서버폰에서 런타임 `termux-wake-lock`을 다시 획득했고, core는 startup delay 뒤 HTTP 200으로 회복했으며 engine도 HTTP 200을 유지했습니다. 따라서 운영 방향을 **wake lock 유지로 안정성을 확보한 뒤 idle CPU/wakeup/polling/logging을 줄여 배터리·발열을 최적화하는 방식**으로 전환합니다.

## 현재 boot script INSPECT_ONLY

대상 파일:

- `$HOME/.termux/boot/00-pocketrisu-server`
- mode: `700` (`-rwx------`)
- size: `903` bytes
- SHA-256: `db48fbc0f310fe028fc79217bca8f10e32c978843a86247ba4b2965d5db87692`
- `sh -n` syntax check: `rc=0`

현재 wake lock 흐름:

- line 4: `termux-wake-lock` 실행
- line 6~8: `release_wakelock()`에서 `termux-wake-unlock` 실행
- line 11: `EXIT HUP INT TERM`에 release trap 등록
- line 13: `start-services.sh` 로드
- line 16: `sshd` enable
- line 17: `pocketrisu` up
- line 19~31: core health가 준비될 때까지 최대 약 90초 대기
- line 34: 정상/타임아웃 여부와 관계없이 `release_wakelock` 실행
- line 35: trap 해제
- line 37: 종료

따라서 현재 boot script는 **부팅 초기화 동안만 wake lock을 잡고 core health 확인 뒤 반드시 해제하는 구조**임이 재확인됐습니다. 장기 안정성에 필요한 지속 wake lock은 현재 런타임에서 수동으로만 잡혀 있으며, 다음 재부팅 뒤에는 이 스크립트가 다시 wake lock을 해제하므로 같은 장기 장애가 재발할 수 있습니다.

## 다음 변경 원칙

현재 런타임 wake lock은 그대로 유지해 안정 상태를 보존합니다. boot script는 즉시 수정하지 않고 다음 순서로 진행합니다.

1. 현재 boot script를 타임스탬프 백업하고 원본/백업 SHA-256 일치 확인
2. 백업 성공 후에만 최소 수정
3. 수정 목표는 부팅 후 `termux-wake-lock`을 계속 유지하도록 하고 자동 `termux-wake-unlock` 경로를 제거하는 것
4. 수정 후 `sh -n`, mode, SHA, wake-lock 관련 라인 재검증
5. 현재 세션에서는 파일 수정만으로 런타임 wake lock 상태를 건드리지 않음
6. 이후 별도 재부팅 검증에서 Termux:Boot 자동기동, core/bridge/SSH 원격 접근, 장기 background survival을 확인
7. 안정성이 확보된 뒤 PocketRisu/bridge/SSH/reconnect/logging의 idle CPU와 wakeup을 측정해 발열·배터리 최적화를 진행

정확한 Tailscale 주소, 계정 정보, 인증 토큰 등 비밀/식별 정보는 기록하지 않습니다.
