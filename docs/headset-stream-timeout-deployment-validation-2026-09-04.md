# Headset stream-timeout deployment validation — 2026-09-04

## Context

A one-file client patch was applied to `src/ts/process/index.svelte.ts` to add a per-read inactivity timeout around the main streaming `reader.read()` call. The patch reuses `DBState.db.localNetworkTimeoutSec` (default 600 seconds), cancels the reader on timeout, throws a `TimeoutError`, and relies on existing stream/caller cleanup. No automatic page reload was added.

## Patch validation

Guarded patch checks completed successfully:

- pre-patch SHA-256: `8a8e10f7d87b5dce0897dbbb083df6f0ffeeb0154c41eec64ecb058a155eaf33`;
- backup: `src/ts/process/index.svelte.ts.bak-stream-read-timeout-20260904-164427`;
- backup SHA-256 matches pre-patch SHA;
- patched SHA-256: `acec3551820d6dbffd51d125c16ebd654ea8706e68adbfdaf7851e7fea217fea`;
- `git diff --check` returned 0;
- backup-to-current diff showed only the intended stream-read timeout block and replacement of the single `reader.read()` call with `readStreamChunk()`.

## Static validation

`pnpm exec svelte-check --tsconfig ./tsconfig.json` completed with:

- 0 errors;
- 4 warnings;
- exit code 0.

All four warnings are the pre-existing `DefaultChatScreen.svelte` clickable-`div` accessibility warnings and are unrelated to the stream-timeout patch.

## Production build

`pnpm build` completed successfully:

- package: `pocketrisu@1.9.0`;
- Vite: `8.0.8`;
- 7795 modules transformed;
- build time: about 1m25s;
- exit code 0;
- result: `BUILD_PASS`.

Build warnings were non-blocking and unrelated to the stream timeout: Svelte config defaulting, Node deprecation/browser externalization warnings, `::highlight(...)` CSS warnings, existing accessibility warnings, plugin timing warnings, large chunks, and ineffective dynamic-import notices.

## Runtime serving inspection

After the build, the running server was inspected without restart.

Observed:

- `pocketrisu` runit service remained up as PID `17599`;
- process cwd: `/data/data/com.termux/files/home/PocketRisu`;
- `dist/index.html` mtime: `2026-09-04 16:59:19 +0900`;
- patched source mtime: `2026-09-04 16:44:27 +0900`;
- current `dist/index.html` references `assets/index-Djohw_sH.js` and the new asset set;
- `server/node/server.cjs` serves `dist/assets` and `dist` directly from `process.cwd()` and reads `dist/index.html` from disk;
- direct `127.0.0.1:6001/api/health` returned HTTP 200.

Therefore the new frontend build is already available from the live Node service without restarting `pocketrisu`. The existing browser tab still needs one explicit user-controlled manual refresh/reopen to load the newly built JavaScript. Automatic refresh remains forbidden.

## Next runtime validation

After one manual refresh/reopen by the user, validate ordinary generation first, then reproduce the headset route transition. The important outcome is whether the UI remains responsive or, if the response body becomes non-terminal, the new bounded read timeout eventually unwinds the generation instead of leaving infinite loading.

Do not restart the server merely to expose this frontend build, and do not add automatic reload recovery.
