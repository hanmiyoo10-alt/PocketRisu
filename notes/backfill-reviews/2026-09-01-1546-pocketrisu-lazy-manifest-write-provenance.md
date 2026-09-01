# Historical review — lazy manifest write provenance

Reviewed source: `PocketRisu/PocketRisu:develop`

## Evidence

- `b69fafa9dd11a9b355edf0f058ecc458209336a5` — only an asset list actually received/hydrated by the writer may replace a lazy manifest; prevents another plugin's lazy-shaped write from inheriting unrelated hydrate authority.
- `856807a25b3145c59845713a0631a5e2fa22f309` — stale hydrated snapshots are discarded when their manifest revision no longer matches the current descriptor; also resolves legitimate in-place V2 edits against the live object.

## Deduplicated invariant

Feature-ID: `LAZY-MANIFEST-WRITE-PROVENANCE`

When lazy/externalized data is represented by a descriptor plus optionally hydrated inline data, write-back authority must carry provenance tied to the exact descriptor/revision the writer actually received. A hydrated payload from an older manifest must not overwrite a newer manifest, and a writer that never hydrated the payload must not acquire replacement authority merely because some other consumer previously hydrated the same logical object.

This is related to plugin-storage externalization and conversion ownership, but is not the same underlying idea: the key boundary here is write provenance / stale-write rejection across lazy representation transitions.

## Classification

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `HIGH`
- Difficulty: `LOW`
- Size: `XS`
- Evidence: `HIGH`
- Risk: `MEDIUM`
- Dependencies: `NONE`
- Priority: `P0`
- lifecycle status: `ADOPTED`
- Source evidence: `PocketRisu/PocketRisu` `b69fafa9dd11a9b355edf0f058ecc458209336a5`, `856807a25b3145c59845713a0631a5e2fa22f309`
- Benefit: prevents silent rollback/corruption of externally stored asset lists when plugin/API snapshots race or cross lazy/hydrated shapes.
- Conflict/risk: provenance checks that are too broad can discard legitimate in-place edits; checks that are too weak allow stale or never-hydrated values to replace durable state.
- Validation need: retain tests for stale-manifest rejection, never-hydrated write rejection, exact-current-revision hydration, in-place V2/live-object edits, character and module symmetry, and no change to unrelated fields.
- Follow-up: preserve as an adopted storage/plugin invariant whenever lazy plugin data, manifests, or compatibility adapters change.

## Progression

No implementation branch or PR was created because the invariant is already implemented in official PocketRisu and covered by focused regression tests. Historical cursors were not moved backward, and `HISTORICAL_BACKFILL_COMPLETE_THROUGH` was not advanced from this single bounded slice.