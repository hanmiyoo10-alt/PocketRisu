# BOUNDED-ENTITY-HANDOFF-UNIQUE-RESOLUTION

- System impact: NO_SYSTEM_UPDATE
- Importance: MEDIUM
- Difficulty: LOW
- Size: S
- Evidence: MEDIUM
- Risk: LOW
- Dependencies: an explicit PocketRisu narrative-memory/retrieval boundary that can consume entity hints without copying source-specific BardWiki architecture
- Priority: P1
- Lifecycle status: DESIGN_NEEDED

## Source evidence

- `rpaddict/RisuBard@a97c0d8afddee16d40590ed2b1c3c2e1b3958730` (`release: v0.9.20`), plan and implementation evidence for Grimoire–BardWiki entity handoff.
- The source passes only bounded, typed character identity metadata (`name`/aliases), not lore body or generated summary text, into retrieval.
- Source limits are explicit: at most 12 hints, at most 16 names per hint, and at most 128 characters per name.
- Resolution is exact-normalized against eligible active character page titles/aliases and accepts a candidate only when exactly one page matches; ambiguous aliases select nothing.
- Resolved direct candidates still obey the existing document-count and token budgets.

## Expected PocketRisu benefit

A PocketRisu retrieval/memory subsystem could connect model-visible character selection to canonical memory without injecting large lore bodies into the retrieval query. Metadata-only hints reduce prompt duplication, while unique-match-only resolution prevents ambiguous aliases from silently pulling the wrong character memory.

## Main risk / conflict

The source mechanism is tied to RisuBard's Grimoire/BardWiki architecture. PocketRisu must not copy that architecture wholesale or let hint metadata become a new unbounded prompt channel. Fuzzy or multi-match resolution would expand the blast radius and must remain out of the minimal slice.

## Validation need

Before implementation, identify the PocketRisu retrieval boundary and prove with focused tests that: (1) hint count/name length are bounded before transport, (2) lore body/summary text never enters the hint payload, (3) unique exact alias/title matches select the intended entity, (4) ambiguous aliases select none, (5) inactive/ineligible entities cannot be selected, and (6) the existing document/token budget remains the final authority.

## Follow-up

Maintain an assistant-owned design dossier at `products/pocketrisu-helper-mod/docs/features/memory/bounded-entity-handoff-unique-resolution/DESIGN.md`. Keep lifecycle `DESIGN_NEEDED` until PocketRisu has a concrete owning retrieval interface and acceptance tests. Do not implement merely because the RisuBard source is complete.
