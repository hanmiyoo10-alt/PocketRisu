# Foreground-return lifecycle instrumentation plan — 2026-09-06

## Context

The foreground-return refresh/reconstruction still reproduces after:

- removing PocketRisu writer-lock auto-reload paths;
- removing the hide/pagehide immediate chat scroll DOM/layout scan;
- passing `pnpm check` with 0 errors;
- passing a production `pnpm build`;
- manually loading the rebuilt app in Firefox.

The latest reproduction is stronger: after leaving PocketRisu in the background for a longer interval in another Android app, returning to Firefox/PocketRisu still caused the visible refresh/reconstruction.

Further blind patching is not justified. The next step is lifecycle instrumentation that distinguishes a resumed existing JavaScript document from a new document/content-process reconstruction.

## Existing logging facility

`src/ts/log.ts` already contains a reusable server-backed logging facility:

- `addLog(...)` buffers structured entries;
- the default flush delay is 500 ms;
- entries include timestamp, level, source, platform, client id, and user agent;
- `flush()` lazily imports `forageStorage`, creates auth, and POSTs to `/api/logs`;
- failed network/auth flushes are dropped by design and are not retried/persisted;
- the in-memory buffer is capped at 1000 entries.

This means it can be useful for post-startup lifecycle events, but it is not sufficient by itself as the only boot/reconstruction trace because a very early boot entry can be lost if the log flush occurs before storage/auth is ready, or if the document is killed before the 500 ms flush.

A synchronous local persistence layer should therefore be used for the critical reconstruction markers, with server log mirroring added only as a convenience.

## Startup entry point

`src/main.ts` is the only normal caller of `loadData()` (`src/ts/bootstrap.ts` exports it, and `src/main.ts` calls it).

`loadData()` begins normal initialization in `src/ts/bootstrap.ts`, including:

- local server readiness wait;
- `forageStorage.Init()`;
- database load/decode.

For reconstruction detection, instrumentation should start earlier than `loadData()` if possible so the boot marker exists even if initialization later stalls.

## Writer session continuity

`src/ts/storage/nodeStorage.ts` uses the session-storage key:

`risu-writer-session-id`

The static session id initializer:

- reads `sessionStorage.getItem('risu-writer-session-id')`;
- reuses it if present;
- otherwise mints and stores a new id;
- falls back to a per-load id only if storage access throws.

This makes the raw `sessionStorage` value a useful continuity signal:

- same value across a new boot suggests Firefox restored the same tab/session storage while recreating the document;
- changed/missing value suggests a genuinely new tab/session-storage context or privacy/storage loss;
- unchanged JavaScript document should not produce a new boot id at all.

## Instrumentation goal

Add a tiny persistent lifecycle ring trace that records, at minimum:

- a unique per-document boot id;
- boot timestamp;
- `performance.getEntriesByType('navigation')[0]?.type`;
- current `risu-writer-session-id` value (or a short/non-secret representation sufficient for equality comparison);
- `visibilitychange` transitions;
- `pagehide` with `event.persisted`;
- `pageshow` with `event.persisted`;
- optionally `focus`/`blur` if needed for sequencing.

The trace must be written synchronously to a bounded `localStorage` ring so it can survive document teardown/reconstruction. It must not trigger navigation or automatic reload. Server `/api/logs` mirroring may be added after startup, but should not be the source of truth for the boot marker.

## Safety / scope

- No automatic reload.
- No changes to server writer-lock semantics.
- No notification behavior changes.
- Keep trace bounded to avoid storage growth.
- Do not record secrets, auth tokens, or full database/chat contents.
- Before patching: inspect `src/main.ts` and the server `/api/logs` read/write path so the trace can be retrieved easily from Termux after reproduction.
