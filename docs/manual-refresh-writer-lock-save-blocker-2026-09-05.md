# Manual-refresh writer-lock save blocker — 2026-09-05

## Confirmed behavior

After removing automatic page reloads from the writer-handoff paths in `src/ts/globalApi.svelte.ts`, the existing `gotChannel` flag still preserves data-safety behavior.

`persistTrackedChanges(...)` checks `gotChannel` before broadcasting or writing. When `gotChannel` is true, it waits briefly and returns `noop`, so the stale/conflicted page stops persisting further changes.

This means the manual-refresh-only patch can safely keep the existing conflict alert and set `gotChannel = true` without automatically reloading the page, while still preventing the stale page from overwriting newer database state.

## Remaining cleanup

The writer-handoff block still contains comments that describe the old reload-on-return design, and a legacy `risu-session-handoff-reload` cleanup block remains even though the patched stale path no longer writes that marker.

Those comments and the legacy marker cleanup can be removed/updated as non-behavioral cleanup. The `gotChannel` save-blocking check must be preserved.
