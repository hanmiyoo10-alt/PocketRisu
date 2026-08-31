# Tailscale foreground restored reachability to an already-running server stack (2026-09-01)

## Context

After isolating executable backup scripts from `~/.termux/boot/`, a controlled Android reboot was performed on the server phone. The server Termux UI was intentionally not opened after reboot.

The main phone observed prolonged SSH transport timeouts and an unreachable Tailscale peer. Android settings showed Always-on VPN enabled for Tailscale, while the Tailscale battery policy was initially Optimized and then changed to Unrestricted. That battery-policy change did not immediately restore the peer.

The server Tailscale app was then foregrounded once, while the Termux app remained unopened.

## Main-phone evidence after foregrounding Tailscale

At 2026-09-01 04:31:08 KST:

- Tailscale peer ping: PASS
- `pocketrisu-ssh-tunnel`: stable `run`, age about 139 s
- `pocketrisu-notify-tunnel`: stable `run`, age about 135 s
- forwarded PocketRisu core health: HTTP 200
- forwarded local-usage engine health: HTTP 200
- forwarded manager endpoint: HTTP 401
  - this is positive reachability evidence because the manager requires authentication; the `curl -f` wrapper printed `manager_http=FAIL`, but the actual HTTP status proves the service was reachable
- latest SSH transport timeouts stopped at `2026-08-31_19:28:50.91534` UTC = 2026-09-01 04:28:50.91534 KST

The tunnel ages at 04:31:08 align with reconnection around 04:28:49-04:28:53 KST, matching the observed moment when foregrounding Tailscale restored server connectivity.

## Interpretation

Because the server Termux UI was never opened, yet SSH forwarding, PocketRisu core, and the local-usage engine became immediately reachable once Tailscale connectivity returned, the server-side Termux/runit/sshd/PocketRisu stack had already been running in the background.

This strongly separates the controlled-reboot failure into two layers:

1. Termux/sshd/PocketRisu automatic boot recovery: apparently succeeded.
2. Tailscale VPN/session automatic post-reboot recovery: failed until the Tailscale app was foregrounded.

The manager HTTP 401 is not a service failure; it confirms the manager endpoint was reachable without the required auth header.

This also weakens the hypothesis that the earlier post-boot service loss was intrinsic to Termux itself. Since the rebooted server stack remained available long enough to be reached after Tailscale was foregrounded, the removal of executable `.bak-*` boot scripts remains a strong candidate for fixing the earlier ~11-minute Termux-generation loss. A remote service-age inspection is still required before calling that fix fully validated.

## Safety / privacy

No private Tailscale address, auth token, or key fingerprint is recorded here.
