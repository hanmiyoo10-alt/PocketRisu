# Haejeok forward review — 2026-09-02 18:44 KST

Reviewed `nevaeh5379/HaejeokRisuai:main` strictly forward from authoritative cursor `65838a46c9813c420fd0c6de097f1dd3e478f9e1` through `b16374e7b8b84854b39a4ff2ca6237a1f9a5251a`.

## SAVE-ACTIVITY-INDICATOR-COUNTS-OUTSTANDING-DURABLE-WRITES

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `MEDIUM`
- Difficulty: `LOW`
- Size: `XS`
- Evidence: `MEDIUM`
- Risk: `LOW`
- Dependencies: PocketRisu must first have more than one independently queued/concurrent durable-write lifetime not already covered by its current single `saveInFlight` ownership boundary.
- Priority: `P1`
- lifecycle status: `HOLD`
- source evidence: `nevaeh5379/HaejeokRisuai` `c903f4552c21efb31e790c6ba1cb9148a85929f5`, merged by `b16374e7b8b84854b39a4ff2ca6237a1f9a5251a`.
- benefit: A user-visible saving indicator remains active until every queued durable write has settled instead of turning false when only one write finishes. The source implementation uses an idempotent begin/finish token backed by an outstanding-save count and regression-tests queued writes plus failure cleanup.
- conflict/risk: Current official PocketRisu `278251f85a19bfdfd4cf3faae780e62682878f9e` serializes its primary save through one shared `saveInFlight` promise and owns `saving.state` around that lifetime, so copying Haejeok's SQL-specific coordinator would add unnecessary state today. The transferable invariant is lifetime accounting, not the source architecture.
- validation need: If PocketRisu later introduces an additional queued/concurrent durable-write path, add tests proving the indicator is true from first accepted write until the final outstanding write settles, remains true when an earlier queued write finishes, and returns false after both success and failure. Ensure finish tokens are idempotent and cannot underflow the count.
- follow-up: Keep `HOLD` until a second independent durable-write lifetime exists. At that point inspect all save ownership paths and prefer one shared activity tracker rather than multiple booleans.

## Deduped forward evidence — preset source of truth

`a3aa2519d7962c845e01e8645866f8879ad0d10d`, merged by `f598fef71c29c703961464dd63dfd0d3ca08f1ea`, changes prompt-template validation to consume `presetStore.state.promptTemplate` rather than the old settings/database-shaped state and adds focused tests. This is the same underlying source-of-truth migration lesson already observed in Haejeok's preset-store/fallback-model fixes, not a new PocketRisu idea. No duplicate lifecycle item was created.

## Cursor decision

All commits after `65838a46c9813c420fd0c6de097f1dd3e478f9e1` through merge HEAD `b16374e7b8b84854b39a4ff2ca6237a1f9a5251a` were reviewed. Advance only the Haejeok forward cursor to `b16374e7b8b84854b39a4ff2ca6237a1f9a5251a`. No historical-backfill coverage marker changes are justified by this forward-only review.
