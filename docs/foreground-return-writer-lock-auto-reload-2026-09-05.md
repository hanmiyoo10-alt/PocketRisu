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

Important consequence: merely switching Android apps away from Firefox and returning should not, by that definition alone, make the session `stale`. If the page nevertheless reloads on return, the next question is why the server endpoint reported `stale` — for example whether a session identity changed, another writer was observed, or the server-side generation/revision comparison is over-broad.

No client patch should be made until `/api/session/lock-status` server semantics are inspected.

## Next inspection

Inspect the server implementation of `/api/session/lock-status`, including the conditions that return `stale` and the session/revision identifiers it compares. The goal is to determine whether ordinary background/foreground use can produce a false stale result on a single active main-phone browser session.
