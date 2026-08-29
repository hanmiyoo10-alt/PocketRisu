# Android 듀얼폰 Termux wake lock 런타임 테스트 — 2026-08-29

## 서버폰 런타임 wake lock 해제 테스트

서버폰의 `$HOME/.termux/boot/00-pocketrisu-server`에서 부팅 시 `termux-wake-lock`을 요청하고 같은 스크립트에서 해제하지 않는 구조를 확인했다.

영구 수정 전 원본을 타임스탬프 백업했으며 원본/백업 SHA-256이 일치했다. 백업 시점에 `pocketrisu`, `sshd`는 모두 `run`, 로컬 `/api/health`는 `ok=true`, `status=ready`였다.

이후 부팅 파일을 수정하지 않고 런타임에서만 `termux-wake-unlock`을 적용한 뒤 서버폰 화면을 끈 상태로 유지했다.

약 10분 이상 경과한 동안 사용자는 메인폰에서 실제 PocketRisu 대화를 계속 사용했고 새로고침도 수행했으며 정상 동작을 확인했다. 따라서 단순 health 체크가 아니라 실제 애플리케이션 요청/응답 경로가 서버폰 화면-off + Termux wake lock 해제 상태에서도 유지된 것으로 관찰했다.

사용자 관찰상 PocketRisu를 사용하는 동안 사용자에게 보이는 호출/알림 동작은 메인폰 쪽에서만 나타났고 서버폰에서는 별도 Android 호출이 보이지 않았다. 이는 서버폰은 백엔드 처리 역할을 맡고 Android 사용자 알림은 메인폰 전용으로 유지하는 현재 듀얼폰 구성과 일치한다. 이 관찰만으로 내부 네트워크 요청 자체가 메인폰에서만 처리된다고 해석하지는 않는다.

## 서버폰 실제 전원 종료 관찰 — 2026-08-30

서버폰의 화면만 꺼진 상태에서는 wake lock을 해제한 뒤에도 PocketRisu 실사용이 계속 정상 동작했지만, 서버폰 자체 전원이 꺼진 뒤에는 메인폰 PocketRisu가 응답을 받지 못하는 것이 관찰됐다.

이는 현재 구성에서 서버폰이 PocketRisu Node 서버, sshd, Tailscale 등 실제 백엔드 경로를 담당한다는 구조와 일치한다. 즉 화면-off와 기기 power-off는 명확히 구분해야 한다.

- 화면-off + Termux wake lock 해제: 최소 약 10분 이상 실제 PocketRisu 사용 정상
- 서버폰 기기 power-off: 백엔드 전체 중단으로 메인폰 PocketRisu 응답 불가

따라서 wake lock 최적화의 목표는 서버폰 전원을 끄는 것이 아니라, 서버폰이 켜진 상태에서 화면-off/deep sleep을 허용하면서 백엔드 서비스를 안정적으로 유지하는 것이다.

## 서버폰 부팅 단계 자동 wake-unlock 스크립트 적용 — 2026-08-30

서버폰 `$HOME/.termux/boot/00-pocketrisu-server`를 수정해 wake lock을 상시 유지하지 않고 부팅 초기화 동안만 유지하도록 변경했다.

수정 전 원본은 `$HOME/.termux/boot/00-pocketrisu-server.bak-auto-unlock-20260830-003030`으로 백업했고, 원본과 백업 SHA-256이 모두 `d8a456a2bcde132acfda0f3f975de3bccb2cd1e7b21de95eba9ecb5b0e452723`으로 일치했다.

새 부팅 스크립트 동작:

- 시작 시 `termux-wake-lock` 요청
- `start-services.sh` 로딩
- `sshd` 활성화
- `pocketrisu` 서비스 기동
- 로컬 `http://127.0.0.1:6001/api/health`가 준비될 때까지 2초 간격으로 최대 약 90초 대기
- health 성공 또는 타임아웃 어느 경우든 `termux-wake-unlock` 실행
- `EXIT/HUP/INT/TERM` trap으로 중간 종료 시에도 wake lock 해제를 시도

적용 전 임시 파일에 대해 `$PREFIX/bin/sh -n` 문법 검사를 통과했고, 설치 후 실제 부팅 스크립트에 대해서도 다시 문법 검사를 통과했다. diff는 기존 상시 wake lock 구조를 위의 부팅 단계 한정 wake lock 구조로 바꾸는 내용만 포함했다.

이 단계에서는 현재 실행 중인 세션의 wake lock 상태를 변경하지 않았으며, 실제 재부팅 후 자동 health 대기와 wake lock 자동 해제가 정상 동작하는지는 아직 검증 전이다.

현재 판정:

- 서버폰 Termux wake lock 없이 최소 약 10분 화면-off 생존 성공
- PocketRisu Node 서버가 실제 요청을 계속 처리함
- 메인폰 ↔ 서버폰 SSH/Tailscale 기반 core 경로도 실제 사용 중 유지됨
- 사용자에게 보이는 Android 호출/알림은 메인폰 전용 동작과 일치함
- 서버폰 실제 전원이 꺼지면 현재 구조에서는 PocketRisu 백엔드도 함께 중단됨
- 서버폰 부팅 스크립트는 상시 wake lock에서 부팅 단계 한정 wake lock + 자동 해제 구조로 수정 완료
- 실제 재부팅 자동복구 및 자동 wake-unlock 검증은 아직 남아 있음
- 이 결과만으로 장시간(수 시간~수일) 안정성을 아직 확정하지 않음

정확한 Tailscale 주소, 계정 정보, 토큰 등 비밀/식별 정보는 기록하지 않는다.
