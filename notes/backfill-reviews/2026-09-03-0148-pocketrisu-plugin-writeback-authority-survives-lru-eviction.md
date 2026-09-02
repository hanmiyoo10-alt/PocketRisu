# Historical backfill review — plugin write-back authority survives LRU eviction

Reviewed source: `PocketRisu/PocketRisu:develop`

Source commit: `2981235e49135b7e65849569a659e6954c91190d` (2026-08-30)

## Finding

Plugin compatibility hydration hands detached asset arrays to V3/plugin callers while durable DB state remains manifest-backed. A small full-manifest LRU is only a performance cache; eviction must not silently change whether an unchanged hydrated list can be recognized as unchanged on write-back. Commit `2981235e...` fixes this by recording a bounded fingerprint of every manifest list actually handed to a plugin and comparing write-back against that handoff identity, using the LRU only as a fallback when no handoff record exists.

The regression was concrete: hydrating more manifests than the 8-entry full-manifest cache could evict an early entry before the plugin wrote it back, causing an unchanged list to be mistaken for an edit and re-inlined into DB state. The commit adds focused tests for both the unchanged-after-eviction path and an actual edit after eviction.

Current `develop@278251f85a19bfdfd4cf3faae780e62682878f9e` still retains the handed-out fingerprint / `matchesManifest` boundary.

## Durable invariant

**Feature-ID: `PLUGIN-WRITEBACK-AUTHORITY-SURVIVES-LRU-EVICTION`**

Cache residency is not write-authority state. If compatibility hydration gives a caller a detached representation whose unchanged write-back should preserve a durable descriptor, the comparison authority must survive ordinary cache eviction for the lifetime/boundary needed to recognize that handoff. Eviction may reduce performance, but must not alter persistence semantics.

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
- source evidence: `PocketRisu/PocketRisu@2981235e49135b7e65849569a659e6954c91190d`; current preservation in `develop@278251f85a19bfdfd4cf3faae780e62682878f9e`
- benefit: prevents unchanged plugin snapshot round-trips from de-externalizing manifest-backed assets merely because a small LRU evicted comparison data; keeps persistence semantics independent of cache pressure.
- conflict/risk: handoff fingerprints are bounded state and must not become an unbounded leak or be treated as proof across incompatible manifest revisions; real edits must still remain inline/explicit rather than being incorrectly collapsed back to an old descriptor.
- validation need: retain regression coverage for (1) more hydrated manifests than cache capacity, (2) unchanged write-back after eviction restores descriptors, (3) edited list after eviction is detected as changed, and (4) bounded handoff tracking.
- follow-up: preserve this invariant when changing plugin snapshot hydration, manifest caches, lazy asset externalization, or write-back reconciliation. Do not substitute cache hit/miss state for caller-handoff identity.

## Deduplication note

This is related to stale hydrated-write rejection and manifest write-back preservation, but it is a distinct underlying invariant: those govern revision freshness / unchanged round-trips; this one specifically says **ephemeral cache eviction cannot revoke or alter persistence authority for a representation already handed to a caller**. Preserve separately while cross-linking the family.