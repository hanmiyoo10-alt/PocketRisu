# Stream read timeout patch verification — 2026-09-04 16:44 KST

## Scope

One-file guarded patch on the server phone:

- target: `src/ts/process/index.svelte.ts`
- purpose: bound the main streaming `reader.read()` wait using the existing `DBState.db.localNetworkTimeoutSec` value, so a non-terminal browser stream can unwind instead of leaving the UI generating forever.
- no automatic page reload was added.
- no service restart or build was performed in this stage.

## Guard and backup

Expected pre-patch SHA-256:

`8a8e10f7d87b5dce0897dbbb083df6f0ffeeb0154c41eec64ecb058a155eaf33`

Observed current SHA-256 before patch matched exactly.

Backup created:

`src/ts/process/index.svelte.ts.bak-stream-read-timeout-20260904-164427`

Backup SHA-256:

`8a8e10f7d87b5dce0897dbbb083df6f0ffeeb0154c41eec64ecb058a155eaf33`

## Patch result

Patch application returned `PATCH_OK`.

Post-patch SHA-256:

`acec3551820d6dbffd51d125c16ebd654ea8706e68adbfdaf7851e7fea217fea`

`git diff --check -- src/ts/process/index.svelte.ts` returned success (`diff_check_rc=0`).

The inserted logic:

- computes `streamReadTimeoutMs = (DBState.db.localNetworkTimeoutSec ?? 600) * 1000`;
- wraps each main response-body `reader.read()` in `Promise.race(...)` against a timeout;
- rejects with a `TimeoutError` on inactivity;
- calls `reader.cancel()` best-effort on timeout;
- clears the per-read timer in `finally`;
- preserves the existing external abort listener and existing stream `finally` cleanup.

## Patch-only diff verification

A direct `diff -u` between the backup and current file showed exactly one localized hunk around the main streaming reader loop near lines 1608–1644.

Only these semantic changes were present:

1. add `streamReadTimeoutMs`;
2. add `readStreamChunk()` helper;
3. replace `readed = await reader.read()` with `readed = await readStreamChunk()`.

No unrelated region changed relative to the backup.

The larger `git diff --stat` for the file includes earlier unrelated local Termux notification modifications and therefore is not the patch-only size.

## Status

`PATCH_ONLY_VERIFY_PASS`

Next step: run static validation (`pnpm exec svelte-check --tsconfig ./tsconfig.json`) before production build. Do not restart `pocketrisu`; the frontend build will later be served from `dist` and activation should remain user-controlled/manual refresh only.
