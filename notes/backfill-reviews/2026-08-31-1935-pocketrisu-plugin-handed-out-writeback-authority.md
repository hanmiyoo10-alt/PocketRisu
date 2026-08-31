# Historical backfill review — PocketRisu plugin handed-out write-back authority

Date: 2026-08-31
Source: `PocketRisu/PocketRisu:develop`
Reviewed commits:
- `e6e8ef040ec53ad132ecb572ada63538504079fa` — preserve lazy module/persona manifests on unchanged plugin DB round-trips.
- `2981235e49135b7e65849569a659e6954c91190d` — compare write-backs against the exact asset list handed to the plugin, not the bounded full-manifest LRU.

## Meaningful invariant

Feature-ID: `PLUGIN-HANDED-OUT-VIEW-WRITEBACK-AUTHORITY`

A compatibility view materialized for a caller must be reconciled against the identity/content that was actually handed to that caller. A small performance cache is not durable semantic authority for deciding whether a caller changed data.

The first fix restored lazy manifest descriptors when modules/persona embedded modules were returned unchanged by a plugin. The follow-up exposed an important edge case: hydrating more manifests than the bounded LRU capacity evicted early entries before write-back, making unchanged lists appear unrecognized and causing them to be written inline. The corrected implementation remembers a bounded fingerprint of handed-out lists per manifest id and treats the LRU only as fallback evidence when no handed-out record exists.

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
- source evidence: official PocketRisu commits `e6e8ef040ec53ad132ecb572ada63538504079fa`, `2981235e49135b7e65849569a659e6954c91190d` plus regression coverage for unchanged round-trip, edited lists, and LRU eviction.
- benefit: preserves lazy asset-manifest representation across legacy/plugin compatibility round-trips, avoiding accidental DB re-inlining and the memory/size regression that follows.
- conflict/risk: an incorrect equality/fingerprint boundary could misclassify a real plugin edit as unchanged. Handed-out identity must therefore be scoped to the exact manifest/caller compatibility view and changed lists must remain authoritative edits.
- validation need: keep tests that exceed cache capacity, verify unchanged round-trips restore descriptors, verify edited lists remain inline, and ensure bounded handed-out bookkeeping does not become an unbounded retention source.
- follow-up: preserve this invariant whenever plugin snapshot hydration, manifest caching, or compatibility write-back is refactored. Do not replace handed-out provenance with an eviction-prone cache lookup.

## Deduplication decision

This is related to lazy plugin-storage/asset-manifest work but is narrower than general cache integrity. It is retained as an `ADOPTED` invariant because it captures a concrete regression class: a performance cache must not be promoted into semantic write-back authority.

## Cursor / coverage

This was historical backfill only. No active-source forward cursor moved backward or forward because of this review. `HISTORICAL_BACKFILL_COMPLETE_THROUGH` is unchanged; this single slice is not evidence of exhaustive coverage across all tracked sources.
