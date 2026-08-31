# 듀얼폰: 02:12 boot 이후 약 11분 만의 sshd 재소실 증거 (2026-09-01)

## 요약

메인폰의 두 독립 SSH 터널 로그와 서버폰의 Termux:Boot wake-lock 마커를 교차해, 2026-09-01 02:11~02:12 KST 부근에 서버 sshd가 실제로 회복된 뒤 약 11분 만에 다시 사라졌음을 확인했다.

## 서버폰 boot 스크립트 증거

서버폰 `~/.termux/boot-wakelock.log`에는 다음 새 실행이 기록되어 있다.

- `2026-09-01T02:11:43+0900 phase=boot_initial rc=0`
- `2026-09-01T02:12:00+0900 phase=core_wait core_ready=1 iterations=6`
- `2026-09-01T02:12:00+0900 phase=post_core_wait rc=0`

이는 02:11:43 KST에 boot 스크립트가 다시 실행되었고, 02:12:00에는 PocketRisu core health가 준비 상태였음을 뜻한다.

주의: 이 기록만으로 Android 전체 재부팅 원인을 확정하지는 않는다. `/proc/uptime`, `boot_count`, bootreason 계열 값은 일반 Termux 권한에서 신뢰 가능한 값을 확보하지 못했다.

## 메인폰 SSH 터널 경계

### pocketrisu-ssh-tunnel

`boot_initial` 직전/직후:

- 02:11:37.895 KST: port 8022 `Connection refused`
- 02:11:39.074 KST: refused
- 02:11:40.189 KST: refused
- 02:11:41.415 KST: refused
- 02:11:42.743 KST: refused
- 02:11:43.872 KST: refused
- 02:11:44.950 KST: refused
- 02:11:46.029 KST: refused

그 다음 transport 오류는:

- 02:22:51.232 KST: port 8022 `Connection refused`

즉 02:11:46 이후부터 02:22:51 직전까지 약 11분 동안 transport 실패 로그가 사라진다.

### pocketrisu-notify-tunnel

- 마지막 pre-boot refusal: 02:11:40.191 KST
- 다음 transport 오류: 02:22:58.218 KST `Connection refused`

notify 터널의 run 스크립트에는 재시도 전 `sleep 8`이 있으며, 계속 실패 중이었다면 약 8초 간격으로 refusal 로그가 이어졌어야 한다.

## 해석

두 터널 모두 runit 아래 `exec ssh -N` 형태다. SSH 연결이 실패하면 프로세스가 종료되고 runit이 다시 띄우므로 실패 로그가 계속 쌓인다. 반대로 연결 성공 시 `ssh -N`이 조용히 유지되므로 성공 자체는 로그에 남지 않는다.

따라서 두 독립 터널에서 동시에 약 11분의 실패 로그 공백이 생겼다는 것은 02:11~02:12 boot 스크립트 실행 이후 서버 sshd가 실제로 살아나 두 터널이 재연결되었음을 강하게 뒷받침한다.

그 뒤 02:22:51~58 KST부터 두 터널 모두 다시 port 8022 `Connection refused`를 기록했다. 이는 네트워크 경로는 도달 가능하지만 sshd가 더 이상 listen하지 않는 상태와 일치한다.

## 현재 타임라인

1. 02:07경: 두 독립 터널이 거의 동시에 기존 SSH 세션 응답 상실.
2. 02:10경: 새 연결이 `Connection refused`로 전환.
3. 02:11:43: 서버 boot 스크립트 `boot_initial` 실행.
4. 02:12:00: `core_ready=1`, `post_core_wait rc=0`.
5. 02:11:46 이후: 메인 SSH 터널 transport 실패 로그 소실.
6. notify도 02:11:40 이후 transport 실패 로그 소실.
7. 약 11분간 두 터널이 실제로 재연결된 것으로 판단.
8. 02:22:51~58: 두 터널에서 다시 port 8022 `Connection refused` 시작.
9. 03:17경 서버 Termux UI를 열자 runit 서비스들이 age 약 1초로 재구성됨.

## 의미

이번 사건은 단순한 장기 네트워크 장애 하나로 설명하기 어렵다. 새 boot cycle 이후 boot 스크립트와 sshd/core가 실제로 살아났지만, 약 11분 뒤 Termux/runit/sshd 계층이 다시 소실된 별도 짧은 재발이 존재한다.

따라서 다음 진단은 서버폰에서 02:22 전후의 **실제 서비스 로그 경로와 로그 내용**을 inspect-only로 확인해, sshd/runit/TermuxService 종료 흔적을 찾는 방향이 적절하다.

민감한 Tailscale/사설 IP 및 인증 정보는 문서에 기록하지 않았다.
