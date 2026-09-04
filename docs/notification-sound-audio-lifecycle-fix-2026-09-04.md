# Completion notification sound lifecycle fix — 2026-09-04

## Goal

Fix the PocketRisu completion-notification sound path without using any automatic page reload. Firefox/page refresh remains a manual-only user action.

The reported symptom under investigation is that completion sound playback can interact badly with Android/Firefox audio state (including call/Discord/headset route changes), after which a manual page refresh may appear to recover the UI. The fix intentionally targets only the audio element lifecycle.

## Pre-fix inspection

Deployed server-phone source:

- repository checkout: `$HOME/PocketRisu`
- source file: `src/ts/notificationSound.ts`
- pre-fix SHA-256: `fd02126623671b376921c53ce3fa6c37619f8fbf1d888fcd3b620109cdd8e7c7`

The automatic completion path previously did this for every sound:

1. resolve the sound URL;
2. create a fresh `new Audio(...)`;
3. set volume;
4. call `audio.play()`;
5. drop the element reference.

There was no module-level owner for the active automatic notification audio element and no explicit cleanup on replacement, playback end, or playback error.

Call sites confirmed during inspection:

- message completion: `src/lib/ChatScreens/DefaultChatScreen.svelte`
- translation completion: `src/ts/translator/translator.ts`

Both call sites use the function as fire-and-forget, so the repair preserves that behavior.

## Applied patch

A backup was created before modification:

- `src/ts/notificationSound.ts.bak-notification-audio-lifecycle-20260904-113917`
- backup SHA-256: `fd02126623671b376921c53ce3fa6c37619f8fbf1d888fcd3b620109cdd8e7c7`

The patched automatic-completion channel now:

- stores one module-level `notificationAudio` element;
- uses a monotonically increasing `notificationPlayId` so an older URL-resolution result cannot start after a newer request supersedes it;
- releases the previous automatic completion sound before starting the next one;
- clears `onended`/`onerror` handlers during cleanup;
- calls `pause()`;
- removes the `src` attribute;
- calls `load()` to reset/release the element resource;
- cleans up on playback end, playback error, or rejected `play()`;
- does not call `location.reload()` or otherwise reset page/chat state.

Post-patch SHA-256:

- `f01896934f170e3d65a0a20f1dcc9a4e616ae08e1838058568b1430b0c13fe70`

`git diff --check -- src/ts/notificationSound.ts` completed with no errors.

The sound-picker preview path remains separate and was not changed in this patch. It already owns one `previewAudio` reference and pauses the previous preview before starting another.

## Static validation

Command:

`pnpm exec svelte-check --tsconfig ./tsconfig.json`

Result:

- exit code: `0`
- errors: `0`
- warnings: `4`

All four warnings were existing accessibility warnings in `src/lib/ChatScreens/DefaultChatScreen.svelte` for clickable `div` elements. No warning or error was attributed to `src/ts/notificationSound.ts`.

## Production build validation

Command:

`pnpm build`

Observed build environment/output:

- package: `pocketrisu@1.9.0`
- Vite reported: `vite v8.0.8`
- modules transformed: `7795`
- result: `✓ built in 1m 26s`
- exit code: `0`
- classification: `BUILD_PASS`

The build emitted pre-existing/non-blocking warnings including Svelte accessibility warnings, CSS `::highlight(...)` parser/minifier warnings, browser-externalized Node modules from dependencies, plugin timing warnings, large chunk warnings, and ineffective dynamic import warnings. None caused build failure.

## Deployment status at this checkpoint

The source patch and production build are validated on the server phone, but the `pocketrisu` service had **not yet been restarted** at this checkpoint. Runtime activation and behavior testing must therefore be treated as pending.

Before restarting, inspect the active `pocketrisu` runit service/run script and process command line to confirm exactly how it serves the built `dist` output. After activation, verify health first and then test completion-sound behavior without page reload.

## Interpretation

This patch removes a concrete unbounded/abandoned `HTMLAudioElement` lifecycle in the exact automatic completion-sound path. It is a strong first repair for the sound-related manual-refresh complaint, but it does not yet prove that Android/Firefox audio-focus or route-transition issues are fully fixed. Runtime A/B testing around call/Discord/headset transitions is still required.
