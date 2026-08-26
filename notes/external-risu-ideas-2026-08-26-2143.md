# Risu idea watch addendum — 2026-08-26 21:43 KST

This addendum is durable evidence for the forward range `nevaeh5379/HaejeokRisuai` `4552f46e..f182716a`. It supplements `notes/external-risu-ideas.md` without replacing its existing history.

## NO_SYSTEM_UPDATE

### P1 — READY_TO_PORT — stale-safe generation telemetry
- Source: `nevaeh5379/HaejeokRisuai` `a0bfba7b6721057ff2714d58c81ecf95ba1c69ac`
- Importance: MEDIUM
- Difficulty: LOW
- Size: S
- Evidence: MEDIUM
- Risk: LOW
- Dependencies: NONE
- Benefit: generation elapsed time/token throughput can be observed without synchronous tokenization on every stream update; generation IDs reject late updates from superseded generations.
- Conflict/risk: a naive implementation could add tokenizer/main-thread work during streaming or show stats for the wrong chat after rapid switching.
- Validation: stale-generation/cancel/switch tests plus long-response main-thread measurement; tokenizer failure must degrade safely.
- Follow-up: assistant-owned design at `notes/designs/2026-08-26-generation-stats-stale-safe.md`.

### P3 — DESIGN_NEEDED — collapse linear runs in branch/timeline graph
- Source: `nevaeh5379/HaejeokRisuai` `9af3c809ded81c729b7eca979861a0d176c732ba`, `f182716aad9f616cc132119a951683cfc8bc654c`
- Importance: LOW
- Difficulty: MEDIUM
- Size: M
- Evidence: MEDIUM
- Risk: LOW
- Dependencies: branch/timeline ownership must exist first.
- Benefit: if PocketRisu later adopts in-chat branch timelines, very long histories can keep branch points visible while compressing non-branching runs, avoiding a graph node per message.
- Conflict/risk: currently downstream of the broader high-risk in-chat timeline architecture; graph UX must not become a reason to adopt that storage model prematurely.
- Validation: pure graph-builder tests for stable IDs, active-path detection, fork points and collapse ranges; large synthetic graph render benchmark.
- Follow-up: merge as supporting evidence into the existing in-chat timeline/branch item; do not implement independently yet.

### P2 — HOLD — reroll affordance for a trailing user turn
- Source: `nevaeh5379/HaejeokRisuai` `ddd77bfe8c50624b68a4f1558469cc5d84639932`
- Importance: LOW
- Difficulty: LOW
- Size: XS
- Evidence: MEDIUM
- Risk: LOW
- Dependencies: PocketRisu must first have/choose compatible branch-from-any-response semantics.
- Benefit: avoids a dead-end UI when a manual branch ends on a user message.
- Conflict/risk: behavior is tightly coupled to Haejeok's new branch timeline model and is not a standalone PocketRisu need yet.
- Validation: only revisit with branch architecture; test parent linkage and generated continuation ownership.

## SYSTEM_UPDATE_REQUIRED

No new candidates in this range.

## Forward review note
`9af3c809` is primarily UI extraction/graph interaction groundwork and is deduplicated into the branch graph item above. The active source cursor was advanced to `f182716aad9f616cc132119a951683cfc8bc654c` after reviewing all four commits in the range.

## Historical milestone
`HISTORICAL_BACKFILL_COMPLETE_THROUGH` unchanged; complete pre-2026-08-26 coverage is not yet proven for every active/historical-only source.
