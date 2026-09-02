# Historical review — shared vector cache values are immutable

- Reviewed source: `PocketRisu/PocketRisu:develop`
- Source commit: `9ff600a2c754d9aa203da65e9e3b84c2ceadf3e7`
- Review date: 2026-09-02
- Historical only: yes; active forward cursor is unchanged.

## Finding

`HypaProcessorV2` previously took an object returned by the shared/persisted vector cache and assigned caller-specific `metadata` directly onto that object. The cache can return the same object reference to multiple consumers. A metadata-less query that reused the same cache key could therefore clear or replace metadata belonging to a previously stored summary vector, leaving downstream similarity-search code with a vector whose parent summary metadata no longer contained the expected text and causing a crash.

The adopted fix treats the cache result as shared immutable data and creates a caller-owned result object with `{ ...cached, id, metadata }` before inserting it into processor-local state. Current `develop` retains this copy-on-read boundary.

## Durable invariant

**SHARED-VECTOR-CACHE-RESULTS-ARE-IMMUTABLE**

A value returned from a cache whose object identity may be shared across callers must not be mutated with request-, query-, or owner-specific metadata. Consumers must derive a new local value before attaching contextual fields. Cache-owned vector payloads may be reused; caller-owned identity and metadata must remain isolated.

## Classification

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `HIGH`
- Difficulty: `LOW`
- Size: `XS`
- Evidence: `HIGH`
- Risk: `LOW`
- Dependencies: `NONE`
- Priority: `P0`
- Lifecycle status: `ADOPTED`
- Source evidence: official `PocketRisu/PocketRisu` commit `9ff600a2c754d9aa203da65e9e3b84c2ceadf3e7`; current `develop` still copies cached results before assigning `id`/`metadata`.
- Benefit: prevents cross-query metadata corruption and a demonstrated similarity-search crash while preserving cache reuse.
- Conflict/risk: unnecessary deep copies would waste memory; only the mutable caller-specific envelope needs to be copied unless vector payload mutability is later introduced.
- Validation need: regression test where two logical entries share a cache key but carry different/absent metadata; verify the second cache hit cannot alter the first processor-local result or parent-summary lookup. Preserve cache hit behavior and vector payload equality.
- Follow-up: preserve this invariant in future Hypa/cache refactors; audit any other shared object caches before attaching request-scoped fields.

## Guardrail check

No save/flush behavior, plugin reload semantics, service manager, Android notification behavior, device/runtime state, or storage migration is involved.
