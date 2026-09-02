# RisuBard forward review — 2026-09-03 06:38 KST

Reviewed `rpaddict/RisuBard:main` strictly forward from authoritative cursor `f86449ef643806d3ccbb8eec81d7f1ee46a6df6c` through `1c90eca110150350ba1551d3f800be5a903e54f2` (1 commit). No cursor moved backward.

## CURRENT-INPUT-DIRECT-RETRIEVAL-WINS-BOUNDED-TIES

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `MEDIUM`
- Difficulty: `LOW`
- Size: `S`
- Evidence: `MEDIUM`
- Risk: `LOW`
- Dependencies: a PocketRisu narrative-memory / lore retrieval boundary with explicit ranking and context-budget ownership
- Priority: `P1`
- lifecycle status: `HOLD`
- Source evidence: `rpaddict/RisuBard` `1c90eca110150350ba1551d3f800be5a903e54f2` (`v0.9.18`), especially Grimoire current-input direct-hit prioritization, multiword phrase matching, and unique-only entity hints into BardWiki.
- Benefit: prevents stale recent-context ties from consuming a bounded retrieval budget ahead of an exact key in the user's current input, while still allowing a separately owned canonical-memory lookup to use high-confidence entity hints.
- Conflict/risk: ranking constants, lore semantics, and BardWiki document taxonomy are source-specific; over-weighting direct hits can crowd out genuinely relevant context, and fuzzy entity resolution can hallucinate an identity.
- Validation need: deterministic tie cases under a hard retrieval budget; current-input exact hit versus stale recent-context hit; contiguous multiword phrase matching; ambiguous alias produces no canonical-memory hint; unique alias produces exactly one hint; total document/token caps remain unchanged.
- Follow-up: deduplicate into the existing narrative-memory grounding/retrieval family rather than porting RisuBard's taxonomy or score constants. Keep `HOLD` until PocketRisu has a matching retrieval owner; if that subsystem appears, draft a PocketRisu-native ranking contract before implementation.

### Evidence interpretation

`v0.9.18` fixes a concrete bounded-context failure: an older recent-context match could tie a key directly present in the newest user input, causing the current command to fall outside the fixed retrieval budget. The release explicitly gives the newest-input direct hit precedence, adds contiguous multiword-key recognition, and passes only uniquely resolved character aliases as a limited hint to canonical-memory lookup; ambiguous aliases fail closed. The same release states that retrieval document/token caps were not increased. This is useful evidence for an existing PocketRisu principle: **bounded retrieval should spend scarce context on the strongest current-turn evidence first, and cross-index identity hints must fail closed on ambiguity**.

## Overlay / failure-observability follow-up (dedupe)

The same release keeps the prior modal-layer rollback direction: BardWiki is placed below lorebook/editor/system-error surfaces rather than restoring a global dynamic stack, and failed reboot work is recorded in the BardWiki job log. This is additional evidence for the existing explicit overlay-ownership and durable job-failure observability lessons; no duplicate ideas were created.

## Autonomous progression records

- Ledger addendum: this file.
- Design/dossier: not created. The retrieval principle remains `HOLD` because PocketRisu lacks a matching owned narrative-memory retrieval boundary; the source-specific ranking constants and taxonomy are not safe port authority.
- Implementation branch/tests/personal PR: not created; lifecycle and dependency gates are not satisfied.

## Cursor / backfill

- Advance only `rpaddict/RisuBard:main` forward cursor to `1c90eca110150350ba1551d3f800be5a903e54f2`.
- Other Active sources checked in this run remained at their authoritative cursor HEADs.
- `HISTORICAL_BACKFILL_COMPLETE_THROUGH` is unchanged; this forward review does not prove additional complete historical coverage.
