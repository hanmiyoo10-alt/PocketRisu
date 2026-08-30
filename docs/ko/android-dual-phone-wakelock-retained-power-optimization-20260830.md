# Android 듀얼폰 서버폰 wake lock 유지형 전력·발열 최적화 — 2026-08-30

## 배경

서버폰에서 `Disable child process restrictions=ON`을 적용하고 런타임 wake lock을 해제한 뒤 일정 시간 실사용 및 재부팅 직후 자동복구는 성공했지만, 이후 다시 메인폰 SSH/notify tunnel이 0~1초 재시작 루프에 들어가고 forwarded core/engine health가 HTTP 000으로 떨어지는 완전 단절이 재현됐습니다.

따라서 현재 증거상 `Disable child process restrictions=ON`만으로는 서버폰의 장기 background survival을 안정적으로 보장하지 못합니다. 반대로 임시 `termux-wake-lock`을 유지한 동안에는 이전의 완전 단절이 재현되지 않았으므로, 운영 안정성 관점에서는 **서버폰 wake lock 유지가 현재 가장 강한 기준선**입니다.

## 전략 전환

wake lock 자체를 완전히 제거하려고 반복 실험하기보다, 다음 단계에서는 **wake lock을 유지한 채 실제 전력·발열을 만드는 다른 낭비를 줄이는 방향**으로 전환합니다.

핵심 원칙:

1. 안정성 우선: 서버폰 wake lock을 유지한 상태를 기준선으로 사용
2. wake lock 자체와 CPU 사용률을 혼동하지 않음: wake lock은 deep sleep을 제한하지만 CPU를 지속 고부하로 만드는 명령은 아님
3. 불필요한 polling, reconnect loop, SSH keepalive, 로그 기록, bridge watcher 주기, Node idle work를 실제 측정 후 하나씩 최적화
4. 설정/코드 변경 전 INSPECT_ONLY → 백업 → 최소 변경 → 기능 검증 → 전력/온도 재측정 순서 유지
5. 서버폰에는 Android 알림을 새로 만들지 않음

## 우선 조사 순서

### 1. 서버폰 실제 idle CPU와 wakeup 성격 확인

PocketRisu Node, local-usage manager/engine, generic bridge, sshd, taskbridge 등 장기 프로세스의 누적 CPU 시간이 짧은 관찰 구간에서 실제로 증가하는지 다시 측정합니다. `ps %CPU`의 장기 평균값만으로 현재 idle 부하를 판정하지 않습니다.

### 2. 반복 polling / reconnect loop 확인

각 runit `run` 파일과 보조 watcher의 `sleep`, `while`, `curl`, `ssh`, `ping`, health-check 주기를 INSPECT_ONLY로 확인합니다. 너무 짧은 주기로 polling하는 항목이 있다면 안정성에 영향이 없는 범위에서 주기를 늘리는 것을 후보로 둡니다.

### 3. SSH keepalive 최적화

메인폰 core/notify tunnel의 `ServerAliveInterval`, `ServerAliveCountMax`, reconnect wrapper 주기를 확인합니다. Tailscale 경로 유지에 필요한 수준보다 과도한 keepalive가 있다면 wakeup을 줄일 여지가 있습니다. 다만 장애 감지/복구 지연과 트레이드오프가 있으므로 한 번에 하나만 조정합니다.

### 4. 로그 쓰기 빈도 확인

runit log, PocketRisu 로그, bridge 로그가 idle 상태에서도 반복적으로 디스크에 기록되는지 확인합니다. 불필요한 반복 로그는 CPU wakeup과 저장장치 I/O를 만들 수 있으므로, 기능 로그와 오류 로그를 분리해 최소화할 수 있는지 검토합니다.

### 5. 화면-off 실사용 기준 배터리/온도 비교

화면을 켜고 Termux에서 측정한 순간 전류는 실제 idle 소비량과 다릅니다. 최종 평가는 wake lock 유지 상태에서 화면-off/평소 사용 조건으로 일정 시간 관찰하고, 배터리 감소량과 배터리 온도를 같은 조건에서 비교합니다.

## 현재 보류 항목

- wake lock 제거를 영구화하지 않음
- foreground service 전환은 서버폰 지속 알림이 필요할 수 있어 현재 프로젝트 원칙과 충돌하므로 우선 보류
- root/Magisk/init 수준 서비스는 범위가 커서 현 단계에서 적용하지 않음
- `Disable child process restrictions=ON`은 유지해도 되지만, 이것만으로 wake lock 대체 성공으로 판정하지 않음

## 다음 실행 순서

현재 실패 상태가 보존되어 있으므로 먼저 서버폰 Termux를 열지 않은 채 메인폰에서 direct SSH 8022 실패 유형을 한 번 확정합니다. 그 결과가 이전과 같은 `Connection refused`로 확인되면 실패층을 다시 기록한 뒤 서버폰 Termux를 열어 wake lock 유지 기준선으로 복귀합니다.

그 다음부터는 wake lock을 유지한 채 전력·발열 최적화를 진행합니다. 첫 수정 전 단계는 서버폰에서 현재 서비스별 실제 CPU 증가량과 반복 polling/로그 주기를 INSPECT_ONLY로 수집하는 것입니다.

정확한 Tailscale 주소, 계정 정보, 인증 토큰 등 비밀/식별 정보는 기록하지 않습니다.
