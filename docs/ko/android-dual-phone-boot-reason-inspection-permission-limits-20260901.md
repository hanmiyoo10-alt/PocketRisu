# Android dual-phone boot-reason inspection permission limits — 2026-09-01

## Context

After the server phone was intentionally opened in Termux at 2026-09-01 03:17 KST, a controlled INSPECT_ONLY snapshot showed that the Termux:Boot wake-lock log had a new boot sequence before the UI was opened:

- 2026-09-01 02:11:43 +0900: `phase=boot_initial`, `rc=0`
- 2026-09-01 02:12:00 +0900: `phase=core_wait`, `core_ready=1`, `iterations=6`
- 2026-09-01 02:12:00 +0900: `phase=post_core_wait`, `rc=0`

This independently proves that the Termux:Boot script executed again around 02:11–02:12 KST. The exact reason for that boot-cycle-like execution was then inspected without modifying services or wake-lock state.

## Boot-reason inspection result

The following properties were empty:

- `ro.boot.bootreason`
- `sys.boot.reason`
- `persist.sys.boot.reason.history`

A broader `getprop` search for boot/reboot-related keys did not expose a usable boot reason.

`settings get global boot_count` failed with a Binder transaction error:

```text
cmd: Failure calling service settings: Failed transaction (2147483646)
```

No matching auto-restart/reboot settings were returned from the `global`, `system`, or `secure` namespaces through the available Termux permissions.

## Interpretation

This inspection is **inconclusive for the reboot cause**. Empty boot-reason properties and the failed `boot_count` query must not be interpreted as evidence that no reboot or boot-complete cycle happened.

The previous Termux:Boot evidence remains valid: the boot script executed at 02:11–02:12 KST, before the server Termux UI was opened at 03:17 KST.

The specific cause — for example normal reboot, Samsung automatic restart, watchdog, kernel panic, or another system-level boot-complete path — cannot be determined from these unprivileged Termux queries on this device.

## Diagnostic constraints

- `/proc/uptime` was permission denied in the prior snapshot; the derived `0d_0h_0m` value was invalid and must be ignored.
- `ps -A` visibility is restricted on this Android build and cannot be used as absence evidence for supervised services.
- No wake-lock changes or manual service restarts were performed during this inspection.
- Private network addresses are intentionally omitted.

## Next useful correlation

Correlate the main-phone SSH and notify tunnel logs around 02:11:43–02:12:00 KST with the new Termux:Boot markers. This can show whether there was any brief post-boot SSH recovery before the later persistent `Connection refused` state, without relying on unavailable privileged Android boot diagnostics.
