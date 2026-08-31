# Android dual-phone boot directory executable backup risk (2026-09-01)

## Summary

During inspection of the server phone `~/.termux/boot` directory after the 2026-09-01 recurrence, every PocketRisu backup copy stored inside the active Termux:Boot directory was found to remain executable (`mode=700`).

This is operationally important because files kept inside the active Termux:Boot directory may be treated as boot scripts depending on Termux:Boot execution semantics. Renaming a script to a `.bak-*` suffix alone must not be assumed to disable execution.

## Observed files

Executable files included:

- `00-pocketrisu-server`
- `00-pocketrisu-server.bak-auto-unlock-20260830-003030`
- `00-pocketrisu-server.bak-persistent-wakelock-20260830-174711`
- `00-pocketrisu-server.bak-pre-instrument-20260830-210504`
- `00-pocketrisu-server.bak-wakelock-20260829-201511`
- `00-boot-probe`
- `50-taskbridge`

All observed PocketRisu backup copies were mode `700` and located directly inside `~/.termux/boot`.

## Suspicious wake-lock command

The backup `00-pocketrisu-server.bak-persistent-wakelock-20260830-174711` contains a `termux-wake-unlock` command. Its exact control-flow context has not yet been inspected, so it is not yet proven that this command executes during boot or releases the lock acquired by the current script.

The file named `bak-auto-unlock` does **not** itself contain `termux-wake-unlock`; therefore its filename alone is not evidence that it performs an unlock.

## Current interpretation

This is a high-priority configuration hazard and a plausible contributor to the post-boot ~11 minute service loss. It is not yet established as the root cause.

Before modifying anything, inspect the full contents of the executable backup scripts, especially the `bak-persistent-wakelock` copy, and determine whether the `termux-wake-unlock` is unconditional, part of a function, part of a trap, or otherwise reachable during Termux:Boot execution.

No private Tailscale addresses, keys, or secrets are included in this document.
