# Android 듀얼폰 장기 soak 재발 — 단계적 실패 타임라인 (2026-09-01)

## 배경

wake-lock 계측/2회 요청 boot script 적용 후 서버폰 Termux UI를 열지 않은 상태에서 장기 생존 검증을 수행했습니다.

확인된 마지막 완전 정상 시점:

- `2026-08-31 03:49:52 +0900`
- main SSH/notify tunnel 정상
- forwarded core/engine HTTP 200
- direct SSH 8022 PASS
- server sshd/PocketRisu/bridge 정상

이후 `2026-09-01 02:30 +0900` 무렵에는 main tunnel 재시작 루프, forwarded core/engine HTTP 000, direct SSH 8022 `Connection refused`가 확인되어 장기 재발 케이스로 분리했습니다.

## main SSH tunnel 로그 위치

`pocketrisu-ssh-tunnel/log/run`:

```sh
#!/data/data/com.termux/files/usr/bin/sh
mkdir -p "$HOME/.local/state/pocketrisu-ssh-tunnel"
exec svlogd -tt "$HOME/.local/state/pocketrisu-ssh-tunnel"
```

따라서 실제 SSH tunnel 로그는 다음에 저장됩니다.

- `$HOME/.local/state/pocketrisu-ssh-tunnel/current`

`svlogd -tt` 로그 시각은 UTC 형태로 기록되므로 KST 해석 시 +9시간을 적용합니다.

## 단계 1: forwarded target refusal

마지막 완전 정상 시점 이후 첫 `Connection refused`를 넓게 찾으면 다음 로그가 확인됩니다.

```text
2026-08-31_04:38:43.73282 channel 5: open failed: connect failed: Connection refused
```

이는 KST로:

- `2026-08-31 13:38:43 +0900`

입니다.

중요하게도 이 메시지는

```text
ssh: connect to host ... port 8022: Connection refused
```

형태가 아니라, 이미 살아 있는 SSH 세션 내부에서 특정 forwarding channel을 열다가 remote-side target connect가 거부된 형태입니다.

따라서 이 시점의 증거만으로 sshd 자체 사망으로 분류하지 않습니다. 오히려 SSH transport는 살아 있는 상태에서 remote-side forwarded target 중 하나 이상이 먼저 듣지 않게 된 가능성이 높습니다.

## 단계 2: SSH transport timeout

별도로 `ssh: connect to host ... port 8022` 형태의 transport-level 실패를 좁혀 확인한 결과, 다음과 같이 timeout이 먼저 연속 발생합니다.

```text
2026-08-31_17:07:56.64320 ssh: connect to host [PRIVATE_IP] port 8022: Connection timed out
2026-08-31_17:08:07.70811 ssh: connect to host [PRIVATE_IP] port 8022: Connection timed out
...
2026-08-31_17:10:31.62731 ssh: connect to host [PRIVATE_IP] port 8022: Connection timed out
```

KST로는:

- 최초 확인 timeout: `2026-09-01 02:07:56 +0900`

입니다.

이 구간에는 새 SSH 연결 시도에 대한 응답 자체가 없었습니다.

## 단계 3: SSH transport refusal

timeout 연속 이후 다음과 같이 `Connection refused`로 전환됩니다.

```text
2026-08-31_17:10:33.84662 ssh: connect to host [PRIVATE_IP] port 8022: Connection refused
2026-08-31_17:10:34.91904 ssh: connect to host [PRIVATE_IP] port 8022: Connection refused
```

KST로는:

- 최초 transport refusal: `2026-09-01 02:10:33 +0900`

입니다.

즉 관측된 순서는 다음과 같습니다.

1. `2026-08-31 03:49:52 KST`: 전체 정상
2. `2026-08-31 13:38:43 KST`: 기존 SSH 세션 내부에서 forwarded target `Connection refused`
3. `2026-09-01 02:07:56 KST`: 새 SSH transport `Connection timed out`
4. `2026-09-01 02:10:33 KST`: 새 SSH transport `Connection refused`
5. `2026-09-01 02:30 KST` 이후: main tunnel 재시작 루프, forwarded core/engine `000`, direct SSH refusal 지속

## 현재 해석

현재 증거는 실패가 한 시점에 전체적으로 동시에 발생했다기보다 단계적으로 진행되었을 가능성을 강하게 시사합니다.

- 먼저 remote-side forwarded target 중 하나 이상이 사라짐
- 이후 훨씬 나중에 SSH transport 자체가 timeout 상태로 전환
- 다시 수분 뒤 네트워크 경로는 닿지만 8022에서 sshd가 듣지 않는 `Connection refused` 상태로 전환

따라서 "wake-lock이 즉시 풀려 whole Termux/runit/sshd가 한 번에 사망"으로 단순 분류하지 않습니다.

또한 `Connection timed out -> Connection refused` 전이는 네트워크/디바이스 상태 변화가 끼어 있었음을 시사하지만, 정확한 Android/Termux lifecycle 원인은 아직 확정하지 않습니다.

다음 단계는 서버폰 UI를 열기 전에 main tunnel 로그에서 기존 SSH 세션이 실제로 종료된 시점과 관련 transport 메시지(`Broken pipe`, `Connection reset`, `closed`, keepalive timeout 등)를 더 좁게 확인하는 것입니다.

정확한 private endpoint는 기록하지 않습니다.
