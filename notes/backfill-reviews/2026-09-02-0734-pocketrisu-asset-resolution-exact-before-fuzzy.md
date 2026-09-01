# Historical backfill: exact asset resolution before fuzzy fallback

- Reviewed: 2026-09-02
- Source: `PocketRisu/PocketRisu:develop`
- Source commit: `4a2a22f69f703d89f93385716b9456d2a5a9b578`
- Review mode: bounded historical backfill; forward cursors unchanged

## Finding

PocketRisu v1.11.0's lazy asset-manifest resolver queried the character manifest first with fuzzy matching and only queried module manifests for names left unresolved. That ordering allowed a fuzzy character near-match to shadow an exact module asset. Commit `4a2a22f6` changed the resolution contract so character and module owners are evaluated together: exact matches across every owner are resolved before fuzzy fallback is permitted.

The same commit also memoizes answers and misses per manifest set. Because the manifest identifiers are content-addressed, the cache key changes when manifest content changes, making cached misses safe within that ownership boundary while avoiding repeated remote round trips during message parsing/background embedding.

## Classification

- Feature-ID: `EXACT-ASSET-RESOLUTION-PRECEDES-FUZZY-FALLBACK`
- System impact: `NO_SYSTEM_UPDATE`
- Importance: `MEDIUM`
- Difficulty: `LOW`
- Size: `XS`
- Evidence: `HIGH`
- Risk: `LOW`
- Dependencies: `NONE`
- Priority: `P1`
- Lifecycle status: `ADOPTED`
- Source evidence: official PocketRisu commit `4a2a22f69f703d89f93385716b9456d2a5a9b578`; regression test in `server/node/assetManifestStore.test.ts` covers exact module hits that are fuzzy-near character names.
- Benefit: prevents wrong asset substitution when multiple manifest owners overlap and keeps lazy-manifest resolution deterministic; the content-addressed answer/miss cache also removes repeated resolve latency for unchanged manifest sets.
- Conflict/risk: fuzzy fallback remains useful for character assets, so the invariant is ordering rather than disabling fuzzy matching. Any future owner-priority rule must not regain authority to shadow an exact match. Cache safety depends on the manifest-set identity remaining content-sensitive.
- Validation need: preserve a regression fixture with a character fuzzy near-match and an exact module match, plus a true no-exact-match case that still exercises character fuzzy fallback. If cache identity changes, verify positive and negative cache invalidation against manifest replacement.
- Follow-up: preserve as an adopted invariant when changing asset-manifest ownership, parser resolution, cache keys, or adding new manifest owner kinds. No autonomous implementation is needed because the source is current PocketRisu history and the fix/tests are already adopted.

## Dedupe / ownership boundary

This is not the same as lazy descriptor deletion guards, orphan-reference discovery, or blob URL lifetime. Those protect persistence/reference/lifetime boundaries. This invariant protects **name-resolution precedence across multiple asset owners**: exact identity has higher authority than approximate matching, independent of owner traversal order.

The memoization change is retained as supporting evidence rather than a separate backlog item because it was introduced in the same resolver boundary and does not create an independent PocketRisu port candidate.

## Backfill marker

This review covers one bounded historical slice only. It does not establish complete reviewed coverage for all tracked sources through a new date, so `HISTORICAL_BACKFILL_COMPLETE_THROUGH` must not advance from this review alone.
