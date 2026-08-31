# Android 듀얼폰: Termux:Boot 활성 디렉터리의 백업 스크립트와 wake-lock race 후보 (2026-09-01)

## 배경
서버폰의 `~/.termux/boot/`를 INSPECT_ONLY로 확인한 결과, 현재 활성 스크립트 외에도 과거 백업 스크립트 여러 개가 같은 디렉터리에 일반 파일로 남아 있었다.

확인된 파일 중 다음 백업은 `mode=700`이고, 내부에 wake lock 해제 로직을 포함한다.

- `00-pocketrisu-server.bak-persistent-wakelock-20260830-174711`

핵심 로직:

```sh
termux-wake-lock >/dev/null 2>&1 || true

release_wakelock() {
  termux-wake-unlock >/dev/null 2>&1 || true
}

trap release_wakelock EXIT HUP INT TERM
...
# PocketRisu health 대기 후
release_wakelock
trap - EXIT HUP INT TERM
exit 0
```

따라서 이 파일이 실제 Termux:Boot 실행 대상이면, 현재 활성 스크립트가 취득한 Termux wake lock과 충돌할 수 있다.

## Termux:Boot upstream 동작 확인
공식 `termux/termux-boot` 구현을 확인했다.

- `BootReceiver.java`는 `~/.termux/boot/`의 `listFiles()` 결과에서 모든 일반 파일을 대상으로 한다.
- 파일명 기준으로 정렬한 뒤 각각 JobScheduler job을 등록한다.
- `ensureFileReadableAndExecutable()`를 호출하므로 실행 비트를 제거하는 것만으로 실행 제외를 보장할 수 없다.
- `BootJobService.java`는 각 job에서 Termux `TermuxService`에 background execute intent를 넘긴 뒤 `return false`로 job을 종료한다.
- 따라서 파일명 순서는 job 등록 순서를 제공하지만, 각 스크립트의 실제 완료까지 직렬 대기한다고 가정하면 안 된다.

Upstream 참고 경로:

- `termux/termux-boot/app/src/main/java/com/termux/boot/BootReceiver.java`
- `termux/termux-boot/app/src/main/java/com/termux/boot/BootJobService.java`
- `termux/termux-boot/README.md`

## 현재 서버폰에서 확인된 active boot 파일
INSPECT_ONLY 시점:

- `00-boot-probe`
- `00-pocketrisu-server`
- `00-pocketrisu-server.bak-auto-unlock-20260830-003030`
- `00-pocketrisu-server.bak-persistent-wakelock-20260830-174711`
- `00-pocketrisu-server.bak-pre-instrument-20260830-210504`
- `00-pocketrisu-server.bak-wakelock-20260829-201511`
- `50-taskbridge`

즉 `.bak-*`라는 이름은 Termux:Boot에서 비활성 백업을 의미하지 않는다.

## wake-lock race 후보
현재 활성 `00-pocketrisu-server`는 boot 초기와 `post_core_wait`에서 `termux-wake-lock`을 호출한다.

동시에 백업 파일들에도 다음이 섞여 있다.

- wake lock 취득만 하는 옛 스크립트
- PocketRisu health까지 기다린 뒤 `termux-wake-unlock`을 호출하는 옛 스크립트

Termux wake lock은 단일 TermuxService 수준의 shared wake lock 동작이므로, 여러 스크립트가 겹쳐 실행되는 동안 한 스크립트의 `termux-wake-unlock`이 다른 스크립트가 기대한 지속 lock까지 해제하는 race가 생길 수 있다.

이는 다음 관찰과 잘 맞는 강한 원인 후보다.

- 2026-09-01 02:11:43 KST `boot_initial rc=0`
- 02:11:46 KST sshd listen
- 02:11:47~48 KST 메인 SSH/notify 연결 인증 성공
- 02:12:00 KST `post_core_wait rc=0`, `core_ready=1`
- 약 02:22:51~58 KST부터 두 메인 터널 모두 다시 sshd `Connection refused`

즉 부팅 직후 정상 서비스 상태가 만들어진 뒤 약 11분 내 Termux/runit/sshd 전체가 다시 사라졌다.

## 판정
- 백업 파일이 active Termux:Boot 디렉터리에 남아 있는 것은 구성 오류다.
- `chmod -x`만으로는 Termux:Boot 실행 제외를 보장하지 못한다.
- 특히 `bak-persistent-wakelock`의 unconditional wake unlock은 현재 persistent wake-lock 설계와 충돌하는 강한 race 후보다.
- 다만 아직 이것 하나만으로 02:22 재소실의 유일한 root cause라고 단정하지 않는다.

## 다음 안전 단계
1. active boot 디렉터리 전체를 디렉터리 밖으로 별도 백업한다.
2. hash/파일 목록을 검증한다.
3. `.bak-*` 파일들을 `~/.termux/boot/` 밖의 archive 디렉터리로 이동한다.
4. active boot 디렉터리에는 실제 실행 의도 파일만 남긴다.
5. 이후 controlled reboot에서 wake marker, sshd, PocketRisu, main SSH/notify 터널을 다시 검증한다.

## 비밀정보 처리
개인 Tailscale IP, 인증 토큰, webhook secret 등은 기록하지 않았다.
