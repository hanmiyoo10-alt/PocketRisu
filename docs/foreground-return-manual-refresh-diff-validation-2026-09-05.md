# Foreground-return manual-refresh diff validation — 2026-09-05

## Result

Final cleaned `src/ts/globalApi.svelte.ts` diff was inspected after the manual-refresh patch and comment/dead-marker cleanup.

- `git diff --check` produced no output: whitespace/static diff sanity PASS.
- BroadcastChannel conflict no longer calls `location.reload()`; it sets `gotChannel` and shows `alertNormalWait(language.activeTabChange)` only.
- HTTP 423 `risu-session-deactivated` no longer calls `location.reload()`; it keeps the same conflict flag + alert behavior.
- Foreground/focus stale handling no longer writes `risu-session-handoff-reload` and no longer reloads. It sets `gotChannel = true` and shows the conflict alert.
- `checkWriterLockOnReturn()` stops once `gotChannel` is set, preventing repeated stale checks/alerts after the page is already marked conflicted.
- The old reload-era comments and the legacy `risu-session-handoff-reload` cleanup block were removed.
- The save-safety guard remains intact: `persistTrackedChanges()` returns `noop` when `gotChannel` is true, so a stale/conflicted page is still blocked from further persistence.
- A separate pre-existing local change that suppresses hide-time `/api/db/flush` remains present and was not altered by this diff validation.

Current cleaned `globalApi.svelte.ts` SHA-256 reported locally: `8f91216bc98c437ad596d570527385136306c9a2e96f49f143ae945e5322ccdd`.

## Next step

Run the production build. If it passes, load the new bundle with one user-initiated manual refresh/reopen and reproduce the Android app-switch → Firefox-return flow. No automatic full-page refresh is to be added as recovery.