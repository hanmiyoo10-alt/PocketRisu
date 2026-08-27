# PocketRisu-Alter historical review — large-KV storage chunking

Source evidence: `PocketRisu-Alter/PocketRisu-Alter@32a7f50b44a335d96a7a458a1e06631d2ebc5027`
Forward cursor: unchanged at `128482ce9984a30ecb68834d561169846d068295`.

## Classification

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `HIGH`
- Difficulty: `HIGH`
- Size: `L`
- Evidence: `MEDIUM`
- Risk: `HIGH`
- Dependencies: PocketRisu persistence measurements, storage ownership review, compatibility/recovery plan
- Priority: `P2`
- Lifecycle status: `HOLD`
- source evidence: the source commit introduces deterministic content-addressed chunking for large opaque KV values and tests reconstruction, stable boundaries, bounded chunk sizes, and reuse after localized changes.
- benefit: may reduce write amplification and oversized-value pressure for very large persistent values.
- conflict/risk: changes persistent representation and would add reference, cleanup, integrity, backup, and recovery responsibilities. This is outside autonomous implementation gates.
- validation need: first measure PocketRisu large-value sizes, WAL/write amplification, memory pressure, and whether existing save optimizations already solve the observed cost. Any future design must prove exact reconstruction, safe publication, integrity failure behavior, cleanup safety, backup/restore compatibility, and rollback.
- follow-up: architecture evidence only. Reclassify to `DESIGN_NEEDED` only after a concrete PocketRisu bottleneck is measured; do not directly port source architecture.

## Deduplication

Related to existing save/storage optimization families, but distinct enough to preserve as separate architecture evidence because it changes persistent representation rather than only transport or dirty-domain ownership.

## Coverage

This bounded review does not prove complete source history. `HISTORICAL_BACKFILL_COMPLETE_THROUGH` remains unchanged.
