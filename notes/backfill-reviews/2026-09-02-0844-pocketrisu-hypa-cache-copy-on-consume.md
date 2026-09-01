# Historical backfill: copy shared embedding cache entries before caller metadata mutation

- Reviewed: 2026-09-02
- Source: `PocketRisu/PocketRisu:develop`
- Source commit: `9ff600a2c754d9aa203da65e9e3b84c2ceadf3e7`
- Review mode: bounded historical backfill; forward cursors unchanged

## Finding

PocketRisu's in-memory Hypa vector cache returns shared object references. `HypaProcessorV2` previously attached per-call `metadata` directly to a cached embedding object before placing the same object into its local vector map. A later metadata-less query that hit the same cache key could therefore overwrite the metadata on the shared object. In the observed failure, the parent summary metadata disappeared and similarity search later crashed while reading the missing `text` field.

Commit `9ff600a2` changes the cache-hit path to construct a detached result object (`{ ...cached, id, metadata }`) and stores/returns that copy instead of mutating the shared cache entry. The same commit also bounds embedding API error-body text before exposing it in chat UI; that is a separate diagnostics concern and is not promoted as a second idea here.

## Classification

- Feature-ID: `SHARED-VECTOR-CACHE-VALUES-ARE-IMMUTABLE-TO-CONSUMERS`
- System impact: `NO_SYSTEM_UPDATE`
- Importance: `HIGH`
- Difficulty: `LOW`
- Size: `XS`
- Evidence: `HIGH`
- Risk: `LOW`
- Dependencies: `NONE`
- Priority: `P0`
- Lifecycle status: `ADOPTED`
- Source evidence: official PocketRisu commit `9ff600a2c754d9aa203da65e9e3b84c2ceadf3e7`; the commit message documents a reproducible metadata-clobber path and resulting similarity-search crash, and the patch makes the cache-hit result detached before caller metadata is applied.
- Benefit: prevents cross-request state corruption when a shared cache object is reused by consumers with different metadata. This preserves cache purity and avoids nondeterministic crashes caused by one consumer mutating state another consumer still relies on.
- Conflict/risk: avoid deep-copying large embedding arrays unnecessarily; the invariant requires detaching caller-owned wrapper metadata/identity, not duplicating immutable vector payloads unless the vector itself can be mutated. A future optimization must not reintroduce writable shared wrapper state.
- Validation need: focused regression should seed one cache key, consume it once with parent-summary metadata and once without metadata, then verify the first consumer's stored metadata remains intact and similarity lookup still succeeds. Also verify cache-hit and cache-miss result shapes remain equivalent for callers.
- Follow-up: preserve copy-on-consume (or stronger immutability) at shared vector-cache boundaries. No autonomous implementation is needed because current official PocketRisu already contains the fix.

## Dedupe / ownership boundary

Kept distinct from request coalescing, cache eviction, embedding persistence, and rollback-generation ideas. Those govern request concurrency/lifetime/persistence. This invariant governs **mutation authority over shared cache values**: cache entries may be shared for reuse, but consumer-specific metadata must remain caller-owned.

The error-body truncation in the same commit is supporting historical context only and is not merged into this Feature-ID because it belongs to UI/diagnostics rather than cache ownership.

## Backfill marker

This review covers one bounded historical slice only. It does not establish complete reviewed coverage for all tracked sources through a new date, so `HISTORICAL_BACKFILL_COMPLETE_THROUGH` must not advance from this review alone.
