# Android 듀얼폰 장기 soak 이후 whole Termux/runit 소실 재발 (2026-09-01)

## 배경

wake-lock 계측/2회 요청 boot script 적용 후 다음은 확인되었습니다.

- 재부팅 직후 전체 remote-path 자동복구 PASS
- 약 100분 whole backend 생존 PASS
- 약 3시간 44분 whole backend 생존 PASS
- 약 6시간 32분 whole backend 생존 PASS

그러나 이후 더 긴 시간대에서 새로운 연결 실패가 발생했습니다.

## 실패 확인 시점

메인폰에서 INSPECT_ONLY로 확인한 시각:

- `2026-09-01T02:30:12+0900`

`post_core_wait=2026-08-30T21:17:43+0900` 기준 약 29시간 12분 뒤입니다.

마지막 정상 확인은 `2026-08-31T03:49:52+0900`이므로 실제 실패 시점은 마지막 정상 확인과 이번 실패 확인 사이 어딘가입니다.

## 메인폰 상태

- `pocketrisu-ssh-tunnel`: run 상태지만 현재 child PID age 약 1초
- `pocketrisu-notify-tunnel`: run 상태지만 현재 child PID age 약 2초
- 두 tunnel logger 자체는 장시간 계속 생존
- forwarded PocketRisu core: HTTP `000`
- forwarded local-usage engine: HTTP `000`

따라서 메인 tunnel supervisor는 살아 있으나 원격 endpoint 연결에 실패하며 child가 빠르게 재기동되는 상태입니다.

## direct SSH 결과

서버폰 8022 direct SSH:

- `ssh_rc=255`
- 분류: `CONNECTION_REFUSED`

정확한 private endpoint/address는 기록하지 않습니다.

이 결과는 단순 route timeout이 아니라 원격 endpoint까지 네트워크 경로는 도달하되 서버폰에서 sshd listener가 존재하지 않는 패턴과 일치합니다.

## 판정

이번 실패는 **메인 SSH tunnel 단독 문제보다 서버폰 Termux/runit/sshd 쪽 whole-stack 소실 재발**로 분류합니다.

근거:

- forwarded core/engine 모두 `000`
- direct SSH 8022가 timeout이 아니라 connection refused
- 메인 SSH/notify tunnel child가 초 단위로 반복 재기동
- 과거 whole Termux/runit/sshd disappearance 때의 관측 패턴과 동일 계열

## 6시간 PASS와의 관계

약 6시간 32분 PASS 기록은 그대로 유효합니다. 그 시점까지는 sshd/PocketRisu/bridge와 health/direct SSH가 정상으로 확인되었습니다.

다만 이번 새 증거로 인해 **6시간 생존을 장기 안정성 최종 성공으로 보기는 어렵고**, 더 긴 시간대에서 whole Termux/runit 소실이 다시 발생하는 것으로 판정합니다.

## local plugin update와 분리

6시간 체크 전에 local plugin 버전 업데이트로 manager/engine이 함께 재기동한 것은 별도 lifecycle event입니다. 당시에는 sshd, PocketRisu, bridge가 계속 살아 있었고 core/engine health 및 direct SSH도 정상입니다.

따라서 이번 whole-stack disappearance는 그 즉시 발생한 manager/engine 재기동과는 다른 현상으로 분리합니다. 지연 인과 여부는 현재 증거만으로 확정하지 않습니다.

## 다음 단계

서버폰 Termux를 직접 열기 전에 메인폰의 tunnel 로그를 좁게 읽어 최초 `connection refused` 시각을 추정합니다. 이를 통해 마지막 정상 시각과 실제 서버 sshd 소실 시각 사이의 실패 window를 줄입니다.

그 전에는 서버폰 Termux를 열거나 서비스를 수동 재기동하지 않습니다.
