# Headset route-change model-job capture — 2026-09-04

## Incident

A real headset connect/disconnect test reproduced PocketRisu infinite loading on the main phone while the browser page was intentionally kept unrefreshed for diagnosis.

## Main-phone state during failure

At approximately 2026-09-04 12:28 KST:

- core SSH tunnel remained running and retained its existing PID;
- notify SSH tunnel remained running and retained its existing PID;
- the expected local forward to `127.0.0.1:6001` existed;
- forwarded `/api/health` returned HTTP 200.

This rules out a core SSH tunnel outage at the capture checkpoint.

## Server-phone state during failure

At approximately 12:30 KST:

- the `pocketrisu` runit service remained running;
- direct `127.0.0.1:6001/api/health` returned HTTP 200;
- `pocketrisu-service.log` had not been modified since 12:03, so old `ERR_STREAM_PREMATURE_CLOSE`, relay timeout, and HTTP/2 errors in that file are not time-correlated evidence for this incident.

## Durable model-job DB capture

At approximately 12:32 KST, `save/model-jobs.db` was opened read-only and queried for the previous three hours.

Observed result:

- `recent_jobs=0`;
- active main jobs: none;
- unclaimed terminal main jobs: none;
- pending sends: none.

Therefore the 12:28 infinite-loading incident did **not** leave a durable model-job record or pending-send tombstone in the server database.

This is materially different from the expected `jobFetch` path, which normally POSTs `/api/model-jobs` before attaching to `/api/model-jobs/:id/stream` and leaves persistent job metadata in `save/model-jobs.db`.

## Current interpretation

The failure is now narrowed further:

1. main-phone SSH/core transport was healthy;
2. server PocketRisu health was healthy;
3. there was no durable model-job or pending-send record for the incident window.

The strongest remaining hypotheses are:

- the client never reached model-job creation before becoming stuck;
- the active request path bypassed model jobs (for example a classic/direct request path rather than the ModelPreset job-backed path);
- model-job creation failed client-side and `jobFetch` fell back to its direct proxied fetch path before the headset-route failure became visible.

`jobFetch.ts` explicitly falls back to the direct request path when `/api/model-jobs` creation throws or returns a non-OK status other than 409, so absence of a DB row does not by itself distinguish “classic path” from “job creation failed then fallback”.

## Next diagnostic

Do not patch or reload yet. Inspect the deployed request-selection path and the currently active chat/model regime to determine whether the stuck request should have used `makeJobFetch` at all. Also inspect any client/request logging that can show whether `/api/model-jobs` was attempted before fallback.

Automatic full-page reload remains forbidden as a recovery mechanism.