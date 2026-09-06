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

## Chat hide persistence wrappers inspected

The wrapper bodies themselves are very small:

- `persistChatScrollNow()` only clears a pending scroll-save timer and calls `writeChatScrollSnapshot(chatScrollStorageKey, chatScrollContainer)`;
- `persistDraftNow()` only calls `flushChatDraft(draftChaId, draftChatId, { m: messageInput, t: messageInputTranslate })`.

So the wrappers do not clone or serialize the whole chat/database themselves. Any meaningful hide-time cost would have to be inside `writeChatScrollSnapshot(...)` or `flushChatDraft(...)`.

The same source also shows scroll restoration can raise `loadPages` based on the saved message index when entering/restoring a chat, but that is a separate render-memory concern and should not be conflated with the immediate hide callback until the persistence helpers are inspected.

## Persistence helper locations confirmed

A source grep located the two helper implementations exactly:

- `writeChatScrollSnapshot(...)` is defined in `src/lib/ChatScreens/DefaultChatScreen.svelte` around line 141;
- `flushChatDraft(...)` is defined/exported in `src/ts/storage/chatDraft.ts` around line 121.

No modification was made from this result alone. The next step is to inspect only those helper bodies to decide whether the hide-time work is small enough to rule out as the likely reconstruction trigger.

## Helper cost inspection

The helper bodies show two different cost profiles:

- `flushChatDraft(...)` only cancels the pending debounce and enqueues `persistSave(...)`; there is no full chat/DB serialization in this wrapper.
- `writeChatScrollSnapshot(...)` is more interesting: it gathers loaded message elements, reads the chat container layout, then scans message elements using `getBoundingClientRect()` to find the visible item and reads its rectangle again before saving a small snapshot.

So draft persistence looks lightweight, while scroll persistence can force synchronous DOM/layout work exactly during `visibilitychange -> hidden` / `pagehide`. Its cost grows with the number of currently rendered/loaded message elements, so it is a plausible pressure amplifier when `loadPages` has grown large. This is still not proof that it causes Firefox reconstruction.

## Scroll snapshot full-scan confirmed

`getLoadedMessages(container)` calls `querySelectorAll('[data-chat-index]')`, converts all matching nodes to an array, parses every index, and sorts the entire list. `writeChatScrollSnapshot(...)` then checks the loaded nodes with `getBoundingClientRect()` until it finds the visible message, reads that element's rect once more, and writes only a tiny `{ messageIndex, offsetTop }` JSON object to `localStorage`.

Therefore the storage payload is tiny; the potentially expensive part is the synchronous DOM/layout scan, not serialization or storage size.

## Existing-local-diff status

Before any optimization, the working file was checked:

- current SHA-256: `ff65d5fb0d3ba97110d1543fd2a2e5950181a8833490af24af4f297c7eb86aab`;
- the `git diff` shows `writeChatScrollSnapshot`, `persistChatScrollNow`, scroll restoration/loadPages logic, and the `visibilitychange`/`pagehide` persistence hooks are already part of the existing local diff relative to repository HEAD;
- they are not clean upstream code in the current checkout.

This is important because a new fix must preserve the rest of that local scroll/draft functionality rather than reverting the whole hunk. Do not overwrite the file blindly.

## Local diff identifies the exact regression candidate

The expanded local diff shows that the original hide/unload hook only persisted the draft:

- `visibilitychange -> hidden` called `persistDraftNow()`;
- `pagehide` called `persistDraftNow()`.

The local scroll-restoration modification changed both handlers to additionally call `persistChatScrollNow()`. That helper immediately invokes the full DOM/layout snapshot scan described above.

So the expensive hide-time scroll scan is not merely adjacent to existing upstream behavior; it was introduced by the same local modification that added scroll restoration. This substantially strengthens it as a regression candidate for app-switch pressure. The rest of the scroll-restoration feature can be preserved because ordinary scroll activity already uses `scheduleChatScrollSave(...)` with a 120 ms debounce.

