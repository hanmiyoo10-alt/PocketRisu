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

## Runtime serving inspection

The active server-phone runit service was inspected after the successful build.

Observed state:

- service: `$PREFIX/var/service/pocketrisu`
- status: running as PID `17599` at the inspection checkpoint
- run script changes directory to `$HOME/PocketRisu` and executes `node server/node/server.cjs`
- process cwd: `$HOME/PocketRisu`
- `server/node/server.cjs` serves `/assets` from `dist/assets` via `express.static(...)`
- the remaining static frontend is served directly from `dist` via `express.static(..., { index: false, maxAge: 0 })`
- server code also reads `dist/index.html` from the same checkout
- freshly built `dist/index.html` mtime: `2026-09-04 11:50:26 +0900`
- core health remained HTTP `200`

### Runtime interpretation

A `pocketrisu` service restart is **not required merely to expose this frontend build**: the running Node process serves the `dist` directory from disk rather than embedding the old frontend bundle in process memory.

The existing Firefox tab still holds the JavaScript bundle it loaded before the build. Therefore activation for testing requires one **user-initiated manual page refresh** (or reopening the page) so Firefox fetches the new `dist` bundle. No automatic reload is added or required.

This preserves the project policy: automatic refresh is not a recovery mechanism; the single refresh here is only a deliberate deployment/test boundary chosen by the user.

## Runtime smoke validation

After one user-controlled manual refresh to load the rebuilt frontend bundle, the user performed the basic completion-sound smoke test.

Observed result:

- completion response path worked;
- completion notification sound played normally;
- the PocketRisu UI remained usable afterward;
- no additional page refresh was required for recovery.

Classification: **BASIC_RUNTIME_SMOKE_PASS**.

This confirms the bounded `HTMLAudioElement` lifecycle patch is functional in the ordinary completion-sound path. It does not prove the more specific Android audio-route cases are fixed.

## Headset route-change failure capture

A real headset-connect test immediately reproduced the remaining failure: PocketRisu entered the reported infinite-loading state after the headset route change.

The failure was captured from the main phone at `2026-09-04 12:28:14 KST` without refreshing the page first.

Observed main-phone state while the UI was still stuck:

- `pocketrisu-ssh-tunnel`: running continuously, PID `1693`, service age about `23445s`;
- `pocketrisu-notify-tunnel`: running continuously, PID `5878`, service age about `23436s`;
- the expected SSH `-L 127.0.0.1:6001:127.0.0.1:6001` core forward was present;
- forwarded `127.0.0.1:6001/api/health` returned HTTP `200`;
- the `curl: (23) client returned ERROR on write` message came from writing the response body to `/tmp/...` on Termux, while the HTTP status itself was still successfully received as `200`; future capture commands should use `$TMPDIR` or discard the response body directly;
- the filtered `logcat` section returned no audio-route lines. This is not evidence that no Android audio event occurred; Termux may not have permission/visibility for the relevant system log buffer.

Classification: **HEADSET_ROUTE_CHANGE_FAIL / BACKEND_PATH_HEALTHY_AT_CAPTURE**.

### Interpretation

This materially narrows the failure domain. During the stuck state, the main-phone SSH transport and forwarded PocketRisu core health path remained alive, so the headset-triggered infinite-loading symptom is not explained by a core tunnel outage at that checkpoint.

The bounded completion `HTMLAudioElement` patch therefore fixes the ordinary playback lifecycle but does **not** by itself fix the headset route-change failure. The next diagnostic step is to inspect server-side request/job/log state from the same failure window before changing more client code. The key question is whether the model request completed server-side while the browser remained stuck, or whether the request itself was still active. No automatic page reload should be added as recovery.

## Server-side inspection during the same headset failure

The server phone was inspected at `2026-09-04 12:30:12 KST`, while the browser was still kept in the stuck state.

Observed state:

- `pocketrisu` service was still running as PID `17599`, with about `62800s` of continuous service age;
- direct server-phone `127.0.0.1:6001/api/health` returned HTTP `200`;
- `pocketrisu-service.log` mtime was `2026-09-04 12:03:08 +0900`, roughly 27 minutes **before** this failure capture;
- therefore the many `ERR_STREAM_PREMATURE_CLOSE`, `TermuxNotifyRelay TimeoutError`, HTTP/2 termination, and old flush-worker errors found by grepping the service log are historical entries and cannot be attributed to the 12:28 headset failure from this capture alone;
- the raw tail likewise contained no event timestamped in the 12:28–12:30 failure window;
- current server source registers the durable model-job subsystem through `server/node/model-jobs.cjs`.

The model-job implementation persists metadata in `save/model-jobs.db` and response bytes in `save/model-jobs/<jobId>.journal`. Jobs have terminal statuses `done`, `failed`, or `aborted`; the recovery list exposes active main jobs and terminal unclaimed main jobs. Because the ordinary service log is stale for this failure window, the next reliable diagnostic is a **read-only query of the model-jobs database/journals**, not another interpretation of the old log errors.

Classification: **SERVER_HEALTHY / SERVICE_LOG_NOT_TIME-CORRELATED / MODEL_JOB_STATE_PENDING**.

## Deployment status at this checkpoint

- source patch: PASS
- source backup: PASS
- `git diff --check`: PASS
- `svelte-check`: PASS (`0` errors)
- production build: PASS
- backend health after build: PASS (`HTTP 200`)
- frontend `dist` serving path: confirmed live from disk
- service restart: not required for frontend activation
- browser runtime activation: PASS after one user-controlled manual refresh
- ordinary completion-sound runtime smoke test: PASS
- headset route-change stress test: **FAIL**
- main-phone core/SSH path during stuck state: **HEALTHY**
- server-phone PocketRisu service/core health during stuck state: **HEALTHY**
- service-log entries shown during failure investigation: **not time-correlated; log mtime predates failure**
- current model-job DB/journal state: pending read-only inspection

## Interpretation

This patch removes a concrete unbounded/abandoned `HTMLAudioElement` lifecycle in the exact automatic completion-sound path and has a successful ordinary runtime smoke test. However, a real headset route change still reproduces the infinite-loading symptom while both the main SSH tunnel and PocketRisu core remain healthy. The remaining failure is therefore narrower than the original audio-element leak.

The server log output collected during the failure must not be misread as proof that the current request hit `ERR_STREAM_PREMATURE_CLOSE`: the log file had not changed since 12:03, well before the 12:28 reproduction. The next discriminating evidence is the durable model-job database/journal state for the current window. No automatic page reload should be introduced as recovery.