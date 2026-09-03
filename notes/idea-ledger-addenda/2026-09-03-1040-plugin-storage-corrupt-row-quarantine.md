# Idea ledger addendum — 2026-09-03 10:40 KST

## PLUGIN-STORAGE-CORRUPT-ROW-QUARANTINE

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `MEDIUM`
- Difficulty: `LOW`
- Size: `XS`
- Evidence: `HIGH`
- Risk: `LOW`
- Dependencies: `NONE`
- Priority: `P1`
- lifecycle status: `ADOPTED`
- Source evidence: official `PocketRisu/PocketRisu` commit `167def7df98e8272dcb179a4e8b4451e29e32604`, review follow-up to `127ca67f`; current `develop@278251f85a19bfdfd4cf3faae780e62682878f9e` retains the `unparseable` quarantine set in `src/ts/plugins/pluginStorageStore.ts`.
- Benefit: prevents a permanently malformed plugin-storage row from being re-fetched and re-parsed on every periodic index refresh/preload top-up, avoiding repeated network/CPU/log churn while preserving all readable plugin values.
- Conflict/risk: quarantine state must not become a permanent tombstone. A successful explicit write must clear quarantine immediately, and a refreshed server index that no longer lists the key must clear it so a later recreation can be read. The corrupt row is treated as missing locally; this must not authorize destructive deletion.
- Validation need: regression must prove (1) a corrupt row is fetched once, (2) repeated index refreshes do not fetch it again while the server index still lists it, (3) unrelated good rows remain readable, (4) a local rewrite clears quarantine and becomes readable, and (5) disappearance from the remote index clears quarantine so a later recreation is eligible for fetch.
- Follow-up: preserve this as an adopted plugin-storage invariant. Any future cache/index reconciliation refactor must keep parse-failure quarantine repairable and non-destructive; do not fold this into tombstones or ordinary cache eviction.

### Classification rationale

This is a small, localized retry-storm guard with direct focused regression evidence and low blast radius. It matters because periodic reconciliation turns a single malformed persistent row into unbounded repeated work unless parse failure has its own bounded, repairable state. It is distinct from generic retry caps, plugin-storage non-destructive merge, and cache eviction: the ownership rule is that **known-unparseable remote state may suppress automatic re-read, but may not claim deletion authority or suppress an explicit repair/recreation**.

### Historical-backfill marker

This review adds one bounded historical invariant only. It does not establish complete historical coverage for all tracked sources, so `HISTORICAL_BACKFILL_COMPLETE_THROUGH` is unchanged.
