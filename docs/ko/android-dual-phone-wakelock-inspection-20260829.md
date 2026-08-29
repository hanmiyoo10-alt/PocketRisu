# Android 듀얼폰 Termux wake lock 점검 — 2026-08-29

PocketRisu 듀얼폰 구성의 배터리/발열 최적화를 위해 메인폰과 서버폰의 Termux wake lock 상태를 분리 점검한 기록입니다.

## 서버폰 wake lock 출처

서버폰의 `$HOME/.termux/boot/00-pocketrisu-server` 내용을 INSPECT_ONLY로 확인했습니다.

```sh
#!/data/data/com.termux/files/usr/bin/sh

termux-wake-lock >/dev/null 2>&1

. "$PREFIX/etc/profile.d/start-services.sh" 2>/dev/null || true
sleep 2

sv-enable sshd >/dev/null 2>&1 || true
sv up "$PREFIX/var/service/pocketrisu" >/dev/null 2>&1 || true
```

관찰 결과:

- 3번째 줄에서 `termux-wake-lock`을 요청합니다.
- 같은 부팅 스크립트 안에는 `termux-wake-unlock`이 없습니다.
- wake lock 요청 이후의 로직은 `start-services.sh` 로드, 2초 대기, `sshd` 활성화, `pocketrisu` 기동입니다.
- 따라서 wake lock 자체는 서비스 기동 명령과 별개이며, 부팅 스크립트는 서비스 시작 후 wake lock을 명시적으로 해제하지 않는 구조입니다.
- 영구 제거 여부는 아직 결정하지 않았습니다. 먼저 `termux-wake-unlock`을 임시 적용한 상태에서 화면-off 서버 접근/SSH/PocketRisu 안정성을 A/B 검증합니다.

## 검사 명령 주의점

이전 `$PREFIX/var/service` 재귀 `grep -R` 검사는 runit의 FIFO/특수 파일을 읽으려다 블록될 가능성이 있었습니다. 이후 서비스 트리 검사는 `run` 같은 일반 파일만 명시적으로 검사하며, 재귀 grep으로 `supervise/control` 등을 읽지 않습니다.

## 다음 단계

1. 서버폰 부팅 스크립트는 수정하지 않은 상태를 유지합니다.
2. 영구 수정 전에 로컬 백업을 만듭니다.
3. 파일 수정 없이 `termux-wake-unlock`을 임시 적용합니다.
4. 화면을 끈 상태에서 일정 시간 후 메인폰에서 PocketRisu/core 접근과 서버 SSH가 유지되는지 확인합니다.
5. 안정성이 확인된 뒤에만 부팅 스크립트의 wake lock 제거 또는 조건부 사용을 검토합니다.

메인폰도 동일 원칙으로 별도 확인합니다.
