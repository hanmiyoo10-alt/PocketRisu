# Foreground-return writer-lock auto reload — 2026-09-05

## Reproduction

While using PocketRisu in Firefox on Android, the user switched to another app and then returned to Firefox. The PocketRisu page refreshed/reconstructed without a manual refresh.

## Source confirmation

`src/ts/globalApi.svelte.ts` contains an explicit foreground-return reload path inside `saveDb()`.

Relevant behavior:

- `window.addEventListener('focus', checkWriterLockOnReturn)`;
- `document.addEventListener('visibilitychange', ...)` calls `checkWriterLockOnReturn()` when the page becomes visible;
- `checkWriterLockOnReturn()` skips while `doingChat` is active;
- it calls `forageStorage.getWriterLockState()`;
- when the returned state is exactly `stale`, it writes `risu-session-handoff-reload` to `sessionStorage` and calls `location.reload()`.

The surrounding comments explicitly describe this as "Reload-on-return" and state that the tab should refresh when another device may have taken the writer lock and changed data.

Therefore the observed Android app-switch → Firefox-return refresh has a direct PocketRisu code path that can intentionally reload the page on foreground return. This means the reproduction must not be classified as OOM by default.

## Project policy conflict

The project policy is manual-only page refresh. This automatic `location.reload()` violates that policy.

Do not replace it with another automatic full-page reload. The repair should preserve writer-lock safety without reloading the page automatically, e.g. by marking the local session stale, surfacing a non-destructive state/notice, and requiring an explicit user action for any full-page refresh if truly necessary.

## Writer-lock implementation and stale semantics

The follow-up inspection confirmed the storage call chain:

- `src/ts/storage/autoStorage.ts` delegates `getWriterLockState()` to the active storage backend;
- `src/ts/storage/nodeStorage.ts:426` performs an authenticated GET to `/api/session/lock-status` and returns the server-provided state;
- the comment directly above that method defines `stale` as: another device wrote after this page booted, so the current in-memory database copy is outdated and must not be used for a later write without reconciliation.

Important consequence: merely switching Android apps away from Firefox and returning should not, by that definition alone, make the session `stale`.

## Server endpoint trace

`server/node/server.cjs` around lines 3735-3742 confirms that `/api/session/lock-status` itself contains no additional stale logic. After auth, it reads `x-session-id` and returns:

`sessionLock.peek(typeof id === 'string' ? id : '')`

The nearby `/api/session` boot endpoint registers the client session via `sessionLock.register(clientSessionId)`.

Therefore the actual state machine that can falsely produce `stale` is inside the `sessionLock` implementation, especially `peek(...)` and any write/revision bookkeeping it consults. The HTTP endpoint is only a thin wrapper.

## Session-lock implementation located

A server-tree grep located the exact implementation:

- `server/node/server.cjs:2173` imports `createSessionLock` from `./session-lock.cjs`;
- `server/node/server.cjs:2174` creates the single `sessionLock` instance;
- `server/node/session-lock.cjs:40` defines `createSessionLock(opts = {})`;
- `server/node/session-lock.cjs:110` exports it;
- `server/node/session-lock.test.ts` contains direct tests for the helper.

This resolves the previous ambiguity: the stale state machine is not inline in `server.cjs`; it is implemented in `server/node/session-lock.cjs` and has dedicated tests.

## Next inspection

Inspect `server/node/session-lock.cjs` in full (roughly lines 1-120) before any patch. The key questions are exactly how `register`, `peek`, and write/revision updates distinguish `fresh` from `stale`, and whether a single Firefox session can become stale after an ordinary app-switch/foreground return.
