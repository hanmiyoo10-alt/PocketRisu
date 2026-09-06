# Foreground lifecycle trace inspection — 2026-09-06

## Why this inspection exists

The visible foreground-return refresh/reconstruction still reproduces after removing PocketRisu writer-lock auto-reload paths and after removing the hide/pagehide immediate chat-scroll DOM scan. Blind patching is no longer justified. The next task is to distinguish same-document resume from a brand-new Firefox document/content-process reconstruction.

## Entry point

`src/main.ts` imports `./ts/log-capture` at line 3, before mounting the app and before calling `loadData()`. `loadData()` is called once from `src/main.ts` after mount. This makes the very-early client logging layer an appropriate place for lifecycle instrumentation.

## Existing log capture

`src/ts/log-capture.ts` currently:

- imports `addLog()` from `src/ts/log.ts`;
- monkey-patches `console.error` and `console.warn` only;
- captures `window.error` and `unhandledrejection`;
- intentionally does not capture `console.log`;
- has no existing lifecycle (`visibilitychange`, `pagehide`, `pageshow`) instrumentation.

`src/ts/log.ts` buffers log entries in memory, flushes after 500 ms to `POST /api/logs`, caps the buffer at 1000 entries, and drops a batch on network/auth failure without retry/persistence. Therefore `/api/logs` is useful as a secondary sink but is not sufficient as the only source of evidence around document death/reconstruction.

## Server log route

The Node server has explicit `/api/logs` POST/GET/DELETE routes in `server/node/server.cjs`, with storage support in `server/node/logs.cjs`. No server-side route change is required just to collect normal client logs.

## Writer-session continuity marker

`src/ts/storage/nodeStorage.ts` stores the single-writer identity under `sessionStorage['risu-writer-session-id']`. It reuses the stored ID when present and mints a new ID only when absent/unavailable. This makes the value useful as one reconstruction signal, but it must be interpreted with browser sessionStorage restore semantics rather than treated as proof by itself.

## Instrumentation design direction

Use a synchronous, bounded `localStorage` lifecycle ring as the primary trace so evidence survives a new document boot. Record at minimum:

- per-document boot ID and timestamp;
- navigation entry type (`performance.getEntriesByType('navigation')`);
- current `risu-writer-session-id` if readable;
- `visibilitychange` state;
- `pagehide` and `pageshow`, including `event.persisted`;
- optional focus/blur only as secondary context.

The ring must be bounded and best-effort so it cannot become a memory/storage leak or crash privacy/storage-disabled environments. `/api/logs` can mirror key events after startup but should not be the only sink because its current 500 ms buffered flush may lose the final event if the document is killed.

## Safety / behavior constraints

The instrumentation is observability-only. It must not add `location.reload()`, automatic navigation, automatic refresh, Android notifications, or any new server-phone notification behavior.

## Next step

Before editing, inspect current hashes and local diffs for `src/main.ts` and `src/ts/log-capture.ts`. Then back up the exact target file and add the smallest lifecycle-ring implementation in the earliest existing client logging path.