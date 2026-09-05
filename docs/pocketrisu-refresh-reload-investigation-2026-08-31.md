# PocketRisu refresh / reload investigation — 2026-08-31

## Scope

PocketRisu에서 반복적으로 언급된 "새로고침"의 의미를 분리하고, 실제 full page reload가 필요한 문제와 foreground/network recovery 문제를 구분하기 위한 조사 노트.

현재 단계는 INSPECT_ONLY. 동작 변경 없음.

## Project policy

- Intentional automatic full-page reload is not an acceptable recovery mechanism.
- A Firefox/page refresh remains a manual-only user action.
- OOM work should reduce the reasons Android/Firefox kills and reconstructs the content process rather than deliberately reloading it.
- Audio recovery should reset/recreate only the audio layer, not the page or chat state.

## Confirmed findings

### 1. Normal runtime does not appear to periodically force a full page reload

Current `src/ts/bootstrap.ts` contains an explicit `location.reload()` in the TOS-decline branch. This is not a normal periodic/mobile recovery path.

Normal model-job recovery is initialized through `initModelJobRecovery()` instead.

### 2. Model-job recovery historically depended on a manual reload

Current `src/ts/process/request/jobRecovery.ts` explicitly documents the old failure mode:

- a tab could remain alive while network connectivity disappeared, especially screen lock or Wi-Fi/cellular transitions;
- the server-side model job kept running and journaling;
- boot-only discovery meant the completed response could remain unclaimed;
- before return triggers were added, the response could sit there until the user manually reloaded the app.

Current recovery triggers are:

- initial recovery pass at app boot;
- `document.visibilitychange` when the document becomes `visible`;
- `window.online` when connectivity returns.

`recoverModelJobs()` is re-runnable and concurrent calls collapse onto one in-flight discovery pass.

### 3. July 2026 history shows refresh/reload was part of a recovery sequence, not one single bug

Relevant `jobRecovery.ts` history:

- `e6d510e7eaf5d28cf565e314d5f672107199af41` — `feat: recover background model jobs on boot`
- `393c870000517bc5c0d4821784c60efdd88900ac` — `feat: reattach model jobs on tab return and fill partial recoveries`
- `706f170d942e4f65dd4a091b4210c4b996855f16` — `feat: resume interrupted sends when their chat is opened`
- `08a4cf5ef9005bb25b0b4a0c154c45c436789958` — `fix: write recovered messages through the state proxy`
- `5fc6d8db7339cb65a9820199e133aafb981d3298` — `fix: persist chats filled by background job recovery`

This progression matters: "reload" had at least two distinct roles.

1. It could force a discovery/recovery pass when return/network triggers were missing.
2. It exposed persistence bugs: a recovered response could appear in memory, then disappear on the next reload because the off-screen chat had not been saved.

### 4. The persistence failure was specifically fixed

Commit `5fc6d8db7339cb65a9820199e133aafb981d3298` documents a field bug where a recovered response rendered when the user returned but vanished on the next reload. The reason was that chat bodies are excluded from `database.bin` and the normal save watcher tracks only the on-screen chat. Recovery now calls `saveChatToServer()` before claiming the model job, and leaves the job unclaimed when that save fails so a later discovery can retry.

### 5. Other state also historically disappeared on refresh

Commit `518e30b51ac36d117d37c5ffcafe222a28714b97` moved provider request logs away from an in-memory `fetchLog` because those entries were lost on refresh. This is a separate meaning of "refresh loss" from model-response recovery.

### 6. TTS currently leaks/abandons AudioContext lifecycle

`src/ts/process/tts.ts` has a strong source-level candidate for both the audio-stuck symptom and some long-session memory pressure:

- `playAudio()` creates a fresh `new AudioContext()` for each decoded TTS playback.
- Only `sourceNode` is stored globally; the created `AudioContext` is not retained for later cleanup.
- The normal playback path does not call `AudioContext.close()` when the source ends.
- `stopTTS()` stops only the current `sourceNode` and cancels Web Speech. It does not disconnect/clear the source or close an AudioContext.
- The GPT-SoVITS custom-volume branch duplicates the same fresh-`AudioContext` pattern instead of routing through one lifecycle owner.

This path can be frequent: `src/ts/process/index.svelte.ts` calls `sayTTS()` after generated replies when `ttsAutoSpeech` is enabled, and `src/lib/ChatScreens/Chat.svelte` also calls it from the per-message TTS button.

This is not yet proof that every observed Firefox OOM is caused by TTS, but it is a concrete resource-lifecycle defect that should be fixed independently. The intended repair is a page-preserving audio lifecycle: one owned current context/source, cleanup on stop/end/error, and a fresh usable context for the next playback when the old one is closed/stale. No `location.reload()` is involved.

### 7. Chat rendering does unmount messages outside `loadPages`, but `loadPages` can grow and stay large

`src/lib/ChatScreens/Chats.svelte` is not simply accumulating every message forever. It computes the currently rendered message range from `loadPages`, compares hashes, explicitly `unmount()`s Svelte instances outside that range, removes their DOM elements, and clears all mounted instances on component destruction.

The pressure point is the parent `src/lib/ChatScreens/DefaultChatScreen.svelte`:

