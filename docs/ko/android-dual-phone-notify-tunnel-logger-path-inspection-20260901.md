# Android dual-phone notify tunnel logger path inspection — 2026-09-01

## Result

Main-phone `pocketrisu-notify-tunnel` logger structure was inspected without modifying or restarting services.

Observed `log/run`:

```sh
#!/data/data/com.termux/files/usr/bin/sh

PREFIX="/data/data/com.termux/files/usr"
D="$HOME/.local/state/pocketrisu-notify-tunnel"

mkdir -p "$D"
exec "$PREFIX/bin/svlogd" -tt "$D"
```

Logger status at inspection time:

```text
run: .../pocketrisu-notify-tunnel/log: (pid 21909) 201323s
```

Therefore the actual notify tunnel log directory is:

```text
$HOME/.local/state/pocketrisu-notify-tunnel
```

The logger itself remained long-lived, so it can be used as an independent comparison source against the main SSH tunnel timeline.

## Next diagnostic use

Compare notify-tunnel events around the already observed SSH-tunnel anomaly windows, especially around:

- 2026-08-31 12:53 UTC (21:53 KST)
- 2026-08-31 17:07 UTC (2026-09-01 02:07 KST)
- 2026-08-31 17:10 UTC (2026-09-01 02:10 KST)

This comparison may distinguish a single tunnel/session issue from a broader server-phone/network/backend outage.

No private endpoint or credential is recorded here.
