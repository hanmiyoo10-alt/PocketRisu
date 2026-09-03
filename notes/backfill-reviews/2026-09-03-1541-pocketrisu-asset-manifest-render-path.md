# PocketRisu historical backfill — asset manifest render path

Reviewed bounded historical slice around `PocketRisu/PocketRisu` commit `f39114932c383da430c5d58d4a83366d107dbd98`.

## Finding

The v1.11 asset-manifest path had moved name resolution and manifest paging onto network-backed server routes. That made message first paint depend on remote round trips and sequential paging. Commit `f39114932c383da430c5d58d4a83366d107dbd98` restored a local-first render path by prefetching immutable/content-addressed manifests at chat entry, resolving names from the bounded local full-manifest cache when possible, coalescing overlapping prefetches, and retaining the server route only as cold-cache fallback.

This is distinct from general asset caching and from plugin snapshot hydration: its durable lesson is specifically that render-critical interpretation of prefetched immutable metadata should not reintroduce avoidable network authority on every parse.

Current `develop@278251f85a19bfdfd4cf3faae780e62682878f9e` still contains the local resolver and in-flight prefetch suppression, so classification is `ADOPTED`.

## Classification

- System impact: NO_SYSTEM_UPDATE
- Importance: HIGH
- Difficulty: MEDIUM
- Size: S
- Evidence: HIGH
- Risk: MEDIUM
- Dependencies: NONE
- Priority: P1
- lifecycle status: ADOPTED

## Coverage note

This was a bounded historical slice only. It does not establish complete reviewed coverage for every tracked source through a new date, so `HISTORICAL_BACKFILL_COMPLETE_THROUGH` must not advance from this review alone.
