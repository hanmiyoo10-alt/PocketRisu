# Android dual-phone inter-outage recovery gap evidence (2026-09-01)

## Context

After the previously recorded long soak, the main phone later observed a new server-side disconnect condition. Two independent runit-managed SSH tunnels on the main phone were used as observers:

- `pocketrisu-ssh-tunnel`
- `pocketrisu-notify-tunnel`

Both services use `exec ssh -N` under runit, with `ConnectTimeout=10`, `ServerAliveInterval=30`, and `ServerAliveCountMax=3`. Failed SSH processes therefore exit and are restarted by runit, while a successful `ssh -N` connection remains quiet in the log.

## Recovery-gap retry result

A corrected INSPECT_ONLY search checked both tunnel logs for transport-level errors in the interval:

- UTC: `2026-08-31 13:12:00` through `2026-08-31 17:05:00`
- KST: `2026-08-31 22:12:00` through `2026-09-01 02:05:00`

Observed final errors near the beginning of the interval:

### pocketrisu-ssh-tunnel

- `2026-08-31_13:12:07 UTC` — SSH port 8022 connection timed out
- `2026-08-31_13:12:18 UTC` — SSH port 8022 connection timed out

### pocketrisu-notify-tunnel

- `2026-08-31_13:12:17 UTC` — SSH port 8022 connection timed out

No later transport errors were returned by the corrected search through `17:05 UTC`.

## Interpretation

This materially strengthens the intermediate-recovery hypothesis:

1. Around `21:53 KST`, both independent SSH tunnels lost the server path at nearly the same time.
2. Both repeatedly retried for roughly 19 minutes.
3. Their final observed transport failures ended around `22:12:17–18 KST`.
4. Because both services are runit-managed `exec ssh -N` processes, a long period with no failure output is consistent with successful reconnection and a quiet, running SSH session.
5. The next known common transport failure begins again around `02:07 KST`.

Therefore the evidence now strongly favors two separate common-path outages with an intermediate recovery period, rather than one uninterrupted outage from `21:53 KST` through the final failure.

This does not yet by itself prove whether the common-path interruption was caused by Tailscale/network state, Android background behavior, or server Termux lifecycle. Those layers must remain separated during subsequent diagnosis.

## Safety / handling notes

- Server-phone Termux UI remained unopened during this investigation.
- No services were modified or restarted.
- No private network endpoint is recorded in this document.
