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

## Writer-lock implementation location

The follow-up source grep succeeded and located the implementation chain:

- `src/ts/storage/autoStorage.ts` delegates `getWriterLockState()` to the active storage backend;
- `src/ts/storage/nodeStorage.ts:426` contains the concrete Node/server-backed implementation returning one of `free | active | fresh | stale | unknown`;
- `src/ts/globalApi.svelte.ts:419` consumes that state during foreground return.

This is enough to confirm that the next inspection target is the `nodeStorage.ts` implementation around line 426. No patch should be made until the exact conditions producing `stale` are read.

## Next inspection

Inspect `src/ts/storage/nodeStorage.ts` around `getWriterLockState()` to determine exactly when the state becomes `stale` and whether ordinary app background/foreground transitions can trigger it without a true second-device write.
