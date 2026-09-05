# Foreground-return reload still reproduces after writer-lock patch — 2026-09-06

## Runtime reproduction

After the manual-refresh-only writer-lock patch was applied, cleaned, `pnpm check` passed with 0 errors, and `pnpm build` completed successfully, the user manually loaded the rebuilt app in Firefox and reproduced the same symptom again: switching to another Android app and then returning to PocketRisu caused the page to refresh/reconstruct.

## Meaning

This materially weakens the earlier hypothesis that the writer-lock `location.reload()` path was the only cause of the observed foreground-return refresh.

The patched `globalApi.svelte.ts` no longer auto-reloads for BroadcastChannel conflict, HTTP 423 deactivation, or foreground `stale` writer-lock state. Those paths now warn and set `gotChannel`, while `persistTrackedChanges()` continues to block further saves from the conflicted page.

Because the symptom still reproduces after a successful production build and manual browser reload, the next investigation must distinguish between:

- another remaining PocketRisu reload/navigation path that is actually reachable during foreground return;
- Firefox/Android content-process discard / OOM reconstruction;
- stale browser assets unexpectedly serving an older bundle.

Do not reintroduce automatic reload as a recovery mechanism. Continue manual-refresh-only policy.

## Built bundle verification

A direct grep of the rebuilt `dist` showed:

- `risu-session-handoff-reload` is absent from `dist`, confirming the writer-handoff cleanup is present in the production build;
- remaining `location.reload` occurrences still exist in the built bundle, so other app-side reload paths must be inspected before classifying the symptom as Firefox/Android reconstruction.

The source grep for remaining non-backup `location.reload()` calls found only:

- `src/ts/drive/backuplocal.ts` at lines 324 and 361;
- `src/ts/bootstrap.ts` at line 246;
- `src/lib/Others/UpdatePopup.svelte` at line 34;
- `src/lib/Setting/Pages/SystemBackup.svelte` at line 155;
- `src/lib/Setting/ServerBackupList.svelte` at line 64;
- `src/lib/_dev/DevPanel.svelte` at line 54.

This means the removed `globalApi.svelte.ts` writer-lock reloads are no longer in the remaining source list. Most remaining calls are tied to explicit backup/update/dev UI actions.

## `bootstrap.ts:246` ruled out for ordinary foreground return

Inspection of `src/ts/bootstrap.ts` around lines 243-248 shows the remaining startup-path `location.reload()` is only inside the Terms-of-Service flow:

- it runs only when `import.meta.env.VITE_RISU_TOS === 'TRUE'`;
- `alertTOS()` resolves to `a`;
- `location.reload()` executes only when `a === false`.

So this reload is tied to an explicit negative result from the TOS prompt and is not a generic `focus`, `visibilitychange`, `pageshow`, app-return, or network-return handler.

Therefore the known direct `location.reload()` calls no longer provide an obvious foreground-return explanation for the reproduced symptom.

## Alternate navigation primitive search

A search for `location.assign`, `location.replace`, `location.href` writes, `window.location`, `document.location`, `history.go(0)`, `pageshow`, `pagehide`, and `visibilitychange` found no additional direct reload/navigation primitive tied to foreground return.

The notable lifecycle hits are handlers rather than navigations:

- `src/ts/process/request/jobRecovery.ts` has a `visibilitychange` listener for job recovery;
- `src/ts/globalApi.svelte.ts` has the already-patched writer-lock `visibilitychange` listener and another hide/pagehide save/flush-related listener around lines 513-516;
- `src/lib/ChatScreens/DefaultChatScreen.svelte` has `visibilitychange` and `pagehide` handlers around lines 376-380;
- remaining `location.href` references in `characterCards.ts` only parse the current URL, and the `window.location.origin` use in `Chat.svelte` only builds a URL.

So there is currently no source evidence of another explicit foreground-return navigation/reload call.

## Hide-time save path: forced full DB hypothesis weakened

Inspection of `triggerSave()` around lines 1057-1099 shows that the hide callback does not automatically force a full DB write:

- `triggerSave()` first calls `takeTrackedChanges()`;
- if there are no tracked changes and `forceFullWrite` is not set, it returns immediately;
- the hide path calls `triggerSave({ skipBroadcast: true })` without `forceFullWrite`;
- `saveInFlight` also prevents duplicate concurrent saves.

Therefore `flushImmediate()` setting `changed = true` on hide does not by itself prove that every app switch serializes/writes the full DB. The earlier heavy-save hypothesis is weaker than it first appeared.

## Chat-screen hide handlers confirmed

Inspection of `src/lib/ChatScreens/DefaultChatScreen.svelte` around lines 363-382 shows a second app-hide/pagehide persistence path:

- on `visibilitychange -> hidden`, it calls `persistDraftNow()` and `persistChatScrollNow()`;
- on `pagehide`, it calls the same two functions again;
- listeners are installed inside a Svelte effect and removed in its cleanup;
- comments explicitly say this exists for refresh/app switch/hard teardown persistence.

This means an Android app switch can trigger both the global save path and the chat-screen draft/scroll persistence path, potentially twice if `visibilitychange` and `pagehide` both occur. That still does not prove OOM or reconstruction, but these exact hide-time functions are now the next app-side candidates to inspect for synchronous work, large serialization, storage writes, or duplicate persistence.

## Next pivot

Inspect the definitions of `persistDraftNow()` and `persistChatScrollNow()` before changing anything. If they are tiny writes, app-side hide work becomes much less plausible as the direct cause and the investigation should move to Firefox/Android content-process reconstruction evidence. If either performs large cloning/serialization/network/database work, patch only that hide-time behavior while preserving normal draft/scroll persistence and manual-only refresh.