# Android 듀얼폰 child-process 제한 해제 후 재부팅 재발 — 2026-08-30

## 배경

서버폰에서 Developer options의 `Disable child process restrictions`를 ON으로 바꾸고 런타임 wake lock을 해제한 뒤, 일정 시간 실사용에서는 이전의 완전 단절이 재현되지 않아 provisional pass로 관찰했습니다.

이후 서버폰을 재부팅했고, Termux UI가 잠시 나타났다가 사라졌지만 메인폰에서 `pocketrisu-ssh-tunnel`과 `pocketrisu-notify-tunnel`이 약 7분 연속 run 상태였으며 forwarded core와 engine health가 모두 HTTP 200이라 재부팅 직후 원격 자동복구는 PASS로 확인했습니다.

## 이후 재발 보고

그 뒤 사용 중 다시 장애가 발생했습니다.

사용자 관찰:

- PocketRisu에서 `Fail save 1chat` 오류가 표시됨
- local bridge도 더 이상 동작하지 않음
- 재부팅 후 브라우저/PocketRisu 페이지를 새로고침하지 않고 기존 세션을 이어서 사용한 상태였음

기존 브라우저 세션을 그대로 이어 쓴 점은 `Fail save 1chat` 같은 UI/session 오류에 일부 영향을 줄 가능성은 있지만, bridge까지 동시에 실패했다는 점 때문에 브라우저 세션 문제만으로 전체 장애를 설명하지 않습니다.

따라서 `Disable child process restrictions=ON`만으로 wake lock을 완전히 대체할 수 있다는 provisional pass는 현재 **철회/보류**합니다. 재부팅 직후 자동복구가 잠시 성공한 것과 장기 background survival은 분리해서 판단해야 합니다.

## 현재 진단 원칙

서버폰 Termux를 다시 열면 profile의 `service-daemon start` 경로가 runit 전체를 재구성할 수 있으므로, 현재 실패 상태를 보존하기 위해 서버폰 Termux는 열지 않습니다.

다음 검사는 메인폰에서만 INSPECT_ONLY로 수행합니다.

1. core/notify tunnel의 현재 run/restart 상태 확인
2. forwarded core/engine HTTP health 확인
3. 가능한 경우 해당 tunnel의 최근 runit log를 확인해 `Connection refused`, timeout, auth failure 등의 실패 유형을 분리
4. 결과가 서버 sshd/Termux service 부재를 가리킬 때만 서버폰을 열어 즉시 서비스 age/supervisor 상태를 기록

이 재발은 `Disable child process restrictions` 설정이 유용하지 않다는 뜻까지는 아닙니다. 다만 현재 증거상 **지속 wake lock 없이 장기 생존을 단독으로 보장하지는 못했을 가능성**이 커졌으며, wake lock 또는 Android foreground/recovery 구조와의 조합을 다시 검토해야 합니다.

정확한 Tailscale 주소, 계정 정보, 인증 토큰 등 비밀/식별 정보는 기록하지 않습니다.
