# 듀얼폰 장애 경계 확정 기록 — 2026-09-01

## 요약

메인폰의 `pocketrisu-ssh-tunnel`과 `pocketrisu-notify-tunnel` 로그를 교차 확인한 결과, 2026-08-31 밤부터 2026-09-01 새벽까지 관측된 장애는 하나의 연속 장애가 아니라 최소 두 번의 공통 장애 구간으로 분리된다.

## 관측 1: 첫 공통 transport 장애

- notify tunnel: 2026-08-31 12:53:18 UTC (= 21:53:18 KST) `Timeout, server ... not responding.`
- ssh tunnel: 2026-08-31 12:53:28 UTC (= 21:53:28 KST) `Timeout, server ... not responding.`
- 이후 두 터널 모두 새 연결에서 `Connection timed out` 반복
- 마지막 transport 오류:
  - notify tunnel: 2026-08-31 13:12:17 UTC (= 22:12:17 KST)
  - ssh tunnel: 2026-08-31 13:12:18 UTC (= 22:12:18 KST)

## 관측 2: 중간 복구 구간

두 터널의 run 파일은 모두 runit 아래에서 `exec ssh -N` 형태로 동작한다. 연결 실패 시 ssh 프로세스가 종료되고 runit이 재실행하며 실패 로그가 계속 쌓인다. 반대로 연결에 성공하면 `ssh -N`이 조용히 유지되어 별도의 성공 로그가 남지 않는다.

첫 장애 이후 마지막 오류가 22:12:17~18 KST에서 끝난 뒤, 다음 공통 장애가 시작되는 02:07:44~45 KST까지 transport 오류가 관측되지 않았다.

또한 02:07:44~45 KST의 `Timeout, server ... not responding.` 메시지는 이미 성립되어 있던 SSH 세션이 응답을 잃을 때 나타나는 형태이므로, 첫 장애 이후 두 터널 모두 실제로 재연결되어 있었다는 강한 증거다.

따라서 첫 장애와 두 번째 장애 사이에 약 3시간 55분의 복구 구간이 존재했다고 판단한다.

## 관측 3: 최종 공통 장애

- notify tunnel: 2026-08-31 17:07:44 UTC (= 2026-09-01 02:07:44 KST) `Timeout, server ... not responding.`
- ssh tunnel: 2026-08-31 17:07:45 UTC (= 2026-09-01 02:07:45 KST) `Timeout, server ... not responding.`
- 이후 두 터널 모두 새 연결에서 `Connection timed out`
- ssh tunnel: 2026-08-31 17:10:33 UTC (= 02:10:33 KST)부터 8022 `Connection refused`
- notify tunnel: 2026-08-31 17:10:35 UTC (= 02:10:35 KST)부터 8022 `Connection refused`

두 독립 터널이 1~2초 차이로 동일한 전이를 보였으므로, 메인폰의 개별 tunnel 프로세스 문제보다는 서버폰 쪽 공통 경로/서버 상태 변화로 보는 것이 타당하다.

## 별도 관측: forwarded target refusal

2026-08-31 04:38:43 UTC (= 13:38:43 KST) 및 이후 일부 시점에 ssh tunnel 로그에 `channel ... open failed: connect failed: Connection refused`가 관측되었다.

이 메시지는 8022 SSH transport 자체의 거부가 아니라, 이미 성립된 SSH 세션 내부에서 특정 forward 대상 연결이 거부된 경우이므로 transport 장애와 분리해서 해석한다. notify tunnel에는 같은 시점의 transport 오류가 없었다.

## 현재 결론

현재 증거는 다음 순서를 지지한다.

1. 서버 내부 forwarded target 이상이 transport 장애보다 먼저 일부 관측됨.
2. 21:53 KST 전후 두 독립 SSH 세션이 동시에 응답을 잃음.
3. 약 19분간 재시도 후 22:12 KST 무렵 재연결 성공.
4. 약 3시간 55분 복구 구간 유지.
5. 02:07 KST 전후 두 세션이 다시 동시에 응답 상실.
6. 02:10 KST 전후 네트워크 경로는 다시 도달 가능해졌으나 8022 sshd가 듣지 않는 `Connection refused` 상태로 전환.
7. 02:30 이후에도 core/engine forwarded health 000 및 direct SSH refused가 지속.

이 결과만으로 wake-lock 자체 실패, Tailscale 일시 장애, Android의 Termux 프로세스 정리 중 어느 하나를 단독 원인으로 확정할 수는 없다. 다음 단계는 현재 서버폰이 재부팅된 것인지, Termux/runit/sshd만 소실된 것인지, 그리고 boot wake-lock marker가 그대로 남아 있는지를 서버폰에서 통제된 방식으로 확인하는 것이다.

## 보안

문서에는 실제 사설 네트워크 주소, 토큰, 키, webhook 비밀값을 기록하지 않는다.
