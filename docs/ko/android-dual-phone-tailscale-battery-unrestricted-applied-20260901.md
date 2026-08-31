# Tailscale battery unrestricted applied (2026-09-01)

## Context

After the controlled server-phone reboot, the main phone could not reach the server phone's Tailscale peer. Both SSH tunnel services were repeatedly timing out and ICMP to the parsed Tailscale peer returned 100% packet loss.

Android VPN settings on the server phone showed Tailscale configured as Always-on VPN with "Block connections without VPN" disabled. Tailscale app battery policy was still set to Optimized.

## Change

The server phone Tailscale battery policy was changed from Optimized to Unrestricted through Android Settings.

## Immediate observation

The user reported that the peer did not immediately become reachable after changing the battery policy.

This does not yet disprove the battery-policy hypothesis: changing Android battery policy does not necessarily restart an already inactive VPN session immediately. No Tailscale app launch and no Termux app launch were performed at this point, preserving the post-reboot state for further classification.

## Current interpretation

- Always-on VPN setting: enabled.
- Block connections without VPN: disabled.
- Tailscale battery policy: now Unrestricted.
- Immediate spontaneous peer recovery after the policy change: not observed yet.
- Root cause remains unresolved.
- Next step: re-check peer reachability and tunnel error class from the main phone before manually launching either Tailscale or Termux.

No private Tailscale address, authentication token, or other secret is recorded in this document.
