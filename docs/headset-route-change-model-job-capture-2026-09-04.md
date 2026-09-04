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

## Provisional durable model-job DB capture

At approximately 12:32 KST, `$HOME/PocketRisu/save/model-jobs.db` was opened read-only and queried for the previous three hours.

Observed result:

- `recent_jobs=0`;
- active main jobs: none;
- unclaimed terminal main jobs: none;
- pending sends: none.

However, the inspected DB files had unexpectedly old timestamps (`model-jobs.db` from August, WAL from August, SHM from September 3). Because `server.cjs` passes its runtime `savePath` into `createModelJobs(...)`, this result must be treated as **provisional until the live process's actual savePath / open model-jobs DB file is confirmed**.

Do not yet conclude that the 12:28 incident bypassed model jobs solely from this default-path query.

## Current interpretation

Confirmed:

1. main-phone SSH/core transport was healthy;
2. server PocketRisu health was healthy;
3. the default `$HOME/PocketRisu/save/model-jobs.db` query returned no recent/active/unclaimed jobs and no pending sends;
4. that DB looks stale enough that its relevance to the live process must be verified before using it diagnostically.

`jobFetch.ts` normally POSTs `/api/model-jobs` before attaching to `/api/model-jobs/:id/stream`, and falls back to the direct request path if creation throws or returns a non-OK status other than 409. But classic/direct routing versus failed-job-creation fallback cannot be distinguished until the live DB path and request-selection path are verified.

## Next diagnostic

Keep the browser stuck if possible and do not patch or reload yet.

1. Inspect `server.cjs` for the live `savePath` definition.
2. Inspect `/proc/<pocketrisu-pid>/fd` for the actual open `model-jobs.db`, WAL, and SHM files.
3. Only after that, query the confirmed live DB and inspect the request-selection path if needed.

Automatic full-page reload remains forbidden as a recovery mechanism.