- initial render range defaults to 30 messages (`src/ts/chatLoadPages.ts`);
- scrolling upward increases `loadPages` in additional chunks (default 15);
- jumping to an old message can raise `loadPages` enough to reach that message;
- no normal downward-scroll path seen so far reduces `loadPages` again;
- chat screenshot temporarily sets `loadPages = Infinity` to render the full chat;
- the screenshot success path resets it to the initial value, but the inspected `catch` path does not perform that reset.

Therefore a long browsing session can retain a much larger rendered chat DOM than the normal initial range even though `Chats.svelte` itself has correct unmount logic. A screenshot failure is an especially clear edge case where the full-chat render range may remain active until another state reset/page reload.

A likely OOM mitigation is a **soft DOM trim**: reduce `loadPages` back toward its normal window at safe moments (for example after returning to the latest-message region and on chat changes), and guarantee screenshot restoration in `finally`. This discards only rendered component/DOM instances; it must not discard chat messages or trigger a page reload.

### 8. Completion notification sound has an unbounded fire-and-forget HTMLAudio lifecycle

The deployed server-phone source was inspected directly on 2026-08-31. `src/ts/notificationSound.ts` SHA-256 was `fd02126623671b376921c53ce3fa6c37619f8fbf1d888fcd3b620109cdd8e7c7`.

The automatic completion-sound path is separate from TTS and is a more direct candidate for the reported "sound event makes the client get stuck until reload" symptom:

- `playNotificationSound()` constructs a fresh `new Audio(...)` for every completion sound.
- The automatic playback element is kept only in a local variable; there is no module-level owner for the active completion sound.
- There is no explicit `pause()`, `src` release, `load()` reset, `ended` cleanup, or error cleanup for that automatic channel.
- A second completion sound cannot explicitly stop/release the first one because the previous element is no longer addressable from the module.
- The message-complete call site is `src/lib/ChatScreens/DefaultChatScreen.svelte` and the translation-complete call site is `src/ts/translator/translator.ts`.
- Both inspected call sites invoke `playNotificationSound(...)` without awaiting it, so the sound function is intentionally fire-and-forget and should not be used as a page-level recovery mechanism.

The preview picker is different: it already keeps one `previewAudio` reference and pauses the previous preview before starting another, although its ended/error cleanup can also be improved later.

This does not prove Android/Firefox audio focus or route changes are the sole cause of the UI-stuck symptom. It does establish a concrete lifecycle weakness in the exact automatic completion-sound path. The first repair should therefore be a **single bounded completion-sound channel with explicit stop/release on replacement/end/error**, while preserving fire-and-forget behavior and never reloading the page. After that repair, call/Discord/headset route-change A/B testing can determine whether additional interruption handling is needed.

## 2026-09-05 foreground-return reproduction

The user reported a fresh real-world reproduction: while using PocketRisu in Firefox, they switched to another Android app and then returned to Firefox, at which point the PocketRisu page had refreshed/reconstructed without an intentional manual refresh.

This is important because the trigger is specifically **background app switch → foreground return**. At this checkpoint the exact cause is not yet proven. Two classes remain separate and must be distinguished before patching:

- PocketRisu executing a page reload from a background/foreground-related code path, such as a `visibilitychange` / save/session-handoff path;
- Firefox/Android discarding and reconstructing the content process under memory pressure while PocketRisu is backgrounded.

The observation is consistent with the project's existing OOM/content-process-reconstruction concern, but it does not by itself prove OOM. It also means the remaining `location.reload()` session-handoff path in `src/ts/globalApi.svelte.ts` deserves direct inspection against foreground/background callers rather than being treated as unrelated.

Do not add any automatic page reload as recovery. The next inspection should identify every non-TOS `location.reload()` call and every `visibilitychange`/hidden-state path that can reach save/session-handoff logic, then compare that with the Firefox reconstruction hypothesis.

## Working taxonomy for the next investigation

Do not use "refresh" as one diagnosis. Separate at least:

1. **Full browser/page reload** — Firefox refresh / document boot from scratch.
2. **Foreground return** — tab remains alive and `visibilitychange` returns to visible.
3. **Network return** — `online` fires after connectivity loss.
4. **Generation/job recovery** — server-side job is rediscovered/reattached/slot-in occurs.
5. **Chat persistence verification** — reload is used to prove whether a UI-visible write was really saved.
6. **UI/reactivity/audio reset** — reload may appear to fix stale client state even when backend state is healthy; audio now has concrete lifecycle defects under investigation.
7. **OOM/content-process reconstruction** — Firefox/Android kills the page under memory pressure and reconstructs it, which feels like an unwanted automatic refresh but is not an intentional PocketRisu `location.reload()`.

## Current conclusion

There is already strong source/history evidence that some past "새로고침하면 살아남/살아남지 않음" reports were not fundamentally about page reload itself. Full reload acted as a catch-all recovery trigger and as a persistence test. PocketRisu now has explicit foreground and network-return recovery intended to remove that dependency for server-side model jobs.

For the two current high-priority refresh complaints, source inspection has produced three concrete first targets without introducing automatic reload:

1. Bound the automatic completion-notification HTMLAudio lifecycle so only one owned channel exists and it is explicitly released on replacement/end/error.
2. Fix TTS `AudioContext`/source ownership and cleanup so audio can recover independently of the page and does not accumulate abandoned audio resources.
3. Make chat rendering memory self-trimming by bounding `loadPages` again at safe points and restoring screenshot render range in `finally`.

Broader Firefox OOM investigation should continue after these concrete leaks/retention paths are fixed; none of the findings alone is yet claimed to explain every OOM event.
