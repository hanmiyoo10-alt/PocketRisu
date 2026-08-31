# Android dual-phone second reboot 25-minute survival PASS (2026-09-01)

## Scope

This note records the second controlled reboot validation after:

- historical `.bak-*` Termux:Boot scripts had been moved out of the active `~/.termux/boot/` directory, and
- the server-phone Tailscale battery policy had been changed from optimized to unrestricted.

No server Termux UI or Tailscale UI was opened during this second-reboot survival interval.

## Observation

At main-phone time `2026-09-01T05:05:26+0900`:

- main SSH tunnel service age: 1516 s
- main notify tunnel service age: 1517 s
- forwarded PocketRisu core health: HTTP 200
- forwarded local-usage engine health: HTTP 200

Remote SSH inspection succeeded with `remote_ssh_rc=0`.

At server-phone time `2026-09-01T05:05:27+0900`, the following services all belonged to the same runit generation and had age 1517 s:

- `sshd`
- `pocketrisu`
- `llmgateway-bridge`
- `local-usage-runtime-manager`
- `local-usage-runtime-engine`

The current wake-lock marker was:

- time: `2026-09-01T04:40:24+0900`
- phase: `post_core_wait`
- rc: `0`

## Interpretation

1517 seconds is approximately 25 minutes 17 seconds. Therefore the previous roughly 11-minute post-boot service-loss boundary did not reproduce in this second controlled reboot either.

This is strong evidence that the server Termux/runit/PocketRisu stack remained alive well past the prior failure window while the server Termux UI remained unopened.

The second reboot also demonstrated that Tailscale connectivity recovered automatically without opening the Tailscale app after the battery policy had been changed to unrestricted. This is a strong before/after correlation, but it is not by itself proof that the battery-policy change was the sole cause.

Similarly, the continued server-stack stability after removing executable historical `.bak-*` boot scripts strongly supports the boot-script race hypothesis, but does not by itself prove a unique single cause.

## Current conclusion

- second reboot automatic network recovery: PASS
- second reboot server-stack survival beyond previous ~11-minute loss window: PASS
- main SSH/notify tunnels remained stable for ~25 minutes
- PocketRisu core and local-usage engine remained healthy
- no server Termux UI was opened
- no service restart or wake-lock modification was performed during the observation

Private Tailscale addresses and credentials are intentionally omitted.
