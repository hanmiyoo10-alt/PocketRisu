# 메인 SSH/notify 터널 교차검증: 공통 장애 증거 (2026-09-01)

## 요약

메인폰의 `pocketrisu-ssh-tunnel`과 `pocketrisu-notify-tunnel`은 서로 독립된 SSH 연결이지만, 2026-08-31~2026-09-01 장애 구간에서 거의 같은 시각에 동일한 transport 실패를 보였다.

따라서 이번 장애를 특정 메인폰 터널 하나의 문제로 보는 근거는 약해졌고, 서버폰 측 공통 경로/네트워크 또는 서버 상태 쪽 공통 원인 가능성이 강해졌다.

## 교차검증 결과

### 첫 transport 장애 구간

- notify tunnel: 2026-08-31 12:53:18 UTC (21:53:18 KST) `Timeout, server ... not responding.`
- SSH tunnel: 2026-08-31 12:53:28 UTC (21:53:28 KST) 같은 종류의 timeout
- 그 직후 두 터널 모두 새 연결에서 `Connection timed out`

### 최종 장애 구간

- notify tunnel: 2026-08-31 17:07:44 UTC (2026-09-01 02:07:44 KST) timeout
- SSH tunnel: 2026-08-31 17:07:45 UTC (02:07:45 KST) timeout
- SSH tunnel: 2026-08-31 17:10:33 UTC (02:10:33 KST) `Connection refused`
- notify tunnel: 2026-08-31 17:10:35 UTC (02:10:35 KST) `Connection refused`

두 독립 터널의 최종 timeout/refused 전이가 약 1~2초 차이로 일치한다.

## forwarded-target 오류와의 분리

2026-08-31 04:38:43 UTC (13:38:43 KST)의 SSH tunnel 로그에는 `channel ... open failed: connect failed: Connection refused`가 있었지만 같은 시각 notify tunnel에는 대응 오류가 없었다.

이 오류는 SSH transport 자체 장애와 구분해야 하며, 기존 SSH 세션 내부에서 특정 forwarded target이 거부된 사건으로 보는 것이 타당하다.

## 현재 해석

- 개별 메인폰 SSH tunnel 단독 결함 가능성은 낮아졌다.
- 첫 `timed out` 구간은 서버폰/Tailscale 경로가 응답하지 않은 공통 transport 장애와 부합한다.
- 이후 `Connection refused`로 전환된 것은 네트워크 경로가 다시 보이지만 서버폰의 8022 `sshd`가 듣지 않는 상태와 부합한다.
- 정확한 근본 원인은 아직 확정하지 않는다.
- 서버폰 Termux UI는 아직 열지 않고 메인폰에 남은 로그 증거를 우선 보존/분석한다.

## 보안

실제 사설 주소는 문서에 기록하지 않는다.
