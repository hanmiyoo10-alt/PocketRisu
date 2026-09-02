# 2026-09-03 07:36 KST — lifecycle flush guardrail drift

## LIFECYCLE-FLUSH-GUARDRAIL

- `System impact`: `NO_SYSTEM_UPDATE`
- `Importance`: `HIGH`
- `Difficulty`: `LOW`
- `Size`: `XS`
- `Evidence`: `HIGH`
- `Risk`: `MEDIUM`
- `Dependencies`: `NONE`
- `Priority`: `P0`
- lifecycle status: `READY_TO_PORT`
- source evidence:
  - durable registry `notes/external-risu-dev-watch.md` explicitly says no forced DB flush on `visibilitychange` / `pagehide` and `flushServerDbKeepalive()` remains a no-op unless separately reviewed.
  - `hanmiyoo10-alt/PocketRisu:main@fd9a034abc8e41a1108aefccb87989294355dd63`, `src/ts/globalApi.svelte.ts`, currently defines `flushServerDbKeepalive()` as a live `POST /api/db/flush` keepalive request and registers `visibilitychange(hidden)` / `pagehide` handlers that call `flushImmediate() -> triggerSave(...)` plus the keepalive flush.
  - official `PocketRisu/PocketRisu:develop@278251f85a19bfdfd4cf3faae780e62682878f9e` contains the same lifecycle-triggered persistence pattern. External/official code is evidence only; the durable PocketRisu-helper guardrail remains authoritative for this project.
  - helper-repo dossiers already repeat the invariant across multiple features; dedicated boundary added at `products/pocketrisu-helper-mod/docs/features/save/lifecycle-flush-guardrail/INVARIANT.md` (`hanmiyoo10-alt/-@e8eee475d8c461e8ade9071c6ad03f8f24064cb0`).
- expected PocketRisu benefit: restore deterministic save ownership; avoid page lifecycle timing becoming a second persistence authority that can race the normal save coordinator, writer-lock/session logic, patch-sync/requeue semantics, or server durability behavior.
- main conflict/risk: users may have implicitly benefited from a last-moment hidden/pagehide save. However the project explicitly rejects lifecycle-triggered DB flushes as an invariant; restoration must leave ordinary debounced/explicit saves untouched and add a regression test so the guardrail is not lost again.
- validation need:
  1. no `visibilitychange` or `pagehide` handler invokes `triggerSave`, a full DB write, or `/api/db/flush`;
  2. `flushServerDbKeepalive()` has no network/storage side effect;
  3. ordinary debounced and explicit save paths continue to persist/requeue/retry exactly as before;
  4. lifecycle-only events create no save request;
  5. existing patch-sync, ETag/revision, stub-loss protection, targeted V3 reload, runit, and server-phone notification guardrails remain unchanged.
- follow-up: implement as one isolated personal-fork branch/PR from the appropriate current base. Do not mix other save cleanup. A dedicated helper Feature-ID dossier now exists. The code change is execution-ready, but this run did not replace `src/ts/globalApi.svelte.ts` because the connected GitHub write surface exposes full-file replacement rather than a bounded patch operation for this large/high-churn file; blindly reconstructing the whole file would violate the `INSPECT_ONLY -> bounded modify -> verify` safety rule. Record this as tooling/write-granularity limitation, not code or CI failure.

## Deduplication / progression note

This is not a new lifecycle-save feature proposal. It normalizes a durable guardrail already repeated in project dossiers and records a concrete drift between that guardrail and the current personal-fork/official source file. Because the intended ownership rule is explicit, dependencies are none and rollback is a one-commit revert, the item is `READY_TO_PORT` rather than `DESIGN_NEEDED`.

No Active-source forward cursor moved in this run. `HISTORICAL_BACKFILL_COMPLETE_THROUGH` is unchanged.
