# Historical review — shared vector cache copy-on-read

Source: `PocketRisu/PocketRisu:develop`
Reviewed commit: `9ff600a2c754d9aa203da65e9e3b84c2ceadf3e7` (2026-08-30)

## Finding

Hypa V2 reused `memoryVector` objects returned from a shared in-memory cache, then wrote request-local metadata directly onto that cached object. A later metadata-less query using the same cache key could therefore erase metadata used by a previously stored vector and crash similarity traversal when parent summary text was expected.

The adopted fix treats the shared cache entry as immutable/shared state: create a shallow request-owned copy and attach `id` / `metadata` to the copy before storing it in processor-local vectors or returning it to the caller.

The same commit also bounds embedding API error bodies before surfacing them to chat UI; that is a useful observability/privacy/UX guard but is secondary to the ownership invariant reviewed here.

## Transferable invariant

A cache that returns shared object references must not grant mutation ownership to consumers. Consumers that need request-, processor-, or caller-local metadata must copy or otherwise detach before mutation. Cache identity and consumer metadata identity are separate ownership domains.

This applies beyond Hypa embeddings to any shared decoded object cache, parsed manifest cache, request template cache, or memoized structured value.

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
- source evidence: `PocketRisu/PocketRisu@9ff600a2c754d9aa203da65e9e3b84c2ceadf3e7`
- benefit: prevents cross-consumer metadata corruption and downstream crashes while preserving cache hit behavior
- conflict/risk: copying must preserve the heavy immutable vector payload without accidentally deep-cloning large arrays or masking places that intentionally require shared mutation
- validation need: cache-hit regression where two consumers share the same cache key but attach different metadata; assert the cached object remains unchanged and earlier consumer metadata survives; preserve normal cache-hit semantics
- follow-up: preserve as an invariant for future cache optimization/refactors; no new implementation needed because official PocketRisu already contains the fix

## Guardrail check

No conflict with save/integrity, keepalive, V3 reload, runit/PM2, or server-phone notification guardrails. No forward cursor was moved during this historical review.
