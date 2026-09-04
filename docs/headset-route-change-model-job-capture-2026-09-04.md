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

## Final liveness prepatch inspection

The final prepatch inspection produced three additional findings.

### Existing `globalApi.svelte.ts` local diff

The local `globalApi.svelte.ts` changes are unrelated to the body-stream timeout helper. They adjust session-handoff formatting/notice behavior and disable the hide-time `/api/db/flush` call. The file therefore remains locally modified, but the inspected diff does not overlap `buildTimeoutSignal(...)` or `fetchNativeRaw(...)`.

The same inspected area also exposed an existing `location.reload()` in the session-handoff path of `saveDb()`. It is guarded by `if (get(doingChat)) return`, so it should not fire while the current stuck generation remains marked active. It is therefore not a strong explanation for this headset incident. However, it is a separate automatic-refresh path and must be handled independently under the project's manual-refresh-only policy rather than being silently treated as absent.

### Main send terminal structure

The shown `sendChat(...)` tail reaches `clearPendingSend(realChatId)` and `return true` at lines ~2117–2118, but no `endGeneration(genKey)` is visible in that tail segment. Earlier `endGeneration(...)` calls exist for placeholder/recursive/other branches, and external callers may perform terminal cleanup. Therefore it would be unsafe to assume that throwing from the new stream watchdog automatically releases generation state until the caller-level lifecycle is inspected.

### Auto-TTS branch

Auto-TTS occurs in both the streaming and non-streaming response branches before the function's later terminal tail:

- streaming branch: `if(DBState.db.ttsAutoSpeech) await sayTTS(currentChar, result)` around lines ~1701–1702;
- non-streaming/multiline branch: the same await around ~1765–1766.

The database default for `ttsAutoSpeech` is false, but the current user's runtime value was not established by this source-only inspection.

## Caller cleanup and TTS promise semantics

A final caller/TTS inspection resolved the remaining prepatch uncertainty.

### Caller-owned generation cleanup

`sendChat(...)` deliberately leaves the terminal live-generation entry for its caller to release. This is explicit in the `src/ts/process/command.ts` comment around its `await sendChat(-1)` call.

For the normal chat UI path in `src/lib/ChatScreens/DefaultChatScreen.svelte`:

- an `AbortController` is registered before the send;
- `await sendChat(-1, ...)` is wrapped in `try/catch`;
- the same caller contains `endGeneration(genKey)` immediately after that send/catch region;
- the interrupted-send recovery caller similarly performs `endGeneration(chatId)` and `clearPendingSend(chatId)` after its `await sendChat(...)` attempt.

Therefore a new stream-read timeout may safely **throw/unwind** from `sendChat(...)`: the normal UI caller already owns generation-state release after both success and thrown error. The stream loop's existing `finally` will also clear `isStreaming` and cancel the reader once the timed read rejects.

### TTS does not wait for audio playback completion

The current `src/ts/process/tts.ts` implementation shows that the WebAudio helper:

- creates an `AudioContext`;
- decodes the audio;
- creates/connects an `AudioBufferSourceNode`;
- calls `sourceNode.start()`;
- then returns immediately.

It does **not** await the source node's `ended` event or otherwise wait for the actual playback duration. The Web Speech branch likewise calls `speechSynthesis.speak(...)` without awaiting speech completion.

Therefore an already-started audio playback route change does not, by itself, keep the `await sayTTS(...)` promise pending for the duration of playback. TTS can still block earlier on network fetches, translation/hooks, decode, or provider-specific retry/sleep logic, so it remains a separate liveness concern; however it should not be mixed into the first headset-stream patch without evidence that the incident was inside one of those earlier awaits.

### First repair scope

The first repair should remain narrowly scoped to the proven stream-lifetime gap:

- patch only the main response `reader.read()` loop in `src/ts/process/index.svelte.ts`;
- reuse `DBState.db.localNetworkTimeoutSec` (default 600 seconds) as the stream-read inactivity bound, preserving the existing timeout configuration instead of inventing a new unrelated value;
- on inactivity timeout, cancel the reader and throw a `TimeoutError` so the existing stream `finally` and caller-owned generation cleanup run;
- preserve the partial response already written to the chat;
- leave `globalApi.svelte.ts`, TTS behavior, and the existing notification diff untouched in this first patch;
- never reload the page automatically.

## Current interpretation

Confirmed:

1. main-phone SSH/core transport was healthy during the failure;
2. server PocketRisu health was healthy during the failure;
3. the live model-job DB contained no job created in the preceding three hours;
4. there was no active main job, unclaimed terminal main job, or pending-send tombstone for the incident;
5. therefore the 12:28 infinite-loading request did not leave any durable model-job state in the live server database;
6. the request path only uses server jobs under a specific toggle/tools/preview gate and may fall back to proxied/direct transport;
7. the live request-log DB has not recorded current traffic since August 13 and is not usable to classify the 12:28 request route;
8. `fetchNativeRaw(...)` definitely clears its request timeout after the `Response` is obtained, before a streaming body is necessarily finished;
9. the main streaming reader loop has no independent inactivity timeout or bounded read deadline;
10. the normal chat UI caller owns terminal `endGeneration(...)` cleanup, so a timed stream read can safely reject and unwind;
11. `sayTTS(...)` does not wait for actual WebAudio/WebSpeech playback completion, so playback duration itself is not the reason generation remains active;
12. existing local notification/globalApi changes can be preserved by patching only the stream loop.

The strongest current structural explanation remains a client-side response-body stream that becomes non-terminal after a Firefox/Android route change, while the request timeout has already been cleared and no stream-read watchdog exists.

## Next repair direction

Do not add automatic page reload.

Apply a guarded, backed-up, one-file patch to `src/ts/process/index.svelte.ts` that adds a per-read inactivity timeout around the main streaming `reader.read()` call using the existing `localNetworkTimeoutSec` value. After the patch, run `git diff --check`, `svelte-check`, and a production build before any runtime validation.

TTS lifecycle cleanup and the separate session-handoff `location.reload()` policy violation remain follow-up items and should not be conflated with this first stream-liveness repair.
