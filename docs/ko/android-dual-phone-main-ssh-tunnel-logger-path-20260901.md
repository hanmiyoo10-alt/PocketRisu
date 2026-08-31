# Android 듀얼폰 메인 SSH tunnel logger 실제 경로 확인 (2026-09-01)

## 배경

2026-09-01 장시간 경과 뒤 서버폰 sshd가 `Connection refused` 상태로 재발했고, 메인폰의 `pocketrisu-ssh-tunnel`/`pocketrisu-notify-tunnel`은 초단위 재시작 루프를 보였습니다. forwarded core/engine은 `000`이었고 direct SSH 8022도 `Connection refused`였습니다.

장애 최초 시각을 좁히기 위해 메인폰 SSH tunnel logger 경로를 INSPECT_ONLY로 확인했습니다.

## 결과

서비스 경로:

- `$PREFIX/var/service/pocketrisu-ssh-tunnel`

서비스 top-level에는 `log/`, `run`, `supervise/`가 존재했습니다.

`log/run` 내용은 다음 구조였습니다.

```sh
#!/data/data/com.termux/files/usr/bin/sh
mkdir -p "$HOME/.local/state/pocketrisu-ssh-tunnel"
exec svlogd -tt "$HOME/.local/state/pocketrisu-ssh-tunnel"
```

따라서 실제 SSH tunnel 로그 출력 경로는 다음입니다.

- `$HOME/.local/state/pocketrisu-ssh-tunnel`

logger service도 정상 run 중이었고 당시 PID는 `21904`, age는 약 `200234s`였습니다.

## 해석

앞서 검사한 `$PREFIX/var/log/pocketrisu-ssh-tunnel` 및 service tree의 `log/main` 후보가 없었던 것은 logger가 없는 것이 아니라 로그 경로 추정이 틀렸기 때문입니다.

다음 단계는 실제 `$HOME/.local/state/pocketrisu-ssh-tunnel`의 current/rotated 로그를 INSPECT_ONLY로 확인하여 최초 `Connection refused` 시각을 좁히는 것입니다.

정확한 private endpoint/IP는 기록하지 않습니다.
