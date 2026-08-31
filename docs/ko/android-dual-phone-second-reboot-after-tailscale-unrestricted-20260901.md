# Android dual-phone: second reboot after setting Tailscale battery to unrestricted (2026-09-01)

## Context

A second controlled Android reboot was performed on the server phone after two changes had already been applied:

1. Executable `.bak-*` files were removed from the active `~/.termux/boot/` directory and quarantined outside it, eliminating the old boot-script `termux-wake-unlock` race candidate.
2. Samsung battery policy for the Tailscale app was changed from **Optimized** to **Unrestricted** while Android Always-on VPN remained enabled and “block connections without VPN” remained disabled.

## Event

- User reported the second controlled reboot completed at approximately **2026-09-01 04:39 KST**.
- This is the first reboot intended to test whether the Tailscale battery-policy change allows the VPN peer to become reachable automatically after boot.
- The server phone’s Termux UI and Tailscale app must remain unopened until the remote-only check is performed, so app foregrounding does not contaminate the result.

## Next validation

From the main phone only:

- parse the private server peer from the existing SSH tunnel run file without printing it,
- probe peer ICMP reachability,
- inspect both main SSH tunnel services,
- probe forwarded PocketRisu core and local-usage engine/manager endpoints,
- inspect recent transport errors to distinguish automatic recovery from repeated timeout/refusal.

No private endpoint, token, or key material is stored in this document.
