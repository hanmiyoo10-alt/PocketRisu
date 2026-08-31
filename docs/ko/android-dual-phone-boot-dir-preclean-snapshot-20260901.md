# Android 듀얼폰: Termux:Boot 정리 전 스냅샷 검증 (2026-09-01)

## 상황

서버폰의 `~/.termux/boot/` 안에 현재 사용 중인 부팅 스크립트 외에도 여러 `.bak-*` 백업 파일이 남아 있었고, 이 중 하나에는 `termux-wake-unlock` 경로가 포함되어 있었다.

## 백업 단계

수정 전에 전체 부팅 디렉터리를 별도 위치로 복제했다.

- 원본: `~/.termux/boot/`
- 스냅샷: `~/.termux/boot-snapshot-pre-clean-20260901-035643/`

원본과 스냅샷의 모든 일반 파일 목록을 비교했고, 각 파일의 SHA-256을 계산해 전체 diff를 확인했다.

결과:

- `BACKUP_VERIFY=PASS`
- 원본 active boot 디렉터리는 아직 수정되지 않음
- 파일 이동 없음
- wake lock 변경 없음
- 서비스 재시작 없음

## 당시 active boot 디렉터리 파일

- `00-boot-probe`
- `00-pocketrisu-server`
- `00-pocketrisu-server.bak-auto-unlock-20260830-003030`
- `00-pocketrisu-server.bak-persistent-wakelock-20260830-174711`
- `00-pocketrisu-server.bak-pre-instrument-20260830-210504`
- `00-pocketrisu-server.bak-wakelock-20260829-201511`
- `50-taskbridge`

## 다음 단계

스냅샷이 해시까지 검증되었으므로 다음 수정 단계에서는 `.bak-*` 4개만 `~/.termux/boot/` 밖으로 격리하고, 실제 active 스크립트 3개가 그대로 남는지 검증한다.

민감한 네트워크 주소나 인증 정보는 기록하지 않는다.
