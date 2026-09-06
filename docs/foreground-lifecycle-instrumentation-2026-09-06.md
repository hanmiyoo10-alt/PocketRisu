# Foreground lifecycle instrumentation — 2026-09-06

## Purpose

The foreground-return refresh/reconstruction still reproduces after removing writer-lock auto-reloads and after removing the hide/pagehide immediate chat-scroll DOM scan. Do not add automatic reload recovery. The next step is instrumentation to distinguish same-document resume from a new Firefox document/content-process reconstruction.

## Entry points and existing logging

`src/main.ts` imports `./ts/log-capture` at line 3, before database/bootstrap initialization. `loadData()` is called once from `src/main.ts`.

`src/ts/log.ts` already provides buffered `/api/logs` persistence through `addLog()`, but it uses a 500 ms flush delay and drops a batch if network/auth setup fails. Therefore it is useful as a secondary mirror, but not sufficient as the sole source of lifecycle evidence around process death/reconstruction.

`src/ts/log-capture.ts` currently captures console error/warn, window error, and unhandled rejection only. It has no lifecycle tracing today, making it a suitable early import point for non-invasive lifecycle instrumentation.

`src/ts/storage/nodeStorage.ts` stores the writer identity in `sessionStorage` key `risu-writer-session-id`. Same-tab reload/OS tab restore is intended to preserve that id; a genuinely new tab gets a new id.

The server exposes `/api/logs` routes in `server/node/server.cjs` around lines 4153 onward.

## Clean-file verification before instrumentation

Before any lifecycle instrumentation edit:

- `src/main.ts` SHA-256: `db6fad037050e542032f184fe67c7ba19ed9006a53bcf4b3fa69584989828cfd`
- `src/ts/log-capture.ts` SHA-256: `2cf774e265ca4def0bd81c87ebb9604835dabf39f350c922416536a4c77b7aa4`
- `git diff -- src/main.ts` is empty
- `git diff -- src/ts/log-capture.ts` is empty

So both candidate files are currently clean relative to repository HEAD, and instrumentation can be added narrowly without colliding with existing local modifications.

## Planned trace

Prefer adding the trace only to `src/ts/log-capture.ts`, since `src/main.ts` already imports it at the earliest useful point. Use a small bounded `localStorage` ring so evidence survives a new document boot. Record at minimum:

- per-document `bootId`
- timestamp / `performance.timeOrigin`
- lifecycle event name
- `document.visibilityState`
- `pagehide/pageshow` `persisted` flag
- Navigation Timing entry `type`
- current `risu-writer-session-id` if present

The ring should be bounded and best-effort, must never crash startup if storage is unavailable, and must not trigger reload/navigation. Existing `/api/logs` can be used only as a delayed secondary mirror after the app has had time to initialize.
