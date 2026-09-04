# Headset route-change model-job capture — 2026-09-04

## Incident

A real headset connect/disconnect test reproduced PocketRisu infinite loading on the main phone while the browser page was intentionally kept unrefreshed for diagnosis.

## Main-phone state during failure

At approximately 2026-09-04 12:28 KST:

- core SSH tunnel remained running and retained its existing PID;
- notify SSH tunnel remained running and retained its existing PID;
- the expected local forward to `127.0.0.1:6001` existed;
- forwarded `/api/health` returned HTTP 200.

This rules out a core SSH tunnel outage at the capture checkpoint.

## Server-phone state during failure

At approximately 12:30 KST:

- the `pocketrisu` runit service remained running;
- direct `127.0.0.1:6001/api/health` returned HTTP 200;
- `pocketrisu-service.log` had not been modified since 12:03, so old `ERR_STREAM_PREMATURE_CLOSE`, relay timeout, and HTTP/2 errors in that file are not time-correlated evidence for this incident.

## Durable model-job DB capture

At approximately 12:32 KST, `$HOME/PocketRisu/save/model-jobs.db` was opened read-only and queried for the previous three hours.

Observed result:

- `recent_jobs=0`;
- active main jobs: none;
- unclaimed terminal main jobs: none;
- pending sends: none.

Initially this was treated as provisional because the DB/WAL timestamps looked unexpectedly old.

## Live DB path confirmation

A follow-up INSPECT_ONLY check confirmed that the queried path is the database opened by the live PocketRisu process.

Observed live process details:

- `pocketrisu` PID: `17599`;
- process cwd: `/data/data/com.termux/files/home/PocketRisu`;
- `server/node/server.cjs` defines `savePath = path.join(process.cwd(), "save")`;
- `createModelJobs({ saveDir: savePath, logger })` therefore resolves to `$HOME/PocketRisu/save` for this process;
- `/proc/17599/fd/23` points to `$HOME/PocketRisu/save/model-jobs.db`;
- `/proc/17599/fd/24` points to `$HOME/PocketRisu/save/model-jobs.db-wal`;
- `/proc/17599/fd/25` points to `$HOME/PocketRisu/save/model-jobs.db-shm`;
- a full `$HOME` search found no second model-jobs DB set.

This removes the earlier uncertainty: the 12:32 read-only query was against the actual live model-job database.

## Request-path source inspection

The deployed request-selection source was inspected without modification.

Key findings from `src/ts/process/request/request.ts`:

- model-preset dispatch is selected by `resolveChatModelBinding(...)` before the classic model path;
- inside the model-preset request path, server-side jobs are used only when `getDatabase().nodeOnlyServerSideRequests === true`, there are no tool calls, and the request is not a preview;
- when that condition is false, the model-preset request uses `proxiedFetch` directly instead of `makeJobFetch`;
- when `makeJobFetch` is selected, job-creation network errors or non-OK creation responses other than 409 fall back to `proxiedFetch`;
- `makeProxiedFetch` itself uses `fetchNative`, which tries a browser direct request and can fall back to `/proxy2` on CORS/network failure;
- request logging wraps the selected transport and records the resulting route (`direct`, `proxy`, or `job`) once its scope closes.

Relevant gate:

```ts
const useServerJob = getDatabase().nodeOnlyServerSideRequests === true
    && !tools && !arg.previewBody
const transportFetch = useServerJob
    ? makeJobFetch(...)
    : proxiedFetch
```

This means an empty live `model-jobs.db` does **not** by itself imply a malfunction in the model-job subsystem. The request may legitimately have bypassed jobs because the server-side-request toggle was off, tools were active, the request was a preview, the chat resolved to the classic regime, or job creation fell back before a row was persisted.

## Current interpretation

Confirmed:

1. main-phone SSH/core transport was healthy during the failure;
2. server PocketRisu health was healthy during the failure;
3. the live model-job DB contained no job created in the preceding three hours;
4. there was no active main job, unclaimed terminal main job, or pending-send tombstone for the incident;
5. the job transport is conditionally gated and can be bypassed or fall back to the direct/proxy path.

Therefore the 12:28 infinite-loading incident is not explained by a durable model job stuck in `running`. The remaining diagnostic priority is to identify the actual transport used by the failed request and whether its request-log scope ever closed.

## Next diagnostic

Keep the browser stuck if possible and do not patch or reload yet.

Inspect the live request-log database around the 12:28 failure window and the runtime value of the server-side-request toggle if it can be obtained safely. Request-log rows should distinguish `direct`, `proxy`, and `job` when a scope completed; absence of a row may itself be meaningful because request-log entries are held until the scope closes.

Automatic full-page reload remains forbidden as a recovery mechanism.