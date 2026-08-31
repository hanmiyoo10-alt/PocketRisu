# Historical backfill — shared cache value mutation boundary

Date: 2026-09-01
Source: `PocketRisu/PocketRisu`
Source commit: `9ff600a2c754d9aa203da65e9e3b84c2ceadf3e7`
Reviewed branch: `develop`

## Finding

PocketRisu's Hypa vector cache returns shared object references. `HypaProcessorV2` used to assign per-call metadata directly onto a cached object and then reuse that same object in its instance vector map. A later metadata-less query that hit the same cache key could therefore overwrite/clear metadata belonging to the earlier consumer, eventually breaking similarity-search code that expected the parent summary metadata to remain present.

The adopted fix creates a caller-owned shallow copy (`{ ...cached, id, metadata }`) before attaching per-call identity/metadata. The cache remains an immutable shared value source from the caller's perspective.

## Normalized idea

Feature-ID: `SHARED-CACHE-VALUE-MUTATION-BOUNDARY`

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `HIGH`
- Difficulty: `LOW`
- Size: `XS`
- Evidence: `HIGH`
- Risk: `MEDIUM`
- Dependencies: `NONE`
- Priority: `P0`
- Lifecycle status: `ADOPTED`
- Source evidence: `PocketRisu/PocketRisu@9ff600a2c754d9aa203da65e9e3b84c2ceadf3e7`; direct code-level regression description and fix in `src/ts/process/memory/hypamemoryv2.ts`.
- Benefit: prevents cross-consumer cache contamination, metadata loss, and downstream Hypa similarity-search crashes while preserving cache reuse.
- Conflict/risk: indiscriminate cloning of very large cached payloads could increase allocation pressure; the invariant is specifically that mutable caller metadata/identity must not be written into a shared cached object. Use the narrowest copy/immutable-view boundary appropriate to the cached value.
- Validation need: regression test with two consumers sharing one cache key but different metadata requirements; verify the second metadata-less hit cannot alter the first consumer's stored vector metadata. Preserve cache-hit behavior and bounded memory characteristics.
- Follow-up: preserve as an invariant when changing Hypa/vector caches, persisted cache hydration, query coalescing, or other shared-object caches. Apply the same rule to other caches only after confirming they expose shared mutable references.

## Compatibility / guardrails

This is an application-level invariant and does not require OS/runtime/service changes. It does not alter PocketRisu save/flush behavior, `flushServerDbKeepalive()`, V3 targeted plugin reload, runit, or server-phone notification behavior.

## Backfill coverage

This review covers the identified commit only. It does not justify advancing `HISTORICAL_BACKFILL_COMPLETE_THROUGH`.
