# Foreground-return reload codepath capture — 2026-09-05

## Reproduction

The user reproduced an unwanted PocketRisu page refresh/reconstruction in Firefox by switching to another Android app and then returning to Firefox. This was not a manual refresh.

## Source grep capture

A server-phone INSPECT_ONLY grep for `location.reload`, `visibilitychange`, `document.hidden`, and `visibilityState` returned multiple relevant paths.

Notable results:

- `src/ts/process/request/jobRecovery.ts:789-790` registers `visibilitychange` and calls `recoverModelJobs()` when the document becomes visible. This path itself does not show a reload in the grep output.
- `src/ts/globalApi.svelte.ts:382`, `:397`, and `:424` contain `location.reload()` calls.
- `src/ts/globalApi.svelte.ts:428-429` registers `visibilitychange` and calls `checkWriterLockOnReturn()` when the document becomes visible.
- Therefore `globalApi.svelte.ts` is now the highest-priority self-reload candidate for the exact background→foreground trigger.
- Other `location.reload()` hits exist in explicit backup/update/dev flows and are lower-priority for this reproduction unless their surrounding code shows they can be reached automatically.

## Current interpretation

This capture materially weakens the earlier assumption that foreground-return refresh is necessarily Firefox OOM/content-process reconstruction. There is a concrete PocketRisu foreground-return function (`checkWriterLockOnReturn()`) in the same file that contains several reload calls, so an intentional self-reload path must be ruled out first.

OOM/content-process reconstruction remains a separate possibility until the exact `globalApi.svelte.ts` control flow is inspected.

## Next diagnostic

Inspect only `src/ts/globalApi.svelte.ts` around the reload calls and `checkWriterLockOnReturn()` to determine whether returning to the visible state can directly or indirectly execute `location.reload()`.

Do not modify files yet. Do not add any automatic reload recovery. Firefox refresh remains manual-only by project policy.
