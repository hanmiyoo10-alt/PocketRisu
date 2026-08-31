# Dual-phone post-reboot autorecovery failure after boot-backup isolation (2026-09-01)

## Context

Before the controlled reboot, the server-side Termux:Boot directory had been cleaned so that only these active files remained:

- `00-boot-probe`
- `00-pocketrisu-server`
- `50-taskbridge`

Four executable historical `.bak-*` scripts had been moved out of `~/.termux/boot/`, including the historical script that explicitly called `termux-wake-unlock`.

A pre-reboot baseline was healthy on both phones.

## Controlled reboot

The server phone was rebooted using the Android power menu. After Android came back up, the server Termux UI was intentionally not opened.

## Main-phone observation

At approximately 2026-09-01 04:13 KST, the main phone showed:

- `pocketrisu-ssh-tunnel` repeatedly restarting, service age only a few seconds.
- `pocketrisu-notify-tunnel` repeatedly restarting, service age only about one second.
- forwarded PocketRisu core health unavailable (`HTTP 000`).
- forwarded runtime engine health unavailable (`HTTP 000`).
- forwarded runtime manager unavailable (`HTTP 000`).

This means the immediate remote autorecovery check failed.

## Interpretation

This observation does **not** yet prove that the backup-script isolation change was ineffective. The current evidence only establishes that, at the observation time, the main phone could not maintain its SSH tunnels and none of the forwarded server endpoints were reachable.

The next diagnostic step must distinguish the transport state, especially whether the main tunnels are seeing:

- SSH transport timeout / no response, or
- SSH port 8022 connection refusal.

The server Termux UI should remain unopened until the main-side transport logs are inspected, so pre-recovery evidence is not disturbed.

No private network endpoint, token, or credential is recorded in this document.
