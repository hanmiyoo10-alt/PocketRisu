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

## Client generation-state and fetch timeout inspection

The client-side generation state and fetch transport were inspected without changing files.

Observed generation-state behavior:

- `generationStates` is memory-only;
- `startGeneration(...)` inserts a live generation entry;
- normal removal requires a later `endGeneration(...)` call;
- there is no independent watchdog in `generationState.ts` that expires a live generation solely because it has been stuck for a long time;
- the main send code contains multiple awaited stream reads, including `await reader.read()` in `src/ts/process/index.svelte.ts`.

Observed `fetchNative` / `fetchNativeRaw` behavior:

- `FetchNativeArgs` supports `requestTimeoutMs` and an external `AbortSignal`;
- `fetchNativeRaw(...)` calls `buildTimeoutSignal(arg.signal, arg.requestTimeoutMs)` and passes the resulting signal to direct fetch, WebSocket proxy-job, and `/proxy2` branches;
- however, `fetchNativeRaw(...)` executes `timeoutSignal.cleanup()` in its `finally` block;
- for the normal `fetch(...)` and `/proxy2` branches, `fetchNativeRaw(...)` returns as soon as the `Response` object is obtained, before downstream code has consumed the streaming response body;
- therefore the timeout helper's lifetime appears to end at **response acquisition / headers**, not necessarily at completion of the response body stream.

This is a concrete structural candidate for the infinite-loading behavior. If an Android/Firefox route transition leaves an already-open response body's `reader.read()` pending without a clean end or error, the request-level timeout may already have been cleaned up and there is no generation-state watchdog to force terminal cleanup. In that case `endGeneration(...)` is never reached and the UI can remain indefinitely in the generating state even though SSH and server health remain normal.

This is not yet classified as the proven root cause. The next inspection must verify the implementation of `buildTimeoutSignal(...)`, especially whether `cleanup()` clears the timeout and/or detaches the caller abort listener, and inspect the exact streaming reader loop(s) that consume the response to determine whether they have their own inactivity deadline or abort path.

## Current interpretation

Confirmed:

1. main-phone SSH/core transport was healthy during the failure;
2. server PocketRisu health was healthy during the failure;
3. the live model-job DB contained no job created in the preceding three hours;
4. there was no active main job, unclaimed terminal main job, or pending-send tombstone for the incident;
5. therefore the 12:28 infinite-loading request did not leave any durable model-job state in the live server database;
6. the request path only uses server jobs under a specific toggle/tools/preview gate and may fall back to proxied/direct transport;
7. the live request-log DB has not recorded current traffic since August 13 and is not usable to classify the 12:28 request route;
8. the client has awaited stream-reader paths with generation cleanup only after terminal progress;
9. `fetchNativeRaw(...)` appears to clean up its request timeout immediately after returning a `Response`, before a streaming body is necessarily finished.

A stuck durable model job is unlikely. The strongest current structural candidate is a client-side response-body stream that becomes non-terminal after a Firefox/Android route change, while the request timeout has already been cleaned up and no generation watchdog exists.

## Next diagnostic

Keep the browser stuck if possible and do not patch or reload yet.

Inspect `buildTimeoutSignal(...)` and the exact main streaming-reader loop(s), including any try/finally cleanup around `reader.read()`. Confirm whether a body-read inactivity timeout exists anywhere after the `Response` object is returned.

Automatic full-page reload remains forbidden as a recovery mechanism.
