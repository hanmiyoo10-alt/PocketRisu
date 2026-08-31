# Android dual-phone pre-reboot baseline after boot backup isolation — 2026-09-01

## Scope

Pre-reboot validation after isolating executable `.bak-*` files from `~/.termux/boot/` on the server phone.

## Server phone baseline

Observed at 2026-09-01 04:01:38 KST.

- `sshd`: run, age 2632 s
- `pocketrisu`: run, age 2632 s
- `llmgateway-bridge`: run, age 2632 s
- `local-usage-runtime-manager`: run, age 2632 s
- `local-usage-runtime-engine`: run, age 2632 s
- wake marker remained from the previous boot-generation evidence:
  - `time=2026-09-01T02:12:00+0900`
  - `phase=post_core_wait`
  - `rc=0`
- active boot directory now contains only:
  - `00-boot-probe`
  - `00-pocketrisu-server`
  - `50-taskbridge`
- active boot directory contains no `termux-wake-unlock` command.

## Main phone baseline

Observed at 2026-09-01 04:02:05 KST.

- main SSH tunnel: run, age 2660 s
- notify tunnel: run, age 2660 s
- forwarded PocketRisu core health: HTTP 200
- forwarded runtime engine health: HTTP 200

## Interpretation

The pre-reboot baseline is clean after boot-backup isolation:

1. Server-side supervised services are all healthy in the same runit generation.
2. Main-side independent SSH tunnels are both healthy.
3. Forwarded core and engine health endpoints are both HTTP 200.
4. Only the intended three active Termux:Boot files remain.
5. No active boot file can issue `termux-wake-unlock`.

This baseline is suitable for the next controlled reboot validation. The old boot wake marker is retained as evidence from the earlier generation; it should be replaced by a new marker only after the controlled reboot and Termux:Boot execution.

No private Tailscale address, auth token, webhook secret, or key fingerprint is recorded here.
