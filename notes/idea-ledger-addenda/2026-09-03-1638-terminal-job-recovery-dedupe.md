# Terminal job recovery chronology — canonicalization

## Idea

`TERMINAL-JOB-RECOVERY-PRESERVES-CHRONOLOGY`

- `System impact`: `NO_SYSTEM_UPDATE`
- `Importance`: `HIGH`
- `Difficulty`: `LOW`
- `Size`: `XS`
- `Evidence`: `HIGH`
- `Risk`: `MEDIUM`
- `Dependencies`: `NONE`
- `Priority`: `P0`
- lifecycle status: `ADOPTED`

## Source evidence

- official `PocketRisu/PocketRisu` commit `342b3a8a702cbce4ad7c3ea0594196ff7836c66b`
- commit changed terminal, unclaimed `kind = 'main'` recovery enumeration from `ORDER BY created_at DESC` to `ORDER BY created_at ASC` because replay appends each recovered result in query order; newest-first can place a later reply above an earlier one when multiple jobs accumulated for the same chat.
- current official `develop@278251f85a19bfdfd4cf3faae780e62682878f9e` retains ascending `created_at` ordering for `stmtListUnclaimed`.

## PocketRisu benefit

Crash/restart recovery preserves visible conversation chronology when more than one completed/failed unclaimed main-generation result must be replayed. It also captures a reusable ownership rule: recovery admission and recovery replay ordering are separate authorities; ordering correctness does not make an otherwise-ineligible job recoverable.

## Conflict / risk

Wrong ordering silently changes conversation semantics even when all durable data survives. `created_at` is only the current ordering authority; if a future schema introduces an explicit stable sequence, that sequence should replace wall-clock time rather than layering a second heuristic. Auxiliary jobs, active jobs, and claimed jobs must not be pulled into this replay stream merely to reuse the ordering rule.

## Validation need

Focused regression: create at least two terminal unclaimed `main` jobs for one chat with known durable order, recover after live ownership is absent, and assert oldest-to-newest append order. Include claimed and non-`main` controls and assert they do not replay. If model-job schema changes, re-prove the durable causal-sequence authority.

## Follow-up

No implementation PR is needed: official PocketRisu already adopts the invariant. Preserve it during any future model-job/recovery redesign.

During normalization, two helper-repo dossiers were found for this same underlying idea. The canonical durable dossier is:

`products/pocketrisu-helper-mod/docs/features/recovery/terminal-job-recovery-preserves-chronology/INVARIANT.md`

The duplicate historical path is preserved but marked `SUPERSEDED` and points to the canonical dossier:

`products/pocketrisu-helper-mod/docs/features/jobs/model-job-recovery-preserves-chronological-order/INVARIANT.md`

Helper-repo deduplication commit: `b62621f7ba89e51cbde23cd2f956978cff38ee7d`.

## Cursor / backfill note

This was a bounded historical-backfill normalization. No Active source cursor moved backward or forward as a consequence, and this single slice does not prove broader `HISTORICAL_BACKFILL_COMPLETE_THROUGH` coverage.
