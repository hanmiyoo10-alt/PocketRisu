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

## Hide-time forced save path confirmed

Inspection of `src/ts/globalApi.svelte.ts` around lines 501-516 shows that backgrounding the page deliberately forces the save path:

- `flushImmediate()` clears any pending save timeout;
- it unconditionally sets `changed = true`;
- it immediately calls `triggerSave({ skipBroadcast: true })` without awaiting it;
- it then calls `flushServerDbKeepalive()`;
- `visibilitychange -> hidden` calls `flushImmediate()`;
- `pagehide` also calls the same function.

The current local version of `flushServerDbKeepalive()` has already been reduced to a no-op, so the remaining hide-time work of interest is the forced `triggerSave()` call itself.

Because `changed` is set to true even if there was no actual user change, every app switch/background transition can force the persistence path. That is a concrete source-level candidate for CPU/memory/serialization pressure at exactly the moment Firefox is being backgrounded, though it is not yet proof that this causes the browser reconstruction.

Do not patch this blindly yet. Inspect `triggerSave()` and the persistence path first to determine whether it performs a full DB serialization/write or can otherwise allocate heavily on each hide.

## Next pivot

Inspect the implementation and immediate callees of `triggerSave()` in `globalApi.svelte.ts`, especially whether the hide-forced path serializes/writes the full DB or large tracked structures. If it is heavy, patching the hide behavior should preserve ordinary debounced saving and must not introduce any automatic reload.
