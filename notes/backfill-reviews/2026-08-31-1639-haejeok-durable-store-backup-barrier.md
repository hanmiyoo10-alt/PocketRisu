# Historical backfill review — Haejeok durable-store backup barrier

Source: `nevaeh5379/HaejeokRisuai`
Reviewed commit: `16b94415ece3fa4306d6eee2bf1debb97d8f7844`
Mode: bounded historical backfill; active forward cursor unchanged.

## Finding

Commit `16b94415ece3fa4306d6eee2bf1debb97d8f7844` introduces a shared `DurableStore` contract exposing `flush()` and `hasPendingWrites()` across character, message, persona, and module stores. It also extends the local-backup guard so backups are blocked while persona or module writes remain pending.

This is not a new idea. It materially strengthens existing `BACKUP-AUTHORITATIVE-STORE-DURABILITY-BARRIER` evidence from `4342d6c38015c3a8a63c8597245476297671a163`: the source moved from an ad-hoc list of stores toward an explicit participation contract that can reveal whether a domain has unresolved durable state before snapshot creation.

## Classification

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `HIGH`
- Difficulty: `MEDIUM`
- Size: `M`
- Evidence: `HIGH`
- Risk: `MEDIUM`
- Dependencies: PocketRisu backup/export ownership audit; authoritative dirty-domain inventory; canonical save/flush ordering; server revision visibility proof
- Priority: `P1`
- lifecycle status: `DESIGN_NEEDED`
- Source evidence: `nevaeh5379/HaejeokRisuai@4342d6c38015c3a8a63c8597245476297671a163`, strengthened by `16b94415ece3fa4306d6eee2bf1debb97d8f7844`
- Benefit: reduces silent omission risk by making backup participation and pending-write state explicit instead of relying on a manually remembered flush list.
- Conflict/risk: blindly copying Haejeok's store hierarchy would conflict with PocketRisu's different browser/server persistence ownership; a false `hasPendingWrites() == false` is especially dangerous because it can certify an inconsistent backup.
- Validation need: prove every backup-bearing owner participates; inject pending writes per domain; assert backup is refused or awaits durability; prove exported revision is not older than the completed barrier.
- Follow-up: keep design-only until PocketRisu ownership audit establishes the canonical barrier participants and revision semantics. Treat explicit participation/dirty-state introspection as a design requirement, not a mandate to port the `DurableStore` class.

## Backfill coverage

This review covers a bounded historical slice only. It does not justify advancing `HISTORICAL_BACKFILL_COMPLETE_THROUGH`.
