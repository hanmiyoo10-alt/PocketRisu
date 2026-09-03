# Idea ledger addendum — 2026-09-04 03:34 KST

## `PLUGIN-STORAGE-PARTIAL-WRITES-DO-NOT-IMPLY-DELETE`

- `System impact`: `NO_SYSTEM_UPDATE`
- `Importance`: `HIGH`
- `Difficulty`: `LOW`
- `Size`: `XS`
- `Evidence`: `HIGH`
- `Risk`: `MEDIUM`
- `Dependencies`: `NONE`
- `Priority`: `P0`
- lifecycle status: `ADOPTED`
- source evidence: `PocketRisu/PocketRisu@ebe32742a22b123eb0c52e4dc387d641090dee8a`; storage-externalization context `f0d4eee35ca0b4ac7e5fb4ee4668205b46723a44`; current reviewed-tip preservation in `src/ts/plugins/pluginDbProxy.ts` at `ca09a80746e74e5334145e5e78af47ce423e0eba`
- benefit: prevents empty/partial compatibility DB round-trips from deleting unrelated authoritative plugin-storage keys
- conflict/risk: omission cannot be deletion intent at an incomplete compatibility boundary; destructive clear/replace must stay explicit or prove complete authoritative snapshot ownership
- validation need: preserve empty-object and partial-object regression coverage, explicit clear/delete behavior, and current targeted V3 plugin reload behavior
- follow-up: use this Feature-ID as the sole canonical helper dossier for this invariant; merge future evidence here instead of creating aliases

### Deduplication normalization

A bounded historical pass rediscovered `ebe32742...` and found that the helper repository contained three dossiers for the same underlying invariant:

- canonical: `products/pocketrisu-helper-mod/docs/features/plugins/plugin-storage-partial-writes-do-not-imply-delete/INVARIANT.md`
- duplicate alias: `.../plugin-storage-roundtrip-non-destructive-merge/INVARIANT.md`
- duplicate alias: `.../plugin-storage-partial-write-merge-semantics/INVARIANT.md`

The aliases are now retained as `SUPERSEDED` historical records pointing to the canonical Feature-ID. Their original evidence was valid; this change only removes duplicate ownership and prevents parallel progression of one idea under multiple names.

### Autonomous progression

- implementation: none; canonical invariant is already `ADOPTED`
- helper normalization commits: `hanmiyoo10-alt/-@ea144f22a23183606d02f86cc0df722117c2064b`, `hanmiyoo10-alt/-@ab212a0d04a37c8bbc0048ac89adf284b18dcb8f`
- branch/tests/personal PR: not applicable; no code behavior changed
- forward cursors: unchanged; no cursor moved backward
- `HISTORICAL_BACKFILL_COMPLETE_THROUGH`: unchanged; this proves only one bounded slice
