# Historical backfill review — non-empty core collection recovery

Source: `PocketRisu/PocketRisu`
Commit: `58717c5ae07a8b7a12ae42fb186f657f1418afce`
Reviewed as historical evidence only; do not move the active PocketRisu forward cursor backward.

## Finding

`setDatabase()` previously treated a missing `personas` field as recoverable but allowed an existing empty array to pass through. Downstream persona UI dereferences `personas[0]`, so a structurally present but semantically unusable empty collection could still crash imported/corrupted databases. The fix rebuilds the default persona when `personas` is not an array or has length zero.

This is a reusable invariant: for core collections with downstream non-empty assumptions, migration/recovery validation must check the minimum usable shape, not mere field presence/nullishness.

The same source commit also guards several `selectSingleFile()` call sites against filtered/cancelled selections returning no file. That is related defensive import handling, but is not merged into this invariant because it concerns nullable user-input boundaries rather than durable DB shape.

## Classification

- Feature-ID: `NONEMPTY-CORE-COLLECTION-RECOVERY`
- System impact: `NO_SYSTEM_UPDATE`
- Importance: `HIGH`
- Difficulty: `LOW`
- Size: `XS`
- Evidence: `HIGH`
- Risk: `LOW`
- Dependencies: `NONE`
- Priority: `P0`
- Lifecycle: `ADOPTED`
- Source evidence: official PocketRisu commit `58717c5ae07a8b7a12ae42fb186f657f1418afce`; current personal fork `develop` still contains the non-array/empty-array recovery guard in `src/ts/storage/database.svelte.ts`.
- Benefit: prevents imported/corrupted DB state from crashing persona-dependent UI despite passing nullish-default migration checks.
- Conflict/risk: over-generalizing this rule could silently fabricate data for collections where empty is a valid user state; apply only where a non-empty invariant is part of the consumer contract.
- Validation need: fixture with `personas: []`, non-array `personas`, and valid non-empty personas; confirm only invalid minimum shapes are repaired and valid data remains unchanged.
- Follow-up: preserve as a migration/recovery invariant and require consumer-shape tests when adding new core collections with non-empty assumptions.

## Cursor / coverage

The source commit predates the authoritative `PocketRisu/PocketRisu` cursor `444c9e610e9a0cfd1b22cd400ac8282a0a2db8fd`; the cursor is unchanged. This bounded review does not establish complete historical coverage, so `HISTORICAL_BACKFILL_COMPLETE_THROUGH` is unchanged.
