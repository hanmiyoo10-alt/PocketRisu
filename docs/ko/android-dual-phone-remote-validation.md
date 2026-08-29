# Android 듀얼폰 원격 접속 최종 검증 로그

이 문서는 `docs/ko/android-dual-phone-remote-notes.md`에서 진행한 Tailscale 전환의 최종 동작 검증만 짧게 정리합니다. 공개 저장소에는 정확한 Tailscale 100.x 주소와 계정 식별 정보는 기록하지 않습니다.

## 2026-08-29

- 메인폰 core/local SSH 터널은 Tailscale 목적지로 전환된 뒤 runit 재시작에 성공함.
- 실제 SSH 프로세스가 local forward `6001`, `39117`, `39118`, `39119`를 유지한 채 Tailscale 경로를 사용함.
- 메인폰 `http://127.0.0.1:6001/api/health`가 `ok=true`, `status=ready`로 응답해 core/local 터널이 정상임을 확인함.
- 메인폰 notify/reverse SSH 터널도 Tailscale 목적지로 전환된 뒤 runit 재시작에 성공함.
- reverse `39120` 프로세스가 Tailscale 경로를 사용하며 기존 LAN reverse 세션은 사라진 것을 확인함.
- 메인폰 `pocketrisu-notify-relay`와 `receiver.cjs`는 전환 중 계속 실행 상태를 유지함.
- relay 입력 프로토콜을 INSPECT_ONLY로 확인함: `127.0.0.1:39120`, `GET /health`, token 인증이 필요한 `POST /notify`, 그리고 메인폰의 `termux-notification` 호출 구조임.
- 메인폰 로컬 relay 검증에서 `/health`가 `{"ok":true}`를 반환함.
- 메인폰 로컬 `POST /notify` 테스트가 `HTTP 200` 및 `{"ok":true}`를 반환했고, 실제 Android 알림이 메인폰에 표시됨.
- 따라서 메인폰 relay + token 인증 + Android 알림 생성 경로는 정상으로 판정함.
- 다음 검증은 서버폰의 `127.0.0.1:39120/health` 요청으로 reverse 터널을 통해 메인폰 relay까지 도달하는지 확인한 뒤, 기존 서버 발신 경로로 전체 알림 체인을 검증하는 순서로 진행함.

서버폰에는 Android 알림을 생성하지 않는다. Android 알림은 메인폰 전용이다.
