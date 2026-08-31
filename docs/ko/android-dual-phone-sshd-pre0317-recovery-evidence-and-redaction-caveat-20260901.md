# Android dual-phone: sshd pre-03:17 recovery evidence and redaction caveat (2026-09-01)

## Summary

A controlled server-phone inspection of the newest pre-03:17 `sshd` rotated log confirmed that the post-boot sshd generation did accept two public-key SSH connections and then recorded two failures to connect the SSH-forward target at local port 6001.

This strongly supports the previously inferred boot ordering:

1. sshd becomes available first,
2. the main-phone SSH and notify tunnels reconnect,
3. PocketRisu/core on port 6001 is not yet ready at the first forwarded requests,
4. the core later becomes ready, consistent with the boot marker's `core_ready=1` / `post_core_wait` record.

The 569-byte rotated sshd log contains no explicit normal shutdown/exit line; it ends after `connect_to ... port 6001: failed.` records. This does not by itself prove a forced process death, but it does not provide evidence of an orderly sshd shutdown either.

The current 03:17 sshd generation showed the same ordering pattern (`Server listening` -> public-key acceptance -> initial port-6001 forward failure), providing a useful comparison that the boot/UI-start path starts sshd before PocketRisu is fully ready.

## Important caveat

The inspection command used an overly broad IPv6-redaction regular expression. It also matched colon-separated timestamp portions such as `17:11:47`, replacing them with `[PRIVATE_IPV6]`. Therefore, exact per-line event timestamps from this specific captured output must not be used for chronology.

A follow-up inspection should re-read only the small newest rotated sshd log with a safer redaction that masks IPv4 addresses but leaves timestamps intact. Private network addresses must not be committed to the repository.

## PocketRisu service log

The PocketRisu log contains many `Session boot registered`, `Write lock taken over by a freshly-booted session`, and `HTTP server is running.` records. However, the same over-broad redaction corrupted the timestamp portions of timestamped lines, so the latest restart block must be re-indexed with safe redaction before correlating it to the 02:11-02:22 KST boundary.

## Current interpretation

Evidence remains consistent with a short-lived recovery after the 02:11 boot-script run: sshd definitely accepted both main-phone tunnel connections. The later re-loss around 02:22 still lacks an explicit server-side orderly shutdown record. Further diagnosis should preserve the current state and inspect exact timestamps without modifying wake-lock or service configuration.
