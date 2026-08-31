# Historical backfill — conversion must detach lazy asset ownership

- Reviewed source: `PocketRisu/PocketRisu:develop`
- Source commit: `dd718991c4e5344f50f1a7c61f04d3b64c86487e`
- Review mode: bounded historical backfill; active forward cursor was not moved backward.

## Finding

`dd718991` fixes a concrete ownership bug in character↔module conversion after lazy asset manifests were introduced. The conversion path copied a manifest descriptor into the newly converted object, which made the new object and its source temporarily point at the same manifest identity. Editing assets on the converted copy before a reload could therefore rewrite the source owner's manifest.

The fix hydrates the source object's asset list into a plain array copy before conversion, removes the manifest descriptor from that detached representation, and then converts the detached value. The now-async UI path is also re-entry guarded and reports hydration failures instead of publishing a half-converted object.

## Durable invariant

**Feature-ID: `CONVERSION-LAZY-ASSET-OWNERSHIP-DETACH`**

Any operation whose semantics create an independent entity — conversion, duplicate/clone, import-as-copy, template instantiation, or similar — must detach lazy-storage ownership before publishing the new entity. Copying a lazy manifest/storage descriptor is not equivalent to copying its logical value.

A safe boundary is:

1. resolve/hydrate the source logical value without mutating the source;
2. clone the value into independent caller-owned data;
3. strip source-owned manifest/storage identity from the detached copy;
4. construct/publish the new entity only after hydration succeeds;
5. reject or surface failure rather than publishing a new entity that aliases the source storage owner.

Performance caches or descriptor identity must never silently turn a logical copy operation into shared mutable persistence.

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
- source evidence: `PocketRisu/PocketRisu@dd718991c4e5344f50f1a7c61f04d3b64c86487e`
- benefit: prevents edits to a converted/duplicated object's assets from mutating the source entity's authoritative manifest; preserves independent-object semantics across lazy storage boundaries.
- conflict/risk: hydration can add latency and failure paths; careless implementation may mutate the source object, duplicate large payloads unnecessarily, or publish a partial clone after hydration failure.
- validation need: regression coverage should prove source and converted entity receive independent persistence identities; editing either side must not affect the other; failed hydration must publish neither alias nor partial destination; repeated conversion must be re-entry safe.
- follow-up: preserve this invariant whenever new lazy/externalized domains or clone/conversion surfaces are added. Audit new copy-like operations for descriptor aliasing rather than copying this exact helper blindly.

## Deduplication

This is related to lazy-manifest and handed-out-view ownership work, but is not the same underlying idea. Handed-out-view writeback decides whether a plugin-provided value is authoritative for an existing owner; this invariant governs creation of a *new independent owner*. Evidence is therefore kept as a distinct adopted invariant rather than merged into plugin writeback authority.

## Cursor / coverage

No active cursor changed. This was a single historical slice, so `HISTORICAL_BACKFILL_COMPLETE_THROUGH` was not advanced.
