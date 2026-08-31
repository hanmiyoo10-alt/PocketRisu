# Android dual-phone boot sshd/core second-ordering evidence (2026-09-01)

## Scope

INSPECT_ONLY evidence from the server phone and main-phone tunnel logs. Private network addresses and key fingerprints are redacted/not committed.

## Exact server-side sequence

Termux:Boot marker on the server phone:

- `boot_initial`: 2026-09-01 02:11:43 KST
- `post_core_wait`: 2026-09-01 02:12:00 KST
- `core_ready=1`, `iterations=6`, wake-lock wrapper `rc=0`

Newest pre-03:17 rotated sshd log shows the same generation with exact UTC timestamps (`+9h` for KST):

- 17:11:46.406 UTC = 02:11:46.406 KST: sshd listening on port 8022
- 17:11:47.475 UTC = 02:11:47.475 KST: first public-key SSH connection accepted
- 17:11:48.755 UTC = 02:11:48.755 KST: second public-key SSH connection accepted
- 17:11:52.531 UTC = 02:11:52.531 KST: forwarded connection to local PocketRisu port 6001 failed
- 17:11:57.815 UTC = 02:11:57.815 KST: second forwarded connection to port 6001 failed
- 02:12:00 KST: boot marker records core ready

This proves the expected boot ordering for this generation:

1. Termux:Boot script begins.
2. sshd starts and listens.
3. The two independent main-phone SSH sessions reconnect successfully.
4. The forwarded PocketRisu target on port 6001 is initially not ready.
5. PocketRisu becomes healthy a few seconds later, by the `post_core_wait` marker.

## Correlation with the later relapse

Main-phone tunnel logs show the re-established SSH sessions then remain quiet until new `Connection refused` errors start at approximately:

- main SSH tunnel: 02:22:51 KST
- notify tunnel: 02:22:58 KST

Thus the post-boot generation was remotely usable for roughly eleven minutes before sshd became unavailable again.

## Important distinction

The exact ordering above does not by itself prove why the server generation disappeared. The earlier `termux-wake-lock` wrapper returning `rc=0` proves the request completed successfully, but it is not direct proof that the lock remained continuously held until the later failure.

Because the manually opened Termux generation at 03:17 remained alive substantially longer than the roughly eleven-minute boot generation, boot-only scripts or delayed boot actions should be inspected before attributing the relapse solely to Android background process killing.

## Next diagnostic

Inspect the files under `~/.termux/boot/` without executing or modifying them, including file modes and any delayed `termux-wake-unlock`, `sleep`, stop/down/kill, or service-control commands. Historical backup files inside the boot directory are especially important because some are named for prior wake-lock/auto-unlock experiments.
