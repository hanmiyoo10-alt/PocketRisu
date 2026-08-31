# 듀얼폰 재부팅 후 서버 스택 25분 생존 및 Tailscale 분리 증거 (2026-09-01)

## 관찰 시각

- 메인폰 검사: 2026-09-01 04:35:25 KST
- 서버폰 원격 시각: 2026-09-01 04:35:26 KST

## 전제

- 서버폰 Android를 통제 재부팅함.
- 서버폰 Termux UI는 재부팅 후 한 번도 열지 않음.
- `~/.termux/boot/` 내 과거 `.bak-*` 부팅 스크립트 4개는 사전에 active boot 디렉터리 밖으로 격리함.
- active boot 파일은 다음 3개만 유지됨.
  - `00-boot-probe`
  - `00-pocketrisu-server`
  - `50-taskbridge`
- Tailscale은 재부팅 후 피어가 보이지 않았고, 서버폰에서 Tailscale 앱을 포그라운드로 연 직후 원격 경로가 복구됨.

## 원격 서버 서비스 상태

메인폰에서 SSH로 서버폰에 접속해 확인한 결과 주요 runit 서비스가 모두 같은 세대에서 약 1503초(약 25분 3초) 동안 연속 실행 중이었다.

- `sshd`: run, age 1503s
- `pocketrisu`: run, age 1503s
- `llmgateway-bridge`: run, age 1503s
- `local-usage-runtime-manager`: run, age 1503s
- `local-usage-runtime-engine`: run, age 1503s

## wake-lock marker

`~/.termux/boot-wakelock-last`:

```text
time=2026-09-01T04:10:37+0900
phase=post_core_wait
rc=0
```

이번 재부팅 세대에서 Termux:Boot가 실행되었고 `post_core_wait`까지 도달한 기록이다.

주의: wrapper `rc=0` 자체만으로 Android wake lock이 이후 계속 유지되었다는 직접 증거는 아니다.

## active boot 경로 검증

active boot 파일:

```text
00-boot-probe
00-pocketrisu-server
50-taskbridge
```

`termux-wake-unlock` 검색 결과:

```text
ACTIVE_WAKE_UNLOCK=NONE
```

즉 과거 `.bak-*` 파일에 존재하던 `termux-wake-unlock` 경로는 active boot 대상에서 제거된 상태다.

## 해석

이번 세대에서는 서버 Termux UI를 열지 않았음에도 Termux/runit/sshd/PocketRisu/bridge/manager/engine이 재부팅 직후 자동 기동되었고, 약 25분 이상 같은 세대로 생존했다.

이는 과거 관찰된 "부팅 후 약 11분 뒤 sshd/Termux 세대 재소실" 경계를 충분히 넘긴다. 따라서 `.bak-*` 부팅 스크립트 격리와 함께 과거 wake-unlock race 후보가 제거된 것이 재소실 방지에 기여했을 가능성이 매우 높다.

다만 단일 재부팅 세대만으로 장기 안정성이 완전히 해결되었다고 단정하지는 않는다. 추가 재부팅/장기 soak 검증이 필요하다.

## Tailscale 문제와 분리

이번 재부팅 직후 메인폰에서는 서버 Tailscale 피어 ping이 100% loss였고 SSH 8022는 `Connection timed out`을 반복했다. 그러나 서버폰에서 Tailscale 앱을 포그라운드로 연 직후:

- peer ping PASS
- SSH 터널 재연결 및 안정 유지
- PocketRisu core 200
- local-usage engine 200
- manager 401(도달 성공 + 인증 필요)

가 즉시 확인되었다.

따라서 이번 재부팅에서 서버 스택 자체는 이미 살아 있었고, 원격 경로를 막은 별도 문제는 **Tailscale VPN 세션의 post-reboot 자동 기동 실패**로 분리할 수 있다.

현재 서버폰 Tailscale 설정은:

- Always-on VPN: ON
- Block connections without VPN: OFF
- Battery: 변경 전 `최적화`, 이후 `제한 없음`

배터리를 `제한 없음`으로 바꿔도 이미 멈춘 Tailscale 세션이 즉시 자동 복구되지는 않았다. 다음 통제 재부팅에서 `제한 없음` 상태가 post-reboot 자동기동에 영향을 주는지 별도 검증해야 한다.

## 현재 결론

1. Termux/PocketRisu 부팅 자동기동: PASS
2. 서버 스택 25분 이상 연속 생존: PASS
3. 과거 11분 재소실 재현: 이번 세대에서는 미재현
4. active `termux-wake-unlock`: 없음
5. `.bak-*` 격리 효과: 매우 유력한 개선 후보
6. Tailscale post-reboot 자동 연결: 별도 FAIL
7. Tailscale 앱 포그라운드 진입 후 원격 경로 복구: PASS

정확한 사설 IP, 인증 토큰, 키, webhook secret 등은 기록하지 않는다.
