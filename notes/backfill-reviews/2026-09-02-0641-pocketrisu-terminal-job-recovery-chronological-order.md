# Historical backfill review — terminal job recovery chronological order

- Reviewed at: 2026-09-02 06:41 KST
- Source: `PocketRisu/PocketRisu:develop`
- Source commit: `342b3a8a702cbce4ad7c3ea0594196ff7836c66b`
- Feature-ID: `TERMINAL-JOB-RECOVERY-PRESERVES-CHRONOLOGY`
- Backfill scope: bounded historical slice; active forward cursors were not moved backward.

## Finding

PocketRisu recovery can have more than one terminal, unclaimed `main` model job queued for the same chat. Recovery appends each recovered result to the chat in the order returned by the database query. The historical query ordered these terminal jobs newest-first (`created_at DESC`), so if several jobs accumulated, a later reply could be inserted above an earlier reply.

Commit `342b3a8a702cbce4ad7c3ea0594196ff7836c66b` changed the terminal-unclaimed query to oldest-first (`created_at ASC`) and documented the causal reason: recovery append order must match the original job chronology.

The same commit also cleared stale `coldstorage/` rows during save-folder import. That is a separate ownership/import-cleanup concern and is intentionally not folded into this Feature-ID.

## Classification

- `System impact`: `NO_SYSTEM_UPDATE`
- `Importance`: `HIGH`
- `Difficulty`: `LOW`
- `Size`: `XS`
- `Evidence`: `HIGH`
- `Risk`: `MEDIUM`
- `Dependencies`: `NONE`
- `Priority`: `P0`
- lifecycle status: `ADOPTED`
- source evidence: official `PocketRisu/PocketRisu` commit `342b3a8a702cbce4ad7c3ea0594196ff7836c66b`, `server/node/model-jobs.cjs`; direct code comment and one-line ordering fix establish the failure mode and intended invariant.
- benefit: prevents recovered model replies from being reinserted in reversed causal order after multiple terminal jobs accumulate, preserving chat chronology and semantic correctness.
- conflict/risk: ordering is only correct if `created_at` represents the append/causal sequence for the recovered job class. Future recovery sources with different sequence authority must not blindly inherit this ordering rule.
- validation need: regression fixture with at least two terminal unclaimed `main` jobs for one chat, created in sequence, asserting recovery returns/appends them oldest-first; keep non-`main`/active-job recovery semantics unchanged.
- follow-up: preserve as an invariant around model-job recovery refactors. If a stable explicit sequence field is introduced later, prefer that authority over timestamp ordering and update this record rather than deleting history.

## Dedupe / relationship check

This is related to, but not the same as, `LIVE-SEND-RECOVERY-OWNERSHIP-GATE`. That invariant decides whether recovery is allowed to mutate a chat while a live path still owns it. This Feature-ID governs the ordering of multiple already-eligible terminal recoveries. Keep both boundaries explicit.

## Historical coverage marker

No `HISTORICAL_BACKFILL_COMPLETE_THROUGH` advancement is justified by this single bounded slice.
