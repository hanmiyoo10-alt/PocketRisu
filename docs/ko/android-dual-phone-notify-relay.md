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

## 전체 알림 체인 최종 검증 — 2026-08-29

서버폰에서 실제 PocketRisu 서버 endpoint `POST /api/termux-notify`를 localhost로 호출해 전체 체인을 검증했습니다.

검증 시 서버폰 PocketRisu `GET /api/health`는 `ok=true`, `status=ready`로 응답했고, 이어서 `POST /api/termux-notify`가 HTTP 200과 `{ "ok": true }`를 반환했습니다. 같은 요청으로 메인폰 Android에 실제 PocketRisu 알림이 표시된 것도 확인했습니다.

검증된 전체 경로:

```text
서버폰 PocketRisu
  → /api/termux-notify
  → 서버폰 127.0.0.1:39120
  → Tailscale reverse SSH
  → 메인폰 receiver.cjs
  → 메인폰 termux-notification
  → 메인폰 Android 알림 표시
```

따라서 PocketRisu notify relay의 Tailscale 전환은 end-to-end 기준으로 완료로 판정합니다. 서버폰은 relay 요청만 전달하며 Android 알림은 생성하지 않습니다.

## 서로 다른 망 실사용 조건 확인 — 2026-08-29

사용자 확인 기준으로 메인폰은 위 후반 검증들을 수행하기 전부터 약 30분 동안 Wi-Fi를 끄고 모바일 데이터만 사용하고 있었습니다. 서버폰은 기존 Wi-Fi 연결 상태를 유지했습니다.

따라서 해당 시간대에 성공한 다음 검증들은 동일 LAN이 아니라 서로 다른 액세스 네트워크에서 Tailscale을 통해 수행된 것으로 판정합니다.

- 메인폰 core/local tunnel을 통한 PocketRisu `/api/health` 성공
- notify reverse `39120` tunnel 정상 유지
- 서버폰 `127.0.0.1:39120/health` → 메인폰 relay HTTP 200
- 서버폰 `POST /api/termux-notify` → 메인폰 실제 Android 알림 도착

터미널 출력만으로 Wi-Fi OFF 상태 자체를 독립적으로 증명할 수는 없으므로 이 판정은 테스트 당시 메인폰이 모바일 데이터 전용이었다는 사용자 확인을 조건으로 기록합니다. 이 조건하에서는 서로 다른 망에서의 core + notify end-to-end 실사용 검증까지 완료된 상태입니다.
