# Foreground-return gotChannel save block — 2026-09-05

Follow-up inspection after the manual-refresh-only patch confirmed that `gotChannel` is not merely a UI flag.

In `src/ts/globalApi.svelte.ts`, `persistTrackedChanges(...)` checks `gotChannel` before any save/broadcast work. When it is true, the function waits briefly and returns `noop` without writing.

Therefore the manual-refresh patch still preserves a fail-closed writer-conflict state:

- BroadcastChannel conflict sets `gotChannel = true` and shows the existing active-tab warning, but no longer calls `location.reload()`.
- HTTP 423 deactivation sets `gotChannel = true` and shows the warning, but no longer reloads.
- Foreground/focus `stale` sets `gotChannel = true` and shows the warning, but no longer reloads.
- Once `gotChannel` is true, subsequent tracked saves are blocked by `persistTrackedChanges()` returning `noop`.

This means removing the automatic reloads did not remove the client-side save safety barrier. The server-side 423 protection also remains unchanged.

The remaining cleanup before build validation is limited to misleading old reload-on-return comments and the legacy `risu-session-handoff-reload` cleanup block, which is no longer written by the foreground stale path.
