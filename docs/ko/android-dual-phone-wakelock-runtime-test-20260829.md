# Android 듀얼폰 Termux wake lock 런타임 테스트 — 2026-08-29

## 서버폰 런타임 wake lock 해제 테스트

서버폰의 `$HOME/.termux/boot/00-pocketrisu-server`에서 부팅 시 `termux-wake-lock`을 요청하고 같은 스크립트에서 해제하지 않는 구조를 확인했다.

영구 수정 전 원본을 타임스탬프 백업했으며 원본/백업 SHA-256이 일치했다. 백업 시점에 `pocketrisu`, `sshd`는 모두 `run`, 로컬 `/api/health`는 `ok=true`, `status=ready`였다.

이후 부팅 파일을 수정하지 않고 런타임에서만 `termux-wake-unlock`을 적용한 뒤 서버폰 화면을 끈 상태로 유지했다.

약 10분 이상 경과한 동안 사용자는 메인폰에서 실제 PocketRisu 대화를 계속 사용했고 새로고침도 수행했으며 정상 동작을 확인했다. 따라서 단순 health 체크가 아니라 실제 애플리케이션 요청/응답 경로가 서버폰 화면-off + Termux wake lock 해제 상태에서도 유지된 것으로 관찰했다.

현재 판정:

- 서버폰 Termux wake lock 없이 최소 약 10분 화면-off 생존 성공
- PocketRisu Node 서버가 실제 요청을 계속 처리함
- 메인폰 ↔ 서버폰 SSH/Tailscale 기반 core 경로도 실제 사용 중 유지됨
- 이 결과만으로 장시간(수 시간~수일) 안정성을 아직 확정하지 않음
- notify reverse 경로는 이 wake-lock 해제 세션에서 별도 검증 예정
- 영구 부팅 스크립트 수정은 notify 및 추가 생존 검증 뒤 진행

정확한 Tailscale 주소, 계정 정보, 토큰 등 비밀/식별 정보는 기록하지 않는다.
