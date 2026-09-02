# PocketRisu historical review — model-job recovery order

Reviewed source: `PocketRisu/PocketRisu:develop`

Source commit: `342b3a8a702cbce4ad7c3ea0594196ff7836c66b` (2026-07-31)

## Finding

PocketRisu's Node model-job recovery appends each unclaimed completed/failed main job back into the chat in query order. Recovering newest-first can therefore place a later reply above an earlier reply when multiple unclaimed jobs accumulated for the same chat. The source fix changes the recovery query from `ORDER BY created_at DESC` to `ORDER BY created_at ASC`.

Current `develop` still preserves this ordering invariant in `server/node/model-jobs.cjs`.

## Normalized idea

Feature-ID: `MODEL-JOB-RECOVERY-PRESERVES-CHRONOLOGICAL-ORDER`

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `HIGH`
- Difficulty: `LOW`
- Size: `XS`
- Evidence: `HIGH`
- Risk: `LOW`
- Dependencies: `NONE`
- Priority: `P0`
- lifecycle status: `ADOPTED`
- Source evidence: `PocketRisu/PocketRisu@342b3a8a702cbce4ad7c3ea0594196ff7836c66b`; current `develop` retains ascending unclaimed recovery order.
- Benefit: preserves user-visible chronological chat order after crash/restart recovery when more than one terminal unclaimed main-generation job exists.
- Conflict/risk: changing retrieval order can silently reorder recovered assistant messages; auxiliary jobs must remain excluded from chat recovery.
- Validation need: regression case with two or more unclaimed main jobs for one chat must recover oldest-to-newest; mixed auxiliary jobs must not become chat messages; claimed jobs must not be duplicated.
- Follow-up: preserve as an invariant for future model-job queue/recovery refactors; no port is needed because official PocketRisu already adopts it.

## Deduplication note

This is separate from auxiliary-model-job cancellation ownership. Cancellation controls which job may continue/terminate; this invariant controls deterministic replay order for already terminal, unclaimed main jobs.

## Backfill marker

This review is one bounded historical slice only. It does not establish complete tracked-source coverage and therefore does not advance `HISTORICAL_BACKFILL_COMPLETE_THROUGH`.
