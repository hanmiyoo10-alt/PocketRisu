# 듀얼폰 2차 재부팅: Tailscale `제한 없음` 적용 후 자동복구 PASS (2026-09-01)

## 목적
첫 번째 통제 재부팅에서는 서버폰의 Termux/runit/PocketRisu 스택이 백그라운드에서 살아 있었음에도 Tailscale 피어가 보이지 않아 메인폰에서 SSH/core 접근이 모두 timeout 상태였다. 서버폰에서 Tailscale 앱을 포그라운드로 열자 경로가 즉시 복구되었다.

그 후 서버폰의 Tailscale Android 앱 배터리 설정을 `최적화`에서 `제한 없음`으로 변경하고 두 번째 통제 재부팅을 실시했다.

## 조건
- 서버폰 Termux UI 열지 않음.
- 서버폰 Tailscale 앱 열지 않음.
- active `~/.termux/boot/`에는 다음 3개만 유지:
  - `00-boot-probe`
  - `00-pocketrisu-server`
  - `50-taskbridge`
- 과거 `.bak-*` 부팅 스크립트 4개는 active boot 디렉터리 밖으로 격리됨.
- active boot 파일에서 `termux-wake-unlock` 없음.
- Tailscale Android 배터리 설정: `제한 없음`.
- Android Always-on VPN 설정은 기존대로 ON.

## 2차 재부팅 후 메인폰 검사
검사 시각: `2026-09-01T04:40:42+0900`.

### 피어 경로
- `peer_ping=PASS`

즉 첫 번째 재부팅과 달리 서버폰 Tailscale 피어가 앱을 수동으로 열지 않은 상태에서 자동으로 도달 가능해졌다.

### 메인 SSH 터널
- `pocketrisu-ssh-tunnel`: 현재 세션 age 약 34초
- `pocketrisu-notify-tunnel`: 현재 세션 age 약 35초

두 독립 터널이 모두 자동으로 재연결되었다.

### forwarded 서비스
- PocketRisu core: HTTP `200`
- local-usage engine: HTTP `200`
- manager: HTTP `401`

manager의 `401`은 서비스 미기동 실패가 아니라 인증 없는 요청에 대한 정상 거절로, manager endpoint까지 실제 도달했다는 증거다.

## 부팅 초기 오류 순서
SSH tunnel 로그의 최근 이벤트:
- 일시적으로 `ssh: connect to host ... port 8022: Connection refused`
- 이어서 `channel ... open failed: connect failed: Connection refused`
- 이후 현재 core/engine은 HTTP 200

해석:
1. Tailscale 경로가 먼저 복구됨.
2. 그 시점에는 sshd가 아직 listen 전이라 port 8022가 잠시 `Connection refused`.
3. sshd가 뜬 뒤 SSH 터널이 연결됨.
4. 터널 연결 직후 PocketRisu 6001 등 forwarded target이 아직 준비 전이라 channel-level `Connection refused`가 잠시 발생.
5. 이후 PocketRisu/core와 engine이 정상 준비되어 HTTP 200.

이는 `Tailscale → sshd → PocketRisu/core`의 정상적인 초기 부팅 순서와 일치한다.

## 결론
이번 두 번째 통제 재부팅에서는 서버폰에서 Tailscale 앱이나 Termux를 수동으로 열지 않았음에도 다음이 모두 자동복구되었다.

- Tailscale 피어 도달성
- SSH core tunnel
- SSH notify tunnel
- PocketRisu core
- local-usage engine
- manager endpoint

따라서 `Tailscale 배터리: 최적화 → 제한 없음` 변경 이후에는 재부팅 후 Tailscale 자동복구가 성공한 실증 사례가 확보되었다.

다만 단일 성공 재부팅만으로 배터리 최적화가 유일한 원인이었다고 단정하지 않는다. 현재 정확한 표현은 다음과 같다.

> 첫 번째 재부팅: Always-on VPN ON이었지만 Tailscale 피어 자동복구 실패. Tailscale 앱을 포그라운드로 열자 즉시 경로 복구.
>
> Tailscale 배터리 설정을 `제한 없음`으로 변경한 뒤 두 번째 재부팅: Tailscale 앱을 열지 않고도 피어/SSH/core가 자동복구됨.

향후 재부팅 반복 및 장시간 soak에서 동일 자동복구가 재현되는지 확인하면 인과 신뢰도를 더 높일 수 있다.

## 보안 메모
실제 Tailscale 주소, SSH endpoint, 토큰, 인증값은 문서에 기록하지 않는다.
