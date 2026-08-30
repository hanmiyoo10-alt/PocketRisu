# Android 듀얼폰 persistent wake lock 재부팅 검증 — 2026-08-30

## 배경

서버폰에서 wake lock 없이 장기 운용했을 때 Termux/runit/sshd 전체 서비스 그룹이 사라지는 장애가 반복 재현되었고, `Disable child process restrictions=ON`만으로는 장기 생존을 보장하지 못했습니다. 반면 wake lock을 유지한 동안에는 동일한 완전 단절이 재현되지 않아, 운영 기본값을 persistent wake lock으로 되돌리기로 했습니다.

서버폰 Termux:Boot의 `00-pocketrisu-server`는 기존에 부팅 초기에만 `termux-wake-lock`을 획득한 뒤 core health가 준비되거나 타임아웃되면 `termux-wake-unlock`을 호출하도록 되어 있었습니다. 이를 백업한 뒤 자동 unlock/trap 경로를 제거하고 부팅 후 wake lock을 계속 유지하도록 최소 수정했습니다.

패치 후 boot script SHA-256은 `f54c9bb1b68a6d41a05ff257f5adfdf71a6c40b069f8ccd0ef3a0e10c9f09004`이며, shell syntax 검증은 PASS였습니다. 패치 직후 기존 `runsvdir`, sshd, PocketRisu, bridge는 유지되었고 core/engine health는 모두 HTTP 200이었습니다.

중간에 local-usage manager/engine pair의 PID가 바뀐 것은 별도 조사 결과 manager의 `LUD_MANAGER_RESTART_MODE=runit` 설정과 self-update/engine sync 경로가 실제로 활성화되어 있고, 같은 시간대에 manager/CLI/engine/adopted descriptor가 순차 갱신된 사실이 확인되어 persistent wake lock 패치 문제와 분리했습니다.

## 재부팅 관찰

서버폰을 Android 전원 메뉴에서 정상 재부팅했습니다.

재부팅 완료 후 사용자 관찰:

- 서버폰은 정상 부팅됨
- Termux UI는 다시 화면에서 사라짐

이 현상만으로는 backend 실패로 판정하지 않습니다. 이전에도 Termux UI가 보이지 않는 상태에서 Termux:Boot가 실행되어 sshd/PocketRisu/local-usage backend가 정상 동작한 사례가 있었기 때문입니다. persistent wake lock의 목적도 Termux UI를 계속 표시하는 것이 아니라 background service stack의 생존을 유지하는 것입니다.

따라서 현재 서버폰에서는 Termux를 직접 다시 열지 않고 실패/성공 상태를 보존합니다. 다음 검증은 메인폰에서만 수행합니다.

1. main의 `pocketrisu-ssh-tunnel` / `pocketrisu-notify-tunnel` 상태와 age 확인
2. forwarded core / engine HTTP health 확인
3. 필요 시 실제 tunnel destination으로 direct SSH 8022를 1회 시도해 sshd 생존 여부 분류
4. 원격 경로가 PASS면 서버폰 UI를 열지 않은 상태에서 boot autorecovery가 성공한 것으로 판단
5. 원격 경로가 FAIL이면 실패 유형을 먼저 보존한 뒤 서버폰 Termux를 열지 여부를 결정

정확한 Tailscale 주소, 계정 정보, 인증 토큰 등 비밀/식별 정보는 기록하지 않습니다.
