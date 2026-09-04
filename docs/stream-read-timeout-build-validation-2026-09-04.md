# Stream read timeout build validation — 2026-09-04

## Scope

This document records validation of the first client-side liveness repair for the headset route-change infinite-loading incident.

The patch is intentionally narrow:

- target file: `src/ts/process/index.svelte.ts`;
- adds a bounded timeout around the main streaming `reader.read()` call;
- reuses `DBState.db.localNetworkTimeoutSec` (default 600 seconds);
- timeout cancels the reader and throws a `TimeoutError` so the existing stream `finally` and caller-owned generation cleanup can run;
- preserves partial response already received;
- does not modify TTS, `globalApi.svelte.ts`, or existing Termux notification changes;
- does not add automatic page reload.

## Patch guard and backup

Pre-patch expected/current SHA-256:

`8a8e10f7d87b5dce0897dbbb083df6f0ffeeb0154c41eec64ecb058a155eaf33`

Backup created:

`src/ts/process/index.svelte.ts.bak-stream-read-timeout-20260904-164427`

Backup SHA-256:

`8a8e10f7d87b5dce0897dbbb083df6f0ffeeb0154c41eec64ecb058a155eaf33`

Post-patch SHA-256:

`acec3551820d6dbffd51d125c16ebd654ea8706e68adbfdaf7851e7fea217fea`

`git diff --check` returned 0.

A direct backup-to-current diff confirmed that the only new patch content is the stream-read timeout helper around the existing main `reader.read()` call.

## Static validation

Command:

`pnpm exec svelte-check --tsconfig ./tsconfig.json`

Result:

- exit code: 0;
- `svelte-check found 0 errors and 4 warnings in 1 file`;
- result classification: `STATIC_CHECK_PASS`.

The four warnings are pre-existing accessibility warnings in `src/lib/ChatScreens/DefaultChatScreen.svelte` around clickable `<div>` elements. They are unrelated to the stream timeout patch.

## Production build validation

Command:

`pnpm build`

Build environment/output highlights:

- package: `pocketrisu@1.9.0`;
- build command: `vite build --sourcemap`;
- Vite: `8.0.8`;
- transformed modules: 7795;
- build duration: approximately 1m25s;
- exit code: 0;
- result classification: `BUILD_PASS`.

The build emitted non-blocking warnings already seen in prior builds, including:

- no explicit Svelte config, so default plugin configuration was used;
- Node `module.register()` deprecation warning;
- CSS `::highlight(...)` optimization/minification warnings;
- browser externalization warnings for Node built-ins used by dependencies;
- the same four `DefaultChatScreen.svelte` accessibility warnings;
- plugin timing warnings;
- large chunk warning;
- ineffective dynamic-import warnings.

No error was reported for the new stream-read timeout code.

## Worktree state after build

Target status remained:

- `M src/ts/process/index.svelte.ts`;
- `?? src/ts/process/index.svelte.ts.bak-stream-read-timeout-20260904-164427`.

The source SHA-256 remained:

`acec3551820d6dbffd51d125c16ebd654ea8706e68adbfdaf7851e7fea217fea`

No PocketRisu service restart was performed during this validation.

## Next validation step

Before any runtime test, inspect how the currently running Node service serves `dist` and confirm that the new build output is the active on-disk frontend bundle. If it serves `dist` directly, no service restart should be needed; the existing browser tab will still require one user-controlled manual refresh/reopen to load the rebuilt JavaScript.

Automatic refresh remains forbidden as a recovery mechanism.
