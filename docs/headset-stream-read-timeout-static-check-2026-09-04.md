# Headset stream-read timeout static validation — 2026-09-04

## Context

A guarded one-file patch was applied locally to `src/ts/process/index.svelte.ts` to add a bounded inactivity timeout around the main streaming `reader.read()` call. The patch reuses `DBState.db.localNetworkTimeoutSec` (default 600 seconds), cancels the reader on timeout, throws a `TimeoutError`, and relies on the existing stream `finally` plus caller-owned generation cleanup to unwind. No automatic page reload was added.

## Patch-only verification

Before patching, the target SHA-256 was:

- `8a8e10f7d87b5dce0897dbbb083df6f0ffeeb0154c41eec64ecb058a155eaf33`

Backup created:

- `src/ts/process/index.svelte.ts.bak-stream-read-timeout-20260904-164427`
- backup SHA-256: `8a8e10f7d87b5dce0897dbbb083df6f0ffeeb0154c41eec64ecb058a155eaf33`

After patching, the target SHA-256 became:

- `acec3551820d6dbffd51d125c16ebd654ea8706e68adbfdaf7851e7fea217fea`

`git diff --check -- src/ts/process/index.svelte.ts` returned success (`rc=0`). A direct backup-to-current diff showed only one contiguous change around the main streaming reader loop: the per-read timeout helper plus replacement of `await reader.read()` with `await readStreamChunk()`. Existing unrelated Termux notification changes in the same file were preserved.

## Static validation

Command:

```sh
pnpm exec svelte-check --tsconfig ./tsconfig.json
```

Result:

- `svelte-check found 0 errors and 4 warnings in 1 file`
- shell return code: `0`
- classification: `STATIC_CHECK_PASS`

All four warnings were existing accessibility warnings in `src/lib/ChatScreens/DefaultChatScreen.svelte` around lines 1288 and 1302 (`a11y_click_events_have_key_events` and `a11y_no_static_element_interactions`). No warning or error referenced the patched `src/ts/process/index.svelte.ts` stream-read timeout code.

## Current state

- patch applied locally;
- backup exists;
- patch-only diff verified;
- static type/Svelte validation passed;
- production build has not yet been run;
- PocketRisu service has not been restarted;
- no automatic browser refresh/reload has been introduced.

## Next step

Run the production build (`pnpm build`). Only after a successful build should the already-running Node service/static `dist` serving behavior be rechecked and runtime validation performed with a user-controlled manual refresh if needed.
