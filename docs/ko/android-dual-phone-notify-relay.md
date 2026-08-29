# Android 듀얼폰 알림 relay 메모

PocketRisu를 서버폰과 메인폰으로 분리 운용할 때 Android 알림을 **메인폰에서만** 생성하기 위한 relay 구조와 검증 상태를 기록합니다.

> 관련 네트워크/Tailscale 전환 기록은 `docs/ko/android-dual-phone-remote-notes.md`를 참고합니다.

## 역할 분리

- 서버폰
  - PocketRisu 본체와 `pocketrisu` 서비스 실행
  - Android 알림은 생성하지 않음
  - PocketRisu 서버의 로컬 relay endpoint에서 메인폰 쪽 reverse tunnel로 알림 요청 전달
- 메인폰
  - `pocketrisu-notify-tunnel`이 서버폰 SSH에 reverse forward `127.0.0.1:39120` 제공
  - `pocketrisu-notify-relay`가 `receiver.cjs`를 실행
  - 실제 Android 알림은 메인폰의 `termux-notification`으로 생성

## 서버폰 로컬 구현 확인 — 2026-08-29

서버폰의 현재 작업 트리 `server/node/server.cjs`는 Git HEAD와 다른 로컬 수정 상태이며, 다음 relay 구현이 포함되어 있음을 INSPECT_ONLY로 확인했습니다.

- `POST /api/termux-notify`
- 요청 소켓의 remote address가 loopback일 때만 허용
  - `127.0.0.1`
  - `::1`
  - `::ffff:127.0.0.1`
- 서버폰의 `$HOME/.config/pocketrisu-notify-relay/token`을 읽음
- `http://127.0.0.1:39120/notify`로 POST
- 헤더 `X-PocketRisu-Notify-Token`에 relay token을 전달
- 요청 body를 JSON으로 그대로 relay
- relay 호출 timeout은 5초
- relay가 실패하면 502, token을 읽지 못하거나 비어 있으면 503 반환
- 성공 시 `{ "ok": true }` 반환

현재 서버폰 작업 트리에서 위 relay 마커는 확인됐지만, Git HEAD의 `server/node/server.cjs`에서는 동일 마커가 확인되지 않았습니다. 서버폰의 로컬 파일은 Git HEAD 대비 큰 변경량이 있으므로 파일 전체를 저장소 버전으로 덮어쓰거나 반대로 전체 로컬 파일을 그대로 upstream에 반영하지 않습니다. relay 관련 변경은 별도로 분리해 검토해야 합니다.

서버폰에 남아 있던 `server.cjs.bak-notify-relay-20260819-175043`과 `server.cjs.bak-notify-relay-20260819-175242`는 서로 SHA-256이 동일했고, 위 relay 마커가 없었습니다. 따라서 이름과 달리 notify relay 패치 적용 전 상태를 보존한 백업으로 해석됩니다.

## 메인폰 relay 구현 확인 — 2026-08-29

메인폰의 `pocketrisu-notify-relay`는 `receiver.cjs`를 실행하며 다음을 확인했습니다.

- `127.0.0.1:39120`에서만 수신
- `GET /health` → `{ "ok": true }`
- `POST /notify`만 알림 요청으로 허용
- `x-pocketrisu-notify-token` 헤더를 로컬 token과 비교
- 인증된 요청의 JSON body에서 `stage`, `elapsedMs`, `character`, `model`, `sound`를 읽음
- 실제 Android 알림은 메인폰의 `termux-notification`으로 생성

서버폰에는 Android 알림을 생성하지 않습니다.

## Tailscale reverse tunnel 연결

메인폰의 `pocketrisu-notify-tunnel`은 서버폰 SSH에 다음 reverse forward를 제공합니다.

```text
-R 127.0.0.1:39120:127.0.0.1:39120
```

SSH 목적지는 기존 LAN 주소에서 서버폰의 Tailscale 주소로 전환됐으며, 공개 문서에는 정확한 100.x 주소를 기록하지 않습니다.

이 구조 때문에 서버폰의 `http://127.0.0.1:39120/...` 요청은 서버폰에서 Android 알림을 만드는 것이 아니라 reverse SSH를 통해 메인폰의 loopback relay에 도달합니다.

## 검증 결과 — 2026-08-29

- 메인폰 relay 로컬 health: 성공
- 메인폰 `POST /notify`: HTTP 200 / `{ "ok": true }`
- 위 로컬 notify 테스트에서 메인폰 Android 알림 실제 표시 확인
- notify SSH 프로세스가 Tailscale 목적지로 실행 중임을 확인
- 기존 LAN reverse SSH 프로세스가 사라진 것을 확인
- 서버폰에서 `GET http://127.0.0.1:39120/health`: HTTP 200 / `{ "ok": true }`
- 따라서 `서버폰 localhost → Tailscale reverse SSH → 메인폰 relay` 구간은 실제 HTTP 요청 기준으로 정상
- core/local SSH tunnel 및 `/api/health`도 동시에 정상 유지

## 아직 남은 최종 검증

서버폰에서 실제 PocketRisu 서버 endpoint `POST /api/termux-notify`를 localhost로 호출해 다음 전체 체인을 한 번 검증해야 합니다.

```text
서버폰 PocketRisu
  → /api/termux-notify
  → 서버폰 127.0.0.1:39120
  → Tailscale reverse SSH
  → 메인폰 receiver.cjs
  → 메인폰 termux-notification
```

이 테스트에서도 Android 알림은 메인폰에만 생성되어야 합니다.
