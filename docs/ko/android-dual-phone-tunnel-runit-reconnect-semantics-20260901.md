# Dual-phone tunnel runit reconnect semantics — 2026-09-01

## Context

During the 2026-09-01 recurrence investigation, both main-phone tunnel run files were inspected without modifying or restarting services.

## Main SSH tunnel

The main SSH tunnel run file uses `exec ssh -N` under runit, with:

- `BatchMode=yes`
- `StrictHostKeyChecking=yes`
- `ExitOnForwardFailure=yes`
- `ConnectTimeout=10`
- `ServerAliveInterval=30`
- `ServerAliveCountMax=3`
- TCP forward rules for PocketRisu/core and local-usage related localhost ports

## Notify tunnel

The notify tunnel also uses `exec ssh -N` under runit, with the same connection/keepalive options and a reverse forward.

## Interpretation

Because the service process is directly replaced by `ssh` (`exec ssh`) and supervised by runit:

1. When the SSH connection attempt fails, `ssh` exits and runit launches the service again.
2. Repeated connection failures therefore produce repeated log lines and very low service ages.
3. When a retry succeeds, `ssh -N` remains attached and is normally quiet; there is no explicit success line.
4. Therefore, a long gap after a burst of repeated connection failures is strong evidence that a retry succeeded and the SSH process remained connected, provided the runit/logging infrastructure itself remained alive.

At the time of inspection during the final outage, both tunnel service ages were only a few seconds while both logger processes had remained alive for roughly 201,681 seconds. This matches an active reconnect loop during the current server-side outage rather than failure of the main-phone logger infrastructure.

## Scope / caution

A quiet log interval is strong but not mathematically conclusive proof of successful reconnection because a separate service-stop event could also silence the tunnel. No historical service-stop evidence was established here. The result should therefore be used as a strong reconnect inference, not as standalone proof.

No private network address is recorded in this document.
