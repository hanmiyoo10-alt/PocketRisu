# Forward review — HaejeokRisuai 05896367..398dcec0

Date: 2026-09-01
Source: `nevaeh5379/HaejeokRisuai:main`
Authoritative prior cursor: `05896367fdd2be7f2f42d41f87f97227fd4b1b11`
Reviewed through: `398dcec0de070c8e615b85015f3c9cb49a3e0e16`
Compare status: ahead by 6 commits; cursor advanced forward only.

## Meaningful evidence

### 1. Server-backed inlay authority — evidence merge, not a new port candidate

Source commit: `4ff4241d006afa389b33972edd4f4d5c55bd7fb3` (`feat(inlay): persist inlay assets on the node server`).

Haejeok moves inlay media from browser-only IndexedDB ownership to NodeStorage-backed durable server ownership for node deployments, while retaining bounded client caching, in-flight read dedupe, local fallback behavior on non-node platforms, and an idempotent local-to-server migration path.

PocketRisu current `develop` already has server-backed inlay storage (`src/ts/process/files/inlays.ts` at cursor `b8bbcbe065755379d33f74d6ad16a36d634917c1`) with NodeStorage ownership and a device-memory-aware LRU. Therefore this is deduplicated as corroborating external evidence for an already-ADOPTED invariant rather than a new implementation candidate.

Classification:
- System impact: `NO_SYSTEM_UPDATE`
- Importance: `HIGH`
- Difficulty: `MEDIUM`
- Size: `M`
- Evidence: `HIGH` (current PocketRisu implementation + independent maintained-family implementation)
- Risk: `HIGH`
- Dependencies: `NONE` for preserving the existing invariant; any future migration/change depends on explicit backup/restore and cache-ownership validation
- Priority: `P1`
- lifecycle status: `ADOPTED`
- source evidence: `nevaeh5379/HaejeokRisuai@4ff4241d006afa389b33972edd4f4d5c55bd7fb3`; PocketRisu current implementation at `b8bbcbe065755379d33f74d6ad16a36d634917c1`
- benefit: cross-device chat histories do not retain references to device-local-only inlay assets; bounded caches reduce memory pressure
- conflict/risk: storage authority changes can strand assets, break backup completeness, or create stale cache/overwrite behavior if semantics diverge
- validation need: preserve NodeStorage read/write/remove/list behavior, overwrite cache invalidation, backup inclusion, non-node fallback, migration idempotence, and bounded cache ownership
- follow-up: preserve as an invariant; no autonomous implementation because PocketRisu already contains the behavior and storage-architecture changes are high blast radius

### 2. Shared serialized store commit queue — merged into existing storage-architecture idea

Source commit: `1f130817631c5724e984b5ade3feb7b9b8247c49` (`refactor(stores): extract StoreCommitQueue for serialized writes`).

This replaces per-store ad-hoc promise chains/timers with a shared serialized commit queue and adds dirty/fingerprint tracking so unchanged module domains avoid expensive clone/stringify work. This is the same underlying idea already tracked as `Domain-specific stores with explicit dirty marking and serialized commits`; evidence is merged rather than duplicated.

Classification remains:
- System impact: `NO_SYSTEM_UPDATE`
- Importance: `HIGH`
- Difficulty: `HIGH`
- Size: `L`
- Evidence: raised/strengthened to `MEDIUM` by a concrete maintained-family implementation, but not reproduced in PocketRisu
- Risk: `HIGH`
- Dependencies: PocketRisu storage-ownership map, current patch/save integrity invariants, explicit failure/retry semantics
- Priority: `P2`
- lifecycle status: `DESIGN_NEEDED`
- source evidence merged: prior Haejeok/RisuAI storage commits plus `1f130817631c5724e984b5ade3feb7b9b8247c49`
- benefit: fewer duplicated serialization mechanisms, explicit write ordering, cheaper no-op flushes
- conflict/risk: queue abstraction can hide lost retries or reorder persistence; dirty flags/fingerprints can miss mutations; must not reintroduce forced lifecycle flushes
- validation need: injected transient failures, retained pending commits, ordering tests, no-op flush cost, mutation-surface coverage, pagehide/visibility guardrail checks
- follow-up: keep design-only; extract invariants/tests before architecture changes

### 3. Edited-message branching

Source commit `65586e9cc585fcd50cb8af73fc272ba17726dfa2` adds explicit branch creation when editing a chat message, with tests preserving the original branch. Useful UX, but this pass did not promote it to a distinct backlog item because it is feature semantics rather than a demonstrated PocketRisu correctness/performance gap and needs product-direction evidence first.

## Guardrail check

No reviewed change justifies forced DB flush on `visibilitychange`/`pagehide`, changing `flushServerDbKeepalive()`, PM2, Android notifications, or weakening targeted V3 plugin reload/save-integrity behavior.

`HISTORICAL_BACKFILL_COMPLETE_THROUGH` is unchanged because this was a forward review.
