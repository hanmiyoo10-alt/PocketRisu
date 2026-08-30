# Android 듀얼폰 wake-lock 계측 패치 재부팅 — 메인폰 중간 판정 (2026-08-30)

## 배경

서버폰의 `~/.termux/boot/00-pocketrisu-server`에 다음 계측/보강을 적용한 뒤 controlled reboot를 수행했습니다.

- 부팅 직후 `boot_initial` wake-lock 요청 및 rc/시각 로깅
- PocketRisu core 준비 대기 결과(`core_ready`, `iterations`) 로깅
- core 준비 대기 종료 뒤 `post_core_wait` wake-lock 재요청 및 rc/시각 로깅

재부팅 전 wake-lock marker 파일은 존재하지 않았으므로, 다음에 생성될 marker/log는 이번 reboot에서 생긴 증거로 분리할 수 있습니다.

## 재부팅 후 메인폰 중간 검사

서버폰 Termux 앱을 열지 않은 상태에서 메인폰에서 원격 경로를 검사했습니다.

결과:

- `pocketrisu-ssh-tunnel`: PID `24548`, age 약 `264s`
- `pocketrisu-notify-tunnel`: PID `24411`, age 약 `271s`
- forwarded PocketRisu core: HTTP `200`
- forwarded local-usage engine: HTTP `200`

따라서 이 시점에서 서버폰 Termux를 수동으로 열지 않았는데도 메인 터널이 재구성되었고 PocketRisu core/engine이 정상 응답하므로 **재부팅 직후 backend 자동복구는 PASS**입니다.

## direct SSH 상태

같은 검사 블록에서 direct SSH 8022를 실행했으나, 사용자가 제공한 출력은 SSH 명령 직후에서 끝났고 `ssh_rc`/분류 출력은 아직 없습니다.

따라서 현재 판정은:

- main SSH tunnel: PASS
- main notify tunnel: PASS
- forwarded core: HTTP 200
- forwarded engine: HTTP 200
- direct SSH 8022: 판정 보류

최종 remote-path PASS는 direct SSH 종료코드를 확인한 뒤 선언합니다.

정확한 Tailscale 주소, 인증정보, 토큰 등 비밀/식별 정보는 기록하지 않습니다.
