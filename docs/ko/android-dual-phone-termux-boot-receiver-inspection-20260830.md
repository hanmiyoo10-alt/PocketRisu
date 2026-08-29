# Android 듀얼폰 Termux:Boot receiver 점검 — 2026-08-30

서버폰 재부팅 뒤 Tailscale 경로는 도달했지만 sshd 8022가 자동 기동하지 않아, Termux:Boot 앱/receiver 상태를 별도 점검한 기록입니다.

## 확인 결과

- `cmd package path com.termux.boot`는 APK 경로를 정상 반환하므로 Termux:Boot 설치는 확인됨
- `termux-info`에도 `com.termux.boot versionCode:1000`이 표시됨
- `cmd package list packages -e`에 `com.termux.boot`가 나타남
- disabled package 목록에는 나타나지 않음
- launcher activity는 `com.termux.boot/.BootActivity`로 정상 resolve됨
- `BOOT_COMPLETED` receiver는 `com.termux.boot/.BootReceiver`로 정상 resolve됨
- `cmd package dump`/`dumpsys package`는 Termux UID에 `android.permission.DUMP`가 없어 package `stopped=` 상태를 읽지 못함
- 일반 `pm` 명령은 현재 환경에서 `Failed transaction (2147483646)`로 실패하므로 package 상태 판정에 사용하지 않음

따라서 **Termux:Boot 미설치, package disabled, launcher activity 부재, BOOT_COMPLETED receiver 부재 가설은 모두 탈락**했습니다.

## 공식 사용 조건과 현재 가설

공식 `termux/termux-boot` README의 How to use는 설치 후 launcher icon으로 Termux:Boot 앱을 한 번 실행해야 boot 시 실행될 수 있다고 명시합니다.

현재 서버폰에서는 package의 `stopped=true/false`를 권한상 직접 읽을 수 없고, 이전에 Termux:Boot launcher activity를 실제로 한 번 실행했는지도 확정되지 않았습니다. 따라서 다음 최소 조치는 다른 서비스/스크립트를 수정하지 않고 `BootActivity`를 한 번 명시적으로 실행해 이 공식 초기 활성화 조건을 충족시키는 것입니다.

그 뒤 서버폰을 다시 재부팅해, 서버폰 앱을 수동으로 열지 않은 상태에서 메인폰 SSH가 8022에 접속 가능한지부터 재검증합니다. 성공하면 runit/PocketRisu/local-usage bridge와 실제 PocketRisu 연결까지 이어서 확인합니다.

정확한 Tailscale 주소, 계정 정보, 인증 토큰 등 비밀/식별 정보는 기록하지 않습니다.
