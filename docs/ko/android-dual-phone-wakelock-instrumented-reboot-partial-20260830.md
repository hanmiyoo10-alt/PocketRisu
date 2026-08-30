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

## direct SSH 최종 분류: PASS

직전 direct SSH 8022 명령의 종료코드를 바로 보존해 확인한 결과:

- `ssh_rc=0`
- `CLASS=DIRECT_SSH_OK`

따라서 서버폰 Termux를 직접 열지 않은 상태에서 다음이 모두 성립합니다.

- main SSH tunnel: PASS
- main notify tunnel: PASS
- forwarded core: HTTP 200
- forwarded engine: HTTP 200
- direct SSH 8022: PASS

즉 **wake-lock 계측/2회 요청 패치가 적용된 첫 controlled reboot에서 전체 remote-path 자동복구는 PASS**입니다.

다만 이는 재부팅 직후 자동복구 성공을 의미하며, 장시간 backend 생존까지 아직 확정하지는 않습니다. 다음 단계에서는 서버폰 Termux를 열지 않은 채 메인폰 direct SSH를 이용해 `~/.termux/boot-wakelock.log`와 `~/.termux/boot-wakelock-last`를 읽어 `boot_initial`, `core_wait`, `post_core_wait` 실행 결과를 확인합니다.

정확한 Tailscale 주소, 인증정보, 토큰 등 비밀/식별 정보는 기록하지 않습니다.