## Reference-count confirmation

A direct grep of `persistChatScrollNow` in the working file returned exactly three references:

- line 181: the helper definition;
- line 369: the `visibilitychange -> hidden` call;
- line 374: the `pagehide` call.

There are no other callers. This means the immediate hide-time full-DOM/layout scan can be removed surgically by deleting the two hide/pagehide calls and then removing the now-unused helper, while leaving draft persistence and normal debounced scroll snapshots intact.

## Backup verification before patch

A timestamped backup was created before any edit:

- backup: `src/lib/ChatScreens/DefaultChatScreen.svelte.bak-hide-scroll-scan-20260906-020004`;
- working-file SHA-256 before patch: `ff65d5fb0d3ba97110d1543fd2a2e5950181a8833490af24af4f297c7eb86aab`;
- backup SHA-256: `ff65d5fb0d3ba97110d1543fd2a2e5950181a8833490af24af4f297c7eb86aab`.

The hashes match exactly, so rollback is available and the modification step can proceed safely.

## Hide-time scroll-scan patch applied

The narrow patch was applied successfully to `src/lib/ChatScreens/DefaultChatScreen.svelte`.

Patch result:

- script reported `PATCH_OK`;
- post-patch SHA-256 is `f69eb15803e7902751d836ce07ae70d3b03dcef7a108831e54b80fbd91411508`;
- `persistChatScrollNow` now has zero references in the file;
- `git diff --check -- src/lib/ChatScreens/DefaultChatScreen.svelte` produced no output, so whitespace/error sanity passed.

The patch removed only:

- the `persistChatScrollNow()` helper;
- its `visibilitychange -> hidden` call;
- its `pagehide` call.

It preserved:

- `persistDraftNow()` on hide/pagehide;
- `scheduleChatScrollSave(...)` and its normal 120 ms debounced scroll snapshot path;
- `writeChatScrollSnapshot(...)` itself for ordinary scroll activity;
- scroll restoration logic;
- manual-refresh-only policy.

This means app backgrounding no longer deliberately starts a full rendered-message DOM/layout scan from the chat-screen hide hooks.

## Static validation after patch

`pnpm check` completed successfully after the patch:

- 0 errors;
- 4 warnings;
- all 4 warnings are the same existing accessibility warnings in `DefaultChatScreen.svelte` for clickable `<div>` elements lacking keyboard/ARIA semantics.

No new type or Svelte diagnostics were introduced by the hide-time scroll-scan patch.

## Production build validation after patch

`pnpm build` completed successfully after the patch:

- Vite 8.0.8;
- 7795 modules transformed;
- the same existing CSS `::highlight(...)`, browser-externalization, plugin timing, chunk-size, ineffective dynamic-import, and accessibility warnings appeared;
- no fatal build error occurred;
- final result: `✓ built in 1m 28s`.

The patched production assets are therefore present in `dist`. The next runtime step is exactly one manual Firefox reload/reopen on the main phone to load the new build, followed by repeated app-switch return testing. Do not add automatic reload as recovery.

## Post-patch long-background reproduction

After the rebuilt hide-time scroll-scan patch was loaded manually in Firefox, the user left PocketRisu in the background for a longer interval in another Android app and then returned. The same visible refresh/reconstruction happened again.

This runtime result materially weakens the hide-time scroll DOM/layout scan as the root cause of the foreground-return reconstruction. The optimization is still reasonable because it removes unnecessary synchronous work during backgrounding, but it did not eliminate the observed symptom.

At this point, further blind patching of hide handlers is not justified. The next step is non-invasive lifecycle instrumentation that can distinguish a resumed existing JavaScript document from a brand-new document/content-process reconstruction. The trace should capture boot identity/time, `visibilitychange`, `pagehide`/`pageshow` and `event.persisted`, navigation entry type, and continuity of the existing `risu-writer-session-id`, without adding any automatic reload.
