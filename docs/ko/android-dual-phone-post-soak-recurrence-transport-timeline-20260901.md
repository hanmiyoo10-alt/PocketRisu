# 장기 soak 이후 재발: SSH transport 타임라인 정정 (2026-09-01)

## 배경

부팅 wake-lock 계측 이후 6시간 32분 whole-backend 생존은 확인되었으나, 이후 메인폰에서 서버폰의 core/engine이 000으로 떨어지고 direct SSH 8022가 `Connection refused`가 되는 재발 케이스가 확인되었다.

이 문서는 메인폰 `pocketrisu-ssh-tunnel`의 실제 `svlogd -tt` 로그를 이용해 재발 타임라인을 정리한다.

## 로그 위치

메인폰 SSH tunnel logger는 다음 경로에 기록한다.

- `$HOME/.local/state/pocketrisu-ssh-tunnel`
- `svlogd -tt` 사용

로그의 `YYYY-MM-DD_HH:MM:SS` 시각은 UTC 기준으로 해석하고 KST(+09:00)로 변환한다.

## 확인된 이벤트

마지막 full 정상 확인:

- 2026-08-31 03:49:52 KST

그 이후 SSH tunnel 로그에서:

- 2026-08-31 13:38:43 KST: 기존 SSH 세션 안에서 `channel ... open failed: connect failed: Connection refused`
  - SSH 8022 transport 자체 refusal이 아니라 forward 대상 서비스 refusal로 해석해야 한다.
- 2026-08-31 16:33:41 KST: 같은 형태의 forwarded target refusal 재관측.
- 2026-08-31 21:53:28 KST: `Timeout, server ... not responding.`
- 2026-08-31 21:53:39 KST: 첫 `ssh: connect to host ... port 8022: Connection timed out`
  - 앞서 2026-09-01 02:07 KST를 첫 transport timeout으로 보았던 해석은 정정한다.
- timeout 로그가 약 22:12 KST 부근까지 보인 뒤 긴 무로그 구간이 있으므로 중간 회복 가능성이 있다.
- 2026-09-01 02:07 KST: 다시 `Timeout, server ... not responding.` 및 새 SSH 연결 timeout 구간.
- 2026-09-01 02:10:33 KST: 새 SSH 연결이 `Connection refused`로 전환.
- 2026-09-01 02:30 이후: 메인 forwarded core/engine 000, direct SSH 8022 `Connection refused`, 메인 SSH/notify tunnel 재시작 루프 지속.

## 현재 해석

현재 증거는 단일 시점의 whole-backend 즉시 소실보다 단계적 이상을 시사한다.

1. forward 대상 서비스 refusal이 먼저 관측됨.
2. 이후 SSH transport timeout이 발생함.
3. 중간에 transport 회복 가능성이 있음.
4. 최종적으로 SSH 8022가 `Connection refused` 상태로 지속됨.

따라서 21:53 KST의 첫 timeout을 곧바로 최종 사망 시점으로 확정해서는 안 된다. 다음 단계는 SSH/notify 두 독립 tunnel의 오류 블록을 비교해 공통 네트워크/서버 이상인지, 개별 tunnel 문제인지 분리하는 것이다.

## 안전 원칙

- 서버폰 Termux UI는 아직 열지 않는다.
- 현재 단계는 INSPECT_ONLY이다.
- 서버 재시작이나 서비스 수정은 하지 않는다.
- private endpoint/IP는 저장소에 기록하지 않는다.
