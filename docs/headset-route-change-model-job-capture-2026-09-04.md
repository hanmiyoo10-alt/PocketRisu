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

At approximately 12:32 KST, `$HOME/PocketRisu/save/model-jobs.db` was opened read-only and queried for the previous three hours.

Observed result:

- `recent_jobs=0`;
- active main jobs: none;
- unclaimed terminal main jobs: none;
- pending sends: none.

Initially this was treated as provisional because the DB/WAL timestamps looked unexpectedly old.

## Live DB path confirmation

A follow-up INSPECT_ONLY check confirmed that the queried path is the database opened by the live PocketRisu process.

Observed live process details:

- `pocketrisu` PID: `17599`;
- process cwd: `/data/data/com.termux/files/home/PocketRisu`;
- `server/node/server.cjs` defines `savePath = path.join(process.cwd(), "save")`;
- `createModelJobs({ saveDir: savePath, logger })` therefore resolves to `$HOME/PocketRisu/save` for this process;
- `/proc/17599/fd/23` points to `$HOME/PocketRisu/save/model-jobs.db`;
- `/proc/17599/fd/24` points to `$HOME/PocketRisu/save/model-jobs.db-wal`;
- `/proc/17599/fd/25` points to `$HOME/PocketRisu/save/model-jobs.db-shm`;
- a full `$HOME` search found no second model-jobs DB set.

This removes the earlier uncertainty: the 12:32 read-only query was against the actual live model-job database.

## Request-selection source inspection

The deployed request path was inspected around `makeJobFetch` and `resolveChatModelBinding`.

Confirmed behavior:

- ModelPreset selection is decided first by `resolveChatModelBinding(...)` in `requestChatDataMain`;
- a ModelPreset request only uses `makeJobFetch` when `nodeOnlyServerSideRequests === true`, there are no tools, and the request is not a preview;
- otherwise the request uses `proxiedFetch` directly;
- `makeJobFetch` itself falls back to the same proxied/direct path when model-job creation throws or returns a non-OK status other than 409;
- therefore the absence of a durable model-job row is compatible with either a non-job request path or job-creation fallback.

The request-log layer wraps the selected transport and can record route `direct`, `proxy`, or `job`. However, its entries are held client-side until the request scope closes and are POSTed to the server afterward. A tab/request that hangs before scope completion can therefore leave no request-log row for the stuck request.

## Request-log capture during the same failure

A read-only query of `$HOME/PocketRisu/save/request-logs.db` for `2026-09-04 12:20:00–12:35:00 KST` returned:

- `rows=0`.

A follow-up live-process check confirmed that this is the request-log DB actually opened by PID `17599`:

- `/proc/17599/fd/26` → `$HOME/PocketRisu/save/request-logs.db`;
- `/proc/17599/fd/27` → `$HOME/PocketRisu/save/request-logs.db-wal`;
- `/proc/17599/fd/28` → `$HOME/PocketRisu/save/request-logs.db-shm`.

The DB contains exactly 300 request rows, but the newest row is from `2026-08-13 23:35:13 KST`; the ten latest rows are all from August 13 and use `source=other`, `route=direct`, `status=200`, `success=1`.

Therefore the request-log subsystem is not producing recent rows for current PocketRisu traffic. The 12:28 zero-row window cannot be used to infer whether the stuck request began, selected `direct`/`proxy`/`job`, or failed to close. The DB is live/open but diagnostically stale for this incident.

Because request logging flushes rows only after a client request scope closes, even a working current logger would not guarantee a row for a presently hung request. In this deployment, however, the stronger issue is that no recent request rows have been written at all since August 13.

## Current interpretation

Confirmed:

1. main-phone SSH/core transport was healthy during the failure;
2. server PocketRisu health was healthy during the failure;
3. the live model-job DB contained no job created in the preceding three hours;
4. there was no active main job, unclaimed terminal main job, or pending-send tombstone for the incident;
5. therefore the 12:28 infinite-loading request did not leave any durable model-job state in the live server database;
6. the request path only uses server jobs under a specific toggle/tools/preview gate and may fall back to proxied/direct transport;
7. the live request-log DB has not recorded current traffic since August 13 and is not usable to classify the 12:28 request route.

A stuck durable model job is now unlikely. The stronger remaining candidates are:

- a classic/direct or proxied request path that bypassed model jobs;
- a ModelPreset request whose model-job creation failed and fell back before any durable row existed;
- a client-side request pipeline hang before model-job creation;
- a client-side stream/request that began but never reached terminal cleanup.

## Next diagnostic

Keep the browser stuck if possible and do not patch or reload yet.

Do not spend more time on `request-logs.db` for this reproduction. Instead inspect the current client request path and terminal cleanup directly: classic/preset dispatch, `fetchNative`/proxy transport, streaming reader loop, abort/timeout handling, and generation-state cleanup. The next goal is to identify a path where Firefox can keep a generation marked active after an audio-route transition without any backend outage or durable model job.

Automatic full-page reload remains forbidden as a recovery mechanism.
