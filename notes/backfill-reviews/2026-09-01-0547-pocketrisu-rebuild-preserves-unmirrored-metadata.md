# Backfill review — rebuild preserves unmirrored metadata

Reviewed source: `PocketRisu/PocketRisu:develop`

Source commit: `f1e009ecd4daf687381f7d7de43dd07f0d0b5170`

## Finding

`saveCurrentPreset()` reconstructs the active prompt preset from top-level DB mirror fields. `folderId` is durable preset metadata but has no top-level mirror, so reconstruction that copied only mirrored fields plus selected identity/display fields silently removed folder membership on ordinary save flows. The adopted fix carries `folderId` from the stored preset into the rebuilt object.

## Durable invariant

Feature-ID: `REBUILD-PRESERVES-UNMIRRORED-METADATA`

When a save/rebuild path synthesizes a canonical persisted object from a partial/mirrored editing state, it must explicitly preserve durable fields whose ownership remains on the stored object. Reconstruction is a schema boundary: omission must not silently mean deletion unless deletion is intentional and modeled explicitly.

## Classification

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `MEDIUM`
- Difficulty: `LOW`
- Size: `XS`
- Evidence: `HIGH`
- Risk: `LOW`
- Dependencies: `NONE`
- Priority: `P1`
- lifecycle status: `ADOPTED`
- source evidence: `PocketRisu/PocketRisu` commit `f1e009ecd4daf687381f7d7de43dd07f0d0b5170`; localized diff in `src/ts/storage/database.svelte.ts` preserves `folderId` while rebuilding the preset.
- benefit: prevents ordinary save/switch/create/duplicate/import/delete flows from erasing durable metadata that is not represented in the editing mirror.
- conflict/risk: blindly spreading the whole old object could preserve fields that should be recomputed or removed; preservation should be explicit and schema-aware.
- validation need: regression test a preset with non-default `folderId`, run each reconstruction-triggering save path, and assert folder membership survives while fields intentionally rebuilt from mirrors still update.
- follow-up: preserve this invariant when adding new preset-only metadata or refactoring mirrored edit state; audit similar object-reconstruction paths opportunistically rather than broad-changing them without evidence.

## Deduplication note

This is distinct from persisted-key backward compatibility and lazy-manifest ownership invariants. Those govern schema-key meaning or externalized asset ownership; this one governs loss of durable fields at a partial-state-to-canonical-object reconstruction boundary.

## Progression

Already adopted upstream. No implementation branch or PR is warranted. Durable ledger and helper invariant dossier are sufficient progression for this backfill slice.

## Historical coverage

This is a bounded single-commit backfill observation. It does not by itself justify advancing `HISTORICAL_BACKFILL_COMPLETE_THROUGH`.