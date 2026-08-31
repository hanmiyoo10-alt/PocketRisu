# 2026-09-01 02:12 boot-script / tunnel correlation partial result

## Context

Main-phone SSH tunnel and notify tunnel had a second common outage around 2026-09-01 02:07 KST, transitioning from timeout to port-8022 connection refused around 02:10 KST. Server-phone Termux:Boot instrumentation later showed a fresh boot-script execution at 02:11:43 KST (`boot_initial`) and `post_core_wait rc=0` at 02:12:00 KST.

## Main-phone correlation window

Window inspected in `svlogd -tt` timestamps (UTC):

- `2026-08-31_17:11:20` through `2026-08-31_17:12:40`
- This corresponds to 2026-09-01 02:11:20 through 02:12:40 KST.

### `pocketrisu-ssh-tunnel`

No log lines were emitted in the inspected window.

### `pocketrisu-notify-tunnel`

The final visible failures in the window were:

- 17:11:23 UTC: SSH port 8022 connection refused
- 17:11:32 UTC: SSH port 8022 connection refused
- 17:11:40 UTC: SSH port 8022 connection refused

No further notify-tunnel failure lines were emitted through 17:12:40 UTC.

## Interpretation

This is evidence that remote SSH access recovered around the same period in which the server boot script executed. In particular, the notify tunnel has an 8-second startup delay before each SSH attempt, so a failure at 17:11:40 UTC followed by silence is consistent with the next retry succeeding after server-side SSH became available.

However, this does **not** by itself prove that Android performed a full device reboot. The fact that the Termux:Boot script re-executed is established, but the Android boot reason and boot count could not be read due platform permission/Binder limitations. Therefore, the previous stronger wording that a full Android reboot was already proven is downgraded to an open question.

The absence of SSH-tunnel error lines in the whole 17:11:20–17:12:40 UTC window also means the exact server-side service-start ordering must be checked before attributing recovery solely to `00-pocketrisu-server`; another boot script or service-start path may have made SSH available earlier.

## Next step

Inspect the exact last transport error before the 02:11:43 KST `boot_initial` marker and the first transport error after it for both main-phone tunnels, then inspect the server-phone Termux:Boot script ordering/content if needed. Keep all inspection read-only and avoid manually invoking wake-lock or restarting services until the ordering is understood.

No private IP addresses or tokens are recorded in this document.
