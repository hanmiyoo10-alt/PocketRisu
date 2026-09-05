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

## Session-lock state machine confirmed

Full inspection of `server/node/session-lock.cjs` shows that ordinary hide/foreground activity by itself does not change a session to `stale`.

The state machine is:

- `register(id)` records a boot timestamp. It adopts the lock only when there is no current active session. Re-registering the same active id keeps the lock.
- `checkWrite(id, userActive)` accepts writes from the active session and advances `active.lastWriteAt`.
- a different session is `fresh` only when its recorded boot timestamp is later than the active session's last accepted write;
- a fresh + user-active writer may take over the lock;
- a fresh automatic writer is accepted passively without taking the lock;
- `peek(id)` returns `active` for the current active id, `free` when no lock exists, `fresh` when this session booted after the active writer's last write, and otherwise `stale`.

Therefore `stale` specifically requires that the returning client's session id is not the active id and that its recorded boot is absent or not newer than the active writer's `lastWriteAt`.

This means a simple Android app switch cannot create `stale` inside `session-lock.cjs` on its own. The remaining plausible causes are now narrower:

1. the Firefox client presents a different or missing `x-session-id` after return/restoration;
2. another session actually took the writer lock and wrote after this page's recorded boot;
3. client-side session/user-activity bookkeeping causes an unexpected second session to take over.

The existence of the foreground `location.reload()` path is confirmed, but this inspection alone still does not prove that the observed reproduction took that exact branch rather than Firefox reconstructing the page for another reason.

## Writer session-id lifecycle

Inspection of `src/ts/storage/nodeStorage.ts` around lines 84-99 confirms the intended client identity behavior:

- `NodeStorage.sessionId` is initialized once per page life;
- key name is `risu-writer-session-id`;
- it first reads the id from `sessionStorage`;
- only when no stored id exists does it mint a new UUID/fallback id and write it to `sessionStorage`;
- comments explicitly state that same-tab reload and OS tab restore are supposed to retain the same writer identity, while a genuinely new tab gets a new id.

Multiple network paths in the same file attach this same `NodeStorage.sessionId` as `x-session-id`.

Therefore a normal same-tab page reload should not by design create a new writer identity.

## App-side session key clearing ruled out

A repository grep for `risu-writer-session-id`, `sessionStorage.clear()`, and `removeItem(...)` found no code that clears or removes the writer-session key.

The only `sessionStorage.removeItem(...)` hit in the relevant runtime code removes the unrelated `risu-session-handoff-reload` marker after a handoff reload. No `sessionStorage.clear()` hit was found.

Therefore PocketRisu itself does not intentionally delete `risu-writer-session-id` in the inspected source. If the returning Firefox tab presents a different writer id, the remaining causes are browser/session reconstruction behavior or a genuinely separate tab/session, not an app-side key deletion.

## 423/deactivation auto-reload path confirmed

Inspection of `src/ts/storage/nodeStorage.ts` and `src/ts/globalApi.svelte.ts` confirms a second automatic reload path tied to write rejection:

- `authFetch(...)` attaches `x-session-id` and optional `x-user-active`;
- when a response returns HTTP 423, `nodeStorage.ts` dispatches `risu-session-deactivated` on `window`;
- `globalApi.svelte.ts` listens for that event, sets `gotChannel`, shows `alertNormalWait(language.activeTabChange)`, and then calls `location.reload()` after the alert promise resolves.

The same nearby block also contains a BroadcastChannel handoff path that shows the same alert and then reloads.

So there are at least three distinct automatic reload mechanisms in this one writer-handoff area:

1. another BroadcastChannel session is observed;
2. a server write returns 423 and dispatches `risu-session-deactivated`;
3. foreground/focus returns `stale` from `/api/session/lock-status` and reloads immediately.

All three conflict with the manual-only refresh policy. However, they are safety mechanisms for stale or competing writers, so they should not simply be deleted without preserving a safe non-reloading blocked/stale state.

## Prepatch `globalApi.svelte.ts` inspection

The current server-phone working file was inspected before any change.

- SHA-256: `9c2fb3d453ea2b387f61cf91776e115ce81d0cb6c8e64112f1003614e0df066e`
- the existing local diff does **not** change the three automatic reload semantics;
- one hunk only expands the `risu-session-handoff-reload` `sessionStorage.setItem(...)` formatting;
- one hunk removes the post-handoff `notifyInfo(language.sessionHandoffReload)` toast;
- one hunk disables hide-time `/api/db/flush` by replacing the body of `flushServerDbKeepalive()` with comments.

This matters because the upcoming manual-refresh-only repair can be made on top of these existing edits without overwriting them. The current automatic `location.reload()` calls are pre-existing behavior relative to the shown local diff, not introduced by those local changes.

## Next step

Create a timestamped backup of the current `src/ts/globalApi.svelte.ts` before patching. Then apply the smallest targeted change that removes only automatic full-page reload behavior while preserving writer-lock rejection and visible conflict/stale signaling.