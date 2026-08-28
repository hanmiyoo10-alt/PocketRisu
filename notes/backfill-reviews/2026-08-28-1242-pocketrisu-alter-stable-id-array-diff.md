# Historical backfill review — PocketRisu-Alter stable-ID array diff safety

Date: 2026-08-28
Source: `PocketRisu-Alter/PocketRisu-Alter`
Source commit: `79c35cf2594dc20dd7334f3ca18ea752678a189e`
Source date: 2026-05-21

## Idea

When a persisted array has stable element IDs, same-length array changes must not automatically be treated as index-wise internal edits. A reorder means slot N before and slot N after may be different logical entities; applying per-index patches can drift fields across entities. Structural replacement (or an equivalently identity-aware move/update algorithm) must win when stable IDs no longer align, and missing/duplicate IDs must fail safe rather than silently using positional identity.

## Classification

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `HIGH`
- Difficulty: `LOW`
- Size: `XS`
- Evidence: `MEDIUM`
- Risk: `MEDIUM`
- Dependencies: matching PocketRisu stable-ID array patch/diff owner; current `hanmiyoo10-alt/PocketRisu` code search does not expose the Alter `RisuSavePatcher` / `diffArrayWithIdGuard` boundary
- Priority: `P0`
- Lifecycle status: `HOLD`

## Source evidence

`79c35cf2` changed Alter's bot-preset patching from length-only positional diffing to ID-guarded diffing after bot presets gained stable IDs. The source commit documents the failure mode: a same-length reorder previously entered the per-slot diff path and compared unrelated presets at the same index. Its regression suite covers reorder, missing ID, duplicate ID, add/delete, and reorder plus internal edit.

## PocketRisu benefit

Preserves save correctness if PocketRisu introduces or evolves incremental patching for stable-ID collections. It prevents silent cross-entity patch drift, which can be harder to detect than an explicit full-array replacement.

## Conflict / risk

Blindly copying the Alter helper would be wrong because current PocketRisu does not expose the same patcher architecture. Structural replacement can also increase write size, so identity-aware fallback should only be applied at a concrete owner after measuring the actual patch contract.

## Validation need

For any future matching owner, test: identical order/internal edit, reorder, reorder plus edit, add/delete, missing ID, duplicate ID, and legacy data before ID migration. Assert that identity mismatch never emits per-index patches across different logical entities.

## Follow-up

Keep as a save-integrity invariant. Promote to `DESIGN_NEEDED` or `READY_TO_PORT` only if a concrete PocketRisu stable-ID array patch boundary is found. Do not introduce a new generic patch abstraction solely for this historical lesson.

## Backfill coverage

This review extends the bounded PocketRisu-Alter historical inspection into the 2026-05-21 save-patcher sequence. It does not establish complete initial-history coverage and does not change `HISTORICAL_BACKFILL_COMPLETE_THROUGH`.
