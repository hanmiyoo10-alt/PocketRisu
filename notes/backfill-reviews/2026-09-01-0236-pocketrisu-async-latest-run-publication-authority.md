# Historical backfill — async latest-run publication authority

Source: `PocketRisu/PocketRisu:develop`
Reviewed commit: `ca52464bb5f143196e0d74d15aa12823baee4cf1` (`fix(prompt-diff): prevent stale async diff results from overwriting latest`)
Reviewed at: 2026-09-01 02:36 KST

## Finding

`PromptDiffModal.svelte` previously awaited asynchronous diff computation and then published its result unconditionally. If inputs or diff mode changed again before an older computation resolved, that older completion could overwrite the newer requested state. The adopted fix increments a monotonic run id for every recomputation, captures the id before awaiting, and only publishes the result when its captured id is still current.

This is a reusable UI/state correctness invariant: an asynchronous derived-state computation must not publish after a newer derivation request has superseded it. Cancellation is optional; publication authority is not.

## Classification

- Feature-ID: `ASYNC-LATEST-RUN-PUBLICATION-AUTHORITY`
- System impact: `NO_SYSTEM_UPDATE`
- Importance: `MEDIUM`
- Difficulty: `LOW`
- Size: `XS`
- Evidence: `HIGH`
- Risk: `LOW`
- Dependencies: `NONE`
- Priority: `P1`
- lifecycle status: `ADOPTED`
- Source evidence: `PocketRisu/PocketRisu@ca52464bb5f143196e0d74d15aa12823baee4cf1`
- Benefit: prevents stale async completions from replacing the newest user-selected/render-derived state; applicable to diffing, previews, search, selections, and other non-authoritative derived UI work.
- Conflict/risk: a run-id guard can hide useful completion only if ownership is defined incorrectly; do not use this pattern to discard authoritative writes or persistence acknowledgements.
- Validation need: force an older operation to resolve after a newer one and assert that only the newest result becomes visible; cover both flat and card diff paths and any future shared helper extraction.
- Follow-up: preserve as an adopted invariant; when adding async derived UI state, prefer explicit generation/epoch ownership (or equivalent cancellation plus publication check) and test out-of-order completion.

## Deduplication note

This is related to stale-selection guards in chat/navigation work, but is not the same underlying backlog item. Those ideas govern navigation/state ownership across character/chat switches; this invariant governs publication authority for replaceable asynchronous derived results. Keep the generic mechanism reusable, but do not merge persistence/network write acknowledgement semantics into it.

## Backfill coverage

This review covers one historical commit only. It does not justify advancing `HISTORICAL_BACKFILL_COMPLETE_THROUGH`, and no active forward cursor was moved backward.
