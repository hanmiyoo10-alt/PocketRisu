# Main-phone native notification loop — 2026-09-04

## Incident

After the stream-liveness build was deployed, the user reported that Android notifications began repeating again ("무한 알림 또 뜬다"). This is being treated separately from the response-stream infinite-loading investigation.

## Initial main-phone INSPECT_ONLY capture

The main-phone Termux/runit notification stack was inspected without restarting services or changing files.

Observed services:

- `pocketrisu-notify-relay`: running, PID 27752, long-lived;
- `pocketrisu-notify-tunnel`: running, SSH PID 5492, recently reconnected;
- `pocketrisu-ssh-tunnel`: running, SSH PID 5504, recently reconnected;
- `pocketrisu-reconnect-watch`: running, long-lived;
- `pocketrisu-watchdog`: down in the captured state.

Observed process topology:

- one relay receiver process: `node ~/.local/share/pocketrisu-notify-relay/receiver.cjs`;
- notify reverse tunnel: `ssh -N ... -R 127.0.0.1:39120:127.0.0.1:39120 ...`;
- core tunnel: `ssh -N ... -L 127.0.0.1:6001:127.0.0.1:6001 ...` plus the existing local forwards;
- a long-running reconnect watcher remains active.

The relay process itself was not rapidly restarting. Both SSH tunnel processes had restarted/reconnected recently, which was noted but not treated as proof of notification replay.

## Relay source inspection

Main-phone relay source:

`~/.local/share/pocketrisu-notify-relay/receiver.cjs`

SHA-256 at capture:

`917905c0f893e62b6ece7998cebae8d4ce24aa714897618116ce963089d70d17`

Confirmed behavior:

- listens only on `127.0.0.1:39120`;
- accepts authenticated `POST /notify` requests;
- logs every accepted POST before body handling;
- converts `body.stage` to either `start` or `done`;
- performs exactly one `spawn(termux-notification, args)` per completed POST body;
- uses fixed notification id `8472`;
- contains no `setInterval`, internal retry queue, replay loop, or duplicate-post loop;
- contains no dedupe mechanism, but the fixed `--id 8472` means each invocation targets the same Termux notification id rather than deliberately allocating a fresh id;
- the code currently logs `SOUND SUPPRESSED` for eligible `done` events and does not add a separate sound argument in that branch.

Therefore the relay itself is not structurally capable of generating an endless stream of notification invocations without receiving repeated POST requests or being invoked by some other external producer.

## Real relay log capture

Actual relay log path:

`~/.local/state/pocketrisu-notify-relay/current`

The log shows ordinary request pairs over time: typically one `stage=start` POST followed later by one `stage=done` POST.

Most recent captured pair:

- `2026-09-04T10:23:34.059Z` — one `POST /notify`, `stage=start`;
- `2026-09-04T10:24:54.199Z` — one `POST /notify`, `stage=done`.

At the user's local KST time this corresponds to approximately 19:23:34 and 19:24:54.

Crucially, the captured relay log does **not** show a rapid or endless sequence of `POST /notify` requests around the reported repeated-alert period. This rules out a simple server→tunnel→relay POST storm as the explanation for the observed repeated Android alert behavior at this checkpoint.

## Notify tunnel log capture

Actual notify tunnel log path:

`~/.local/state/pocketrisu-notify-tunnel/current`

The log records a substantial connectivity outage earlier on 2026-09-04:

- repeated SSH connection timeouts beginning around `09:38Z`;
- repeated timeouts through approximately `10:19Z`;
- then `Connection refused` attempts around `10:19Z–10:20Z`;
- the currently running notify/core SSH processes were created after this recovery period.

The relay's most recent start/done pair occurred after connectivity had recovered. No evidence in the relay log shows a queued notification backlog replaying continuously after reconnection.

## Current interpretation

Confirmed:

1. the main-phone relay is one long-lived Node process, not a respawn loop;
2. its source executes one `termux-notification` command per received POST and has no internal timer/retry loop;
3. the relay uses fixed id `8472` for its PocketRisu notification;
4. the real relay log shows normal discrete start/done pairs, not an endless POST storm;
5. the latest captured pair was approximately 19:23:34 KST start and 19:24:54 KST done;
6. the notify SSH tunnel had a long outage before reconnecting, but current evidence does not show backlog replay after reconnect;
7. therefore the reported "infinite notification" behavior is **not explained by repeated `/notify` delivery into the relay** in this capture.

Remaining candidates include:

- Android repeatedly surfacing/re-alerting the same active notification id 8472;
- a different notification producer (for example another app/browser notification path) rather than the Termux relay;
- a notification-channel/heads-up behavior that is independent of new relay POSTs;
- another local producer invoking `termux-notification` outside `receiver.cjs`.

Do not patch the server producer or relay retry logic based on this capture, because no relay POST loop exists in the evidence.

## Next diagnostic

Stay on the main phone first.

Capture the active Termux notification list while the repeated alert is visible and compare it with the relay's last log timestamp. The key question is whether the visible repeated alert is the single Termux notification id `8472` or belongs to a different notification source.

No Android notifications should ever be created on the server phone.
