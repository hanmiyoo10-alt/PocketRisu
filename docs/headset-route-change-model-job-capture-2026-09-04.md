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
- therefore the timeout helper's lifetime ends at **response acquisition / headers**, not at completion of the response body stream.

## Confirmed stream-lifetime timeout gap

A follow-up inspection confirmed the exact helper and the main body-consumption loop.

`buildTimeoutSignal(...)`:

- creates a new `AbortController` when `timeoutMs > 0`;
- schedules `setTimeout(() => controller.abort(), timeoutMs)`;
- mirrors an external abort signal into the controller;
- returns `cleanup: () => clearTimeout(timeoutId)`.

`fetchNativeRaw(...)` calls that `cleanup()` in its `finally` block immediately after the transport promise resolves. For browser `fetch()`, that promise resolves once response headers are available; it does not wait for the streamed response body to finish.

The main streaming reply path in `src/ts/process/index.svelte.ts` then obtains `req.result.getReader()` and performs:

- `while (streamAborted === false)`;
- `readed = await reader.read()`;
- no `Promise.race`, inactivity timer, or per-read deadline around that `reader.read()`;
- an abort listener exists, but it only reacts to the existing external `abortSignal`;
- terminal cleanup of `isStreaming` and `reader.cancel()` is in a `finally`, but that `finally` cannot execute while `await reader.read()` remains unresolved.

This confirms a real structural liveness bug: after headers are received, the request timeout is cleared while the body stream may still be open indefinitely. If Firefox/Android leaves that body stream in a non-terminal state after an audio-route transition, the client can wait forever. Because the send promise never unwinds, later generation cleanup such as `endGeneration(...)` is also not reached, leaving the UI stuck in the generating state even though the server and SSH path remain healthy.

This does **not** prove that every headset route-change failure is caused by this exact browser behavior, but it proves that PocketRisu currently has no bounded recovery path for that failure mode.

## Patch precheck

Before modifying the streaming loop, the current local worktree was inspected.

Observed status / hashes:

- `src/ts/process/index.svelte.ts` is already locally modified; SHA-256 `8a8e10f7d87b5dce0897dbbb083df6f0ffeeb0154c41eec64ecb058a155eaf33`;
- `src/ts/globalApi.svelte.ts` is already locally modified; SHA-256 `9c2fb3d453ea2b387f61cf91776e115ce81d0cb6c8e64112f1003614e0df066e`;
- `src/ts/process/request/request.ts` is clean in the targeted status check; SHA-256 `7ff1e0de7a92b2912041c870f44ea2e68ee8f6704e3dccb0c3f41376ee1cc88a`.

The existing local diff in `index.svelte.ts` is the native Termux notification work: request-start timing/metadata propagation and replacement of the old browser notification with `/api/termux-notify` completion notification. It does not modify the `reader.read()` loop shown in this investigation, so a carefully scoped streaming-liveness patch can avoid overlapping that existing change.

The existing timeout configuration is `localNetworkTimeoutSec`, defaulting to `600` seconds. `request.ts` passes it as `requestTimeoutMs` for proxied/model-preset transport and as the model-job timeout. This means there is an existing user/database timeout value that can be reused rather than inventing an unrelated hard-coded deadline.

One additional terminal-stage risk surfaced in the precheck: `src/ts/process/index.svelte.ts` awaits `sayTTS(currentChar, result)` when `DBState.db.ttsAutoSpeech` is enabled, and this happens before the later terminal generation cleanup. Therefore a TTS promise that itself becomes non-terminal can also keep the generation marked active even after the response stream has finished. This is consistent with the separate TTS audio-lifecycle concerns already under investigation, but it is not yet proven to be involved in this headset incident.

Because `globalApi.svelte.ts` is also locally modified, do not patch it until its existing diff is inspected. The lower-conflict repair candidate is currently the main streaming loop in `index.svelte.ts`, but the exact terminal cleanup path must be inspected before deciding whether timeout should break, return, or throw.

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
9. `fetchNativeRaw(...)` definitely clears its request timeout after the `Response` is obtained, before a streaming body is necessarily finished;
10. the main streaming reader loop has no independent inactivity timeout or bounded read deadline;
11. the target streaming file already contains unrelated local notification changes that must be preserved;
12. auto-TTS is another possible post-stream non-terminal await because it occurs before terminal generation cleanup.

A stuck durable model job is unlikely. The strongest current structural explanation remains a client-side response-body stream that becomes non-terminal after a Firefox/Android route change, while the request timeout has already been cleared and no stream-read watchdog exists. TTS remains a second, separate client-side liveness candidate if auto-speech is enabled.

## Next diagnostic / repair direction

Do not add automatic page reload.

Before editing:

- inspect the current local diff in `src/ts/globalApi.svelte.ts`;
- inspect the remaining terminal `sendChat` cleanup after the shown notification/TTS area to confirm exactly where `endGeneration(...)` and `clearPendingSend(...)` occur on success and thrown errors;
- inspect the auto-TTS call site/setting only enough to avoid misattributing a post-stream TTS stall to the stream reader.

Then choose the smallest repair that guarantees a non-terminal body read can unwind into existing cleanup while preserving the unrelated notification modifications and any partial response already received.

Automatic full-page reload remains forbidden as a recovery mechanism.
