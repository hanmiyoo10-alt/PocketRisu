# RisuBard forward review — 2026-09-03 03:36 KST

Reviewed `rpaddict/RisuBard:main` strictly forward from authoritative cursor `d81bb1fa171dbaf9a8d032263de280769313294a` through `f86449ef643806d3ccbb8eec81d7f1ee46a6df6c` (3 commits). No cursor moved backward.

## NARRATIVE-MEMORY-REBUILD-CHECKPOINT-IDENTITY

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `HIGH`
- Difficulty: `MEDIUM`
- Size: `M`
- Evidence: `MEDIUM`
- Risk: `MEDIUM`
- Dependencies: a future PocketRisu narrative-memory rebuild boundary; explicit checkpoint version/source-identity contract; staging/publish ownership from the existing rebuild design
- Priority: `P1`
- lifecycle status: `DESIGN_NEEDED`
- Source evidence: existing RisuBard staging/reboot evidence `3ae4501b`; forward commit `8f855433d169f6dfd089d6b4fc121e7a65e3e366`; release/finalization `f86449ef643806d3ccbb8eec81d7f1ee46a6df6c`
- Benefit: resumable long-running rebuilds can survive an intentional checkpoint-format evolution without either discarding compatible work or replaying a stale completed receipt against different source messages/event groups.
- Conflict/risk: compatibility matching that is too broad can silently reuse stale recovery state; matching that is too strict can throw away safe resumable work. Completed legacy checkpoints are especially dangerous because they can look authoritative after the client has already advanced to a different batch.
- Validation need: prove exact current-format match; one explicitly supported legacy-normalization path; event-group/source mismatch rejection; completed stale checkpoint cleanup; unfinished compatible legacy checkpoint handling; idempotent completion/removal; crash/restart between begin, receipt, publish, and cleanup.
- Follow-up: merged into the existing narrative-memory/recovery family rather than creating a duplicate feature. Assistant-owned design draft: `notes/design-drafts/narrative-memory-rebuild-checkpoint-identity.md`. Keep `DESIGN_NEEDED`; no implementation until a PocketRisu rebuild subsystem exists and its persistence/publish authority is explicit.

### Evidence interpretation

`8f855433...` adds a narrow compatibility rule for an older checkpoint shape that carried an extra synthetic first-message source ID. It accepts that legacy shape only when the remaining source IDs and event groups still match. A completed legacy checkpoint whose source/event identity no longer matches is deleted and not reused. This strengthens the existing staging/rebuild idea with a durable rule: **checkpoint format compatibility is not checkpoint identity compatibility**. Version normalization may be allowed, but reuse authority remains tied to the exact logical source batch.

## CANON-DUPLICATE-DIAGNOSTICS-ARE-NON-MUTATING-AND-BOUNDED

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `MEDIUM`
- Difficulty: `LOW`
- Size: `S`
- Evidence: `MEDIUM`
- Risk: `LOW`
- Dependencies: only relevant if/when PocketRisu adopts canonical narrative-memory documents
- Priority: `P1`
- lifecycle status: `HOLD`
- Source evidence: `0f87726f4cd16892e3a9d68228889da9de6e7829`, finalized in `f86449ef643806d3ccbb8eec81d7f1ee46a6df6c`
- Benefit: duplicated long-form canon can be surfaced before retrieval context and model-written state drift, without an automatic repair path that risks deleting or merging valid user content.
- Conflict/risk: exact/normalized prose duplication is only a heuristic; automatic merging would be unsafe and false positives are possible.
- Validation need: deterministic normalization; ignore headings/short boilerplate/link-only blocks; pair dedupe; hard output cap; prove diagnostics never mutate, merge, delete, or rewrite documents; preserve retrieval document/token budgets.
- Follow-up: evidence merged into existing narrative-memory canonical-ownership/compression ideas. Keep as `HOLD` until PocketRisu has an equivalent canonical-document layer; do not port RisuBard document taxonomy wholesale.

## Overlay regression follow-up (dedupe)

Forward finalization `f86449ef643806d3ccbb8eec81d7f1ee46a6df6c` adds an explicit opt-in `top` tier for a confirmation that must appear above the BardWiki dock. This is additional evidence for the existing `GLOBAL-DYNAMIC-MODAL-LAYER-STACK-IS-NOT-SAFE-AUTHORITY` regression lesson: fix exceptional ownership with a narrow explicit tier, not by restoring global DOM-observer ordering. No new duplicate idea was created.

## Cursor / backfill

- Advance only `rpaddict/RisuBard:main` forward cursor to `f86449ef643806d3ccbb8eec81d7f1ee46a6df6c`.
- Other Active sources checked in this run remained at their authoritative cursor HEADs.
- `HISTORICAL_BACKFILL_COMPLETE_THROUGH` is unchanged; this forward review does not prove additional complete historical coverage.
