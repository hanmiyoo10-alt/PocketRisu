# Forward review — HaejeokRisuai deferred plugin startup

- Source: `nevaeh5379/HaejeokRisuai:main`
- Reviewed range: `96bfd02f39544b56ab4243a8b6515f265c5290c2..46d5959862aec7a19d57e04e1721cea13222c038`
- New HEAD: `46d5959862aec7a19d57e04e1721cea13222c038`
- Meaningful evidence: `391c2574df6170dd91a5e68624ae8c9b5afb6be1`

## Finding

Commit `391c2574df6170dd91a5e68624ae8c9b5afb6be1` adds `plugins` to deferred startup settings so large plugin definitions/scripts are not eagerly loaded, while adding restore coverage proving plugin definitions and `pluginCustomStorage` survive Android SQLite replacement and RisuSave backup/restore. It also explicitly hydrates deferred standalone plugin keys before backup snapshots.

This is not a standalone new architecture for PocketRisu. It strengthens the existing deferred-startup / plugin-storage idea with a critical correctness invariant: **a domain may be omitted from the shallow startup object only if every operation requiring a complete logical snapshot explicitly hydrates that domain first.** Backup/export/restore cannot serialize the shallow in-memory projection as though it were complete.

## Classification merge

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `HIGH`
- Difficulty: `MEDIUM`
- Size: `M`
- Evidence: `MEDIUM`
- Risk: `HIGH`
- Dependencies: explicit PocketRisu deferred-domain ownership contract; complete-snapshot hydration boundary for backup/export/restore; plugin compatibility audit
- Priority: `P1`
- Lifecycle status: `DESIGN_NEEDED`
- Source evidence: `nevaeh5379/HaejeokRisuai@391c2574df6170dd91a5e68624ae8c9b5afb6be1`
- Benefit: reduce startup object-graph and parse/memory cost from large plugin definitions without silently omitting plugin data from backups or restores
- Conflict/risk: shallow state accidentally treated as authoritative can produce incomplete backups, destructive restore, missing plugin scripts, or pluginCustomStorage mismatch
- Validation need: large-plugin startup memory/latency measurement; backup round-trip from a shallow/deferred state; Android/native SQLite replacement; plugin enable/update/reload paths; legacy export/import compatibility
- Follow-up: keep implementation gated until PocketRisu has an explicit deferred-domain contract; use the helper design dossier as the ownership/acceptance boundary

## Other commits in range

The range also contains mobile navigation/UX work, provider model-field consistency fixes, provider request compatibility changes, and a Tauri capability addition. They were reviewed as forward traffic but did not justify a separate PocketRisu idea in this bounded pass. The Tauri filesystem capability change is system/runtime-surface work and is not an autonomous implementation candidate.

`HISTORICAL_BACKFILL_COMPLETE_THROUGH` is unchanged because this was a forward-only review.