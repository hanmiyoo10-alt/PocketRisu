# Android 듀얼폰 persistent wake lock soak 실패 후 서비스 재구성 — 2026-08-30

## 배경

서버폰 Termux:Boot의 `00-pocketrisu-server`를 persistent wake lock 형태로 수정한 뒤 재부팅 직후 자동복구는 PASS였습니다. 메인폰에서 SSH/notify tunnel이 약 10분 이상 연속 run 상태였고 forwarded core/engine은 HTTP 200, direct SSH 8022도 성공했습니다.

그러나 이후 실사용 soak 중 원격 backend가 다시 완전히 끊겼습니다. 메인폰에서는 tunnel 두 개가 짧은 age로 재시작 루프에 들어갔고 core/engine은 HTTP 000, direct SSH 8022는 `Connection refused`로 분류되었습니다.

## 실패 상태 보존 후 서버폰 Termux 재오픈

실패 증거를 충분히 보존한 뒤 서버폰 Termux를 직접 열고, 별도의 `termux-wake-lock` 수동 호출 전에 즉시 상태를 확인했습니다.

결과:

- `runsvdir` PID `27578`
- `sshd` PID `27587`, age 약 `1s`
- `pocketrisu` PID `27585`, age 약 `1s`
- `local-usage-runtime-manager` PID `27588`, age 약 `1s`
- `local-usage-runtime-engine` PID `27590`, age 약 `1s`
- `llmgateway-bridge` PID `27589`, age 약 `1s`

다섯 서비스가 Termux를 여는 순간 거의 동시에 약 1초 age로 다시 올라온 것은, 이번 soak 실패 역시 메인폰 tunnel 단독 문제가 아니라 서버폰의 Termux/runit 서비스 그룹 전체가 사라졌다가 Termux UI 오픈을 계기로 재구성된 패턴임을 다시 확인합니다.

## boot script 및 boot probe 확인

현재 boot script SHA-256은 다음과 같았습니다.

`f54c9bb1b68a6d41a05ff257f5adfdf71a6c40b069f8ccd0ef3a0e10c9f09004`

wake 관련 라인은 `termux-wake-lock` 한 줄만 존재하고 `termux-wake-unlock`이나 trap은 없습니다. 따라서 persistent wake lock 패치가 원래 파일로 되돌아간 것은 아닙니다.

boot probe 파일도 존재했고 다음을 기록하고 있었습니다.

- mtime: `2026-08-30 18:05:27 +0900`
- `boot_probe_ran=1`
- `time=2026-08-30T18:05:27+0900`

따라서 Termux:Boot 자체가 실행되지 않은 것도 아닙니다.

## 현재 판정

현재까지 확정 가능한 사실은 다음과 같습니다.

1. Termux:Boot 경로는 재부팅 시 실제 실행됨
2. persistent wake lock용 boot script 파일도 예상 SHA 그대로 유지됨
3. 재부팅 직후 sshd/core/engine은 정상 자동복구됨
4. 이후 soak 중 Termux/runit 서비스 그룹이 다시 사라짐
5. Termux를 수동으로 열면 다섯 서비스가 약 1초 age로 동시에 재구성됨

다만 boot script의 `termux-wake-lock >/dev/null 2>&1 || true`는 실행 성공 여부를 어디에도 기록하지 않습니다. 따라서 현재 증거만으로는 다음 두 경우를 구분할 수 없습니다.

- 부팅 시 `termux-wake-lock` 호출 자체가 실패했지만 오류가 숨겨진 경우
- wake lock은 실제로 획득되었으나 이후 해제/소실되었거나, 유지 중이어도 서비스 그룹이 종료된 경우

다음 단계에서는 수동 wake lock을 다시 걸기 전에 `termux-wake-lock` 명령의 실제 구현/호출 방식과, 현재 Android에서 wake lock 상태를 관찰할 수 있는 읽기 전용 경로가 있는지 INSPECT_ONLY로 확인합니다. 그 뒤 boot script에 wake-lock return code/시각을 기록하는 최소 계측을 추가할지 결정합니다.

정확한 Tailscale 주소, 계정 정보, 인증 토큰 등 비밀/식별 정보는 기록하지 않습니다.
