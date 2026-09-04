# Main-phone native notification loop — 2026-09-04

## Incident

After the stream-liveness build was deployed, the user reported that Android notifications began repeating again ("무한 알림 또 뜬다"). This is being treated separately from the response-stream infinite-loading investigation.

## Main-phone INSPECT_ONLY capture

The main-phone Termux/runit notification stack was inspected without restarting services or changing files.

Observed services:

- `pocketrisu-notify-relay`: running, PID 27752, age ~79471 s;
- `pocketrisu-notify-tunnel`: running, SSH PID 5492, age ~633 s;
- `pocketrisu-ssh-tunnel`: running, SSH PID 5504, age ~631 s;
- `pocketrisu-reconnect-watch`: running, PID 27738, age ~79471 s;
- `pocketrisu-watchdog`: down by design/current state.

Observed process topology:

- one relay receiver process: `node ~/.local/share/pocketrisu-notify-relay/receiver.cjs`;
- notify reverse tunnel: `ssh -N ... -R 127.0.0.1:39120:127.0.0.1:39120 ...`;
- core tunnel: `ssh -N ... -L 127.0.0.1:6001:127.0.0.1:6001 ...` plus the existing local forwards;
- a long-running reconnect watcher remains active.

The relay process itself has not been rapidly restarting. In contrast, both SSH tunnel processes were only ~10.5 minutes old at capture time, so they had recently reconnected/restarted together. This timing is noteworthy but does not yet prove that tunnel reconnection caused the repeated notifications.

The generic `ss` filter returned no rows in this Termux capture and should not be used to infer that the relay/tunnel ports were absent.

The first log probe also returned no rows because the service run scripts show `svlogd` writing under `~/.local/state/pocketrisu-*`, not under the runit service directory paths that were initially checked.

## Current interpretation

Confirmed:

1. the main-phone notification relay is a single long-lived Node process, not a rapidly respawning loop;
2. the notify and core SSH tunnels both restarted/reconnected roughly 10 minutes before the capture;
3. the runit service definitions themselves do not show an obvious notification-generation loop;
4. no conclusion can yet be drawn about whether duplicate notification events originate in the main relay, are replayed after tunnel reconnection, or are repeatedly emitted by the server endpoint.

## Next diagnostic

Stay on the main phone first and keep the current state intact if possible.

Inspect:

- `~/.local/share/pocketrisu-notify-relay/receiver.cjs`;
- the actual `~/.local/state/pocketrisu-notify-relay` and `~/.local/state/pocketrisu-notify-tunnel` logs;
- any local request counters/dedupe/id handling in the relay.

Only after the main-phone relay behavior is understood should the server-phone `/api/termux-notify` producer be inspected. Server phone must not create Android notifications.
