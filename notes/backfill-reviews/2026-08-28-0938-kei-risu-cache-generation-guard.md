# Backfill review — Kei-Risu async cache generation guard

Date: 2026-08-28
Source: `tegy1117/Kei-Risu`
Reviewed evidence: `98a96cf2460b3df98869e848b5cc7ab51c7e8a52`

## Finding

This is not a new standalone idea. It strengthens the existing cache-lifecycle idea already represented by the Haejeok Hypa/query-cache work: asynchronous cache mutations must be clear/invalidation-safe and a stale detached completion must not resurrect state after a newer turn has superseded it.

Kei-Risu reproduced the same underlying failure in Gemini cachedContents wiring. A detached create/extend from an older turn could resolve after a newer turn had invalidated or removed the cache. A simple in-flight lock was insufficient because it could preserve the older lifecycle and drop the newer turn. The fix gives each cache key a monotonically increasing generation captured at turn start; detached post-response work may commit only while its generation is still current. A stale successful create removes its orphan remote cache, and the stale path is rejected before failure handling so an old 403 cannot disable the newest session. The source adds overlap reproduction tests.

## Shared classification — merged evidence

- `System impact`: `NO_SYSTEM_UPDATE`
- `Importance`: `HIGH`
- `Difficulty`: `LOW`
- `Size`: `S`
- `Evidence`: `HIGH` — now supported by independent Haejeok clear-race evidence plus a concrete overlapping-turn reproduction/fix in Kei-Risu
- `Risk`: `MEDIUM`
- `Dependencies`: explicit cache-key ownership and lifecycle boundary in the PocketRisu subsystem being changed; no generic global epoch
- `Priority`: `P0`
- lifecycle status: `DESIGN_NEEDED`
- source evidence: `tegy1117/Kei-Risu@98a96cf2460b3df98869e848b5cc7ab51c7e8a52`, merged with the existing Haejeok Hypa/query-cache clear-safe-epoch evidence
- benefit: prevents stale asynchronous completions from resurrecting invalidated cache state, overwriting newer state, or applying obsolete failure side effects
- conflict/risk: a global or overly broad generation can cancel unrelated keys/requests; orphan cleanup itself must be bounded and must not delete the newer owner’s resource
- validation need: deterministic overlap tests where old create/extend/failure resolves after a newer invalidate/create; newest generation must win, stale failures must not change current session state, and stale successful creates must not leak remote resources
- follow-up: reuse this epoch pattern only at a concrete cache owner after PocketRisu inspection; do not introduce a generic framework merely because the pattern exists externally

## Progression decision

No source implementation was started. Current PocketRisu does not have a confirmed matching Gemini cachedContents boundary, and the existing Hypa/cache idea is still conditional on the relevant Node retrieval/cache owner. The useful progression in this pass is evidence normalization: the shared clear-safe epoch mechanism moves to `Evidence: HIGH`, while remaining `DESIGN_NEEDED` until a concrete PocketRisu cache owner is in scope.

## Historical coverage

This bounded Kei-Risu review reached at least the 2026-06-14 history page inspected in this pass. It does not establish initial-history coverage and does not advance `HISTORICAL_BACKFILL_COMPLETE_THROUGH`.
