# Forward review — PocketRisu 273e7c2f → b8bbcbe0

Reviewed source: `PocketRisu/PocketRisu:develop`

- Previous authoritative cursor: `273e7c2fd541cd7df0d21f03e29892247c49e724`
- Reviewed HEAD: `b8bbcbe065755379d33f74d6ad16a36d634917c1`
- Range: 39 commits, reviewed forward only.

## Meaningful durable ideas / evidence

### PLUGIN-STORAGE-PENDING-READ-YOUR-WRITE

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `HIGH`
- Difficulty: `LOW`
- Size: `XS`
- Evidence: `HIGH`
- Risk: `MEDIUM`
- Dependencies: `NONE`
- Priority: `P0`
- Lifecycle: `ADOPTED`
- Source evidence: `83ffa0474abd013581c4df23e50b20c559d4b47a`
- Benefit: preserves synchronous upstream plugin-storage read-after-write semantics even though PocketRisu persists the write asynchronously to the server; `getItem()` and full snapshots see the queued value/removal instead of a stale server/cache copy.
- Conflict/risk: pending-operation state becomes a semantic authority; incorrect ordering or stale pending state could expose wrong values or hide completed writes.
- Validation need: retain regression coverage for in-flight set → immediate get, in-flight remove → immediate get, and snapshotAll observing the pending value rather than the old server copy.
- Follow-up: preserve this as an invariant whenever plugin storage queuing, batching, caching, or transport is refactored.

### PLUGIN-HANDED-OUT-VIEW-WRITEBACK-AUTHORITY — evidence merge

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `HIGH`
- Difficulty: `LOW`
- Size: `XS`
- Evidence: `HIGH`
- Risk: `MEDIUM`
- Dependencies: `NONE`
- Priority: `P0`
- Lifecycle: `ADOPTED`
- Source evidence merged: `f79c8989fe2e5630e2c85f4449a868ec069300c8`, `15cfa771a41e1ddc2dedf96a8ae6d3c683257d93`, `b69fafa9dd11a9b355edf0f058ecc458209336a5`, `856807a25b3145c59845713a0631a5e2fa22f309`.
- Benefit: plugin-facing hydrated asset lists remain compatible with V2/V3 APIs while only a list actually handed to that writer may replace the authoritative manifest-backed list; stale hydrated writes and lazy-shape writes are rejected instead of wiping assets.
- Conflict/risk: writer identity and handed-out snapshot freshness are correctness authorities; over-broad sharing can let one plugin overwrite another plugin's view, while over-strict checks can drop legitimate in-place edits.
- Validation need: V2/V3 parity, stale hydrate rejection, same-manifest multi-plugin isolation, in-place edit write-back, chaId identity, and lazy-shape non-destructive write tests.
- Follow-up: merge evidence into the existing invariant; do not create a duplicate idea.

### ASSET-RESOLUTION-EXACT-BEFORE-FUZZY-AUTHORITY

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `HIGH`
- Difficulty: `LOW`
- Size: `S`
- Evidence: `HIGH`
- Risk: `MEDIUM`
- Dependencies: `NONE`
- Priority: `P0`
- Lifecycle: `ADOPTED`
- Source evidence: `4a2a22f69f703d89f93385716b9456d2a5a9b578`, `98af2c48089521168777db996d1c6d11822eee15`.
- Benefit: exact asset identity across character/module/inline owners wins before fuzzy fallback, preventing a short module asset name from being captured by an unrelated character fuzzy match; content-addressed manifest-set caching also avoids repeated remote resolve round trips.
- Conflict/risk: precedence mistakes can silently display the wrong asset; cache keys must include all semantics that affect fuzzy matching and owner set identity.
- Validation need: exact module vs fuzzy character collision, inline exact vs fuzzy manifest hit, exact manifest precedence, legacy fallback ordering, cache miss caching, and fuzzy-distance cache-key variation.
- Follow-up: preserve exact-before-fuzzy owner precedence and content-addressed cache validity when resolver behavior changes.

## Lower-signal reviewed changes

The range also contains preset/UI/mobile-sortability diagnostics, context-budget UX, scrollbar polish, release/version work, and plugin-storage performance follow-ups. These were reviewed but did not require separate durable idea entries where they were local UI fixes or already covered by broader existing invariants.

## Cursor decision

Forward coverage for this range is complete enough to advance only the official PocketRisu cursor to `b8bbcbe065755379d33f74d6ad16a36d634917c1`. No other source cursor is changed by this record.

`HISTORICAL_BACKFILL_COMPLETE_THROUGH` is unchanged because this is forward monitoring, not all-source historical coverage.
