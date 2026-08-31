# Android dual-phone boot backup isolation applied (2026-09-01)

## Result

The pre-change snapshot at `~/.termux/boot-snapshot-pre-clean-20260901-035643` was verified with matching SHA-256 hashes before any active boot-directory modification.

Four historical `.bak-*` PocketRisu boot scripts were then moved out of `~/.termux/boot/` into `~/.termux/boot-disabled-backups-20260901`.

The active boot directory now contains only:

- `00-boot-probe`
- `00-pocketrisu-server`
- `50-taskbridge`

The SHA-256 hashes of all three active files were identical before and after the move. The active boot directory contains no `termux-wake-unlock` command after isolation.

## Interpretation

This removes historical backup scripts from the Termux:Boot execution surface without changing the current PocketRisu boot script, boot probe, or taskbridge content. In particular, the historical backup that explicitly released the wake lock is no longer present in the active boot directory.

This is a controlled configuration correction, not yet proof that the long-horizon Termux/runit/sshd disappearance is solved. A controlled reboot and post-boot soak validation are still required.

No private network address, token, or credential is recorded here.
