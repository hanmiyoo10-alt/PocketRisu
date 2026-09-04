# Stream read inactivity timeout patch — 2026-09-04

## Context

A real headset route-change reproduction left the main-phone PocketRisu UI indefinitely generating while the main SSH tunnel, server PocketRisu service, and `/api/health` remained healthy. The live durable model-job DB contained no current job state for the incident.

Source inspection confirmed a client liveness gap:

- `fetchNativeRaw(...)` creates a request timeout via `buildTimeoutSignal(...)`;
- that timeout is cleared in `fetchNativeRaw(...)` as soon as a `Response` is returned;
- a streamed response body is then consumed later by `await reader.read()` in `src/ts/process/index.svelte.ts`;
- the body-read loop had no independent inactivity deadline;
- if the browser leaves the body stream non-terminal, the send cannot unwind into the existing stream/final generation cleanup.

The normal chat UI caller owns terminal `endGeneration(...)` cleanup, so throwing from a timed stream read is compatible with the existing lifecycle.

## Patch preconditions

Target file before modification:

- `src/ts/process/index.svelte.ts`
- expected SHA-256: `8a8e10f7d87b5dce0897dbbb083df6f0ffeeb0154c41eec64ecb058a155eaf33`
- actual SHA-256 matched exactly before patching.

The file already contained unrelated local Termux notification changes. Those existing changes were intentionally preserved.

## Backup

Backup created before modification:

- `src/ts/process/index.svelte.ts.bak-stream-read-timeout-20260904-164427`
- backup SHA-256: `8a8e10f7d87b5dce0897dbbb083df6f0ffeeb0154c41eec64ecb058a155eaf33`

The backup is a local safety copy and should not be committed.

## Applied change

A single guarded source pattern was replaced (`count == 1`). The main streaming reader now computes:

```ts
const streamReadTimeoutMs = (DBState.db.localNetworkTimeoutSec ?? 600) * 1000
```

and wraps each `reader.read()` in a per-read `Promise.race(...)` with a timeout.

Behavior:

- if the configured timeout is non-finite or `<= 0`, behavior stays as raw `reader.read()`;
- otherwise each read gets its own inactivity timer;
- receiving a chunk clears that read's timer, and the next read starts a fresh timer;
- on timeout, a `TimeoutError` is rejected and `reader.cancel()` is requested;
- the thrown error then unwinds through the existing stream `finally`, which clears streaming UI state and cancels the reader;
- the normal UI caller can then run its existing `endGeneration(...)` cleanup;
- no automatic page reload was added.

This reuses the existing `localNetworkTimeoutSec` setting, whose current/default fallback is 600 seconds, rather than inventing a second unrelated timeout configuration.

## Immediate verification

Patch command result:

- `PATCH_OK`
- new `src/ts/process/index.svelte.ts` SHA-256: `acec3551820d6dbffd51d125c16ebd654ea8706e68adbfdaf7851e7fea217fea`
- `git diff --check -- src/ts/process/index.svelte.ts` returned clean with `diff_check_rc=0`
- patched region inspection showed the new helper inserted immediately after the existing abort listener and the loop changed from `await reader.read()` to `await readStreamChunk()`.

`git diff --stat` for the file currently reports a larger total (`81 insertions, 13 deletions`) because it includes pre-existing local Termux notification changes in the same tracked file; it is not a patch-only stat.

A mistyped shell command `cho` after the diff stat only produced a shell "command not found" message and did not modify files.

## Status

Patch stage is complete only. No build and no service restart have been performed yet.

Before static validation, compare the patched file directly against the timestamped backup so the patch-only delta can be verified independently of the older local notification diff. Then run `svelte-check`, followed by a production build if the patch-only comparison is clean.

Automatic full-page reload remains forbidden as a recovery mechanism.
