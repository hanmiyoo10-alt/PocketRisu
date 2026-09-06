# Foreground-return lifecycle instrumentation — 2026-09-06

## Confirmed entry points

`src/main.ts` imports `./ts/log-capture` before app mount and before `loadData()`. `loadData()` is called from exactly one runtime call site in `src/main.ts`.

`src/ts/log.ts` provides `addLog(...)`, but entries are buffered for 500 ms and flushed asynchronously to `/api/logs`. Flush failures are dropped with no retry/persistence, so this sink alone is not sufficient for the earliest boot/reconstruction evidence.

`src/ts/storage/nodeStorage.ts` stores the writer identity under `sessionStorage['risu-writer-session-id']`, reusing the same value when available and minting a new value otherwise. This is useful as a continuity signal across same-tab reload/restore behavior.

The server has authenticated `/api/logs` POST/GET/DELETE routes in `server/node/server.cjs`, confirming the existing client log sink is available as a secondary trace channel.

## Instrumentation direction

Before modifying code, inspect `src/ts/log-capture.ts` to avoid duplicating existing capture behavior. The preferred design is a tiny bounded synchronous `localStorage` lifecycle ring imported very early from `src/main.ts` (or integrated into `log-capture.ts` if appropriate), recording:

- a per-document boot id and boot timestamp;
- `performance.getEntriesByType('navigation')[0]?.type`;
- current `risu-writer-session-id` value/continuity indicator;
- `visibilitychange` state;
- `pagehide` / `pageshow` with `event.persisted`;
- optionally `focus` / `blur` only if needed.

The ring must be bounded, best-effort, and must not trigger any automatic reload or recovery behavior. `/api/logs` can be used as a secondary asynchronous copy once auth/storage initialization is available.
