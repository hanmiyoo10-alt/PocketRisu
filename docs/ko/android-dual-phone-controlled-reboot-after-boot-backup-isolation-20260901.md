# Android dual-phone controlled reboot after boot backup isolation (2026-09-01)

## Context

After isolating executable `.bak-*` files out of `~/.termux/boot/`, the server phone passed a clean pre-reboot baseline:

- active boot files: `00-boot-probe`, `00-pocketrisu-server`, `50-taskbridge`
- no active `termux-wake-unlock`
- server services running: sshd, PocketRisu, bridge, local-usage manager, local-usage engine
- main-phone SSH and notify tunnels were stable
- forwarded core and engine health both returned HTTP 200

## Controlled reboot

The server phone was rebooted manually from the Android power menu. The user reported that the reboot completed successfully.

## Test constraint

For the next validation stage, do not open the server-phone Termux UI and do not manually restart services or reacquire the wake lock. Observe only from the main phone first so that Termux:Boot automatic recovery can be validated without contaminating evidence.
