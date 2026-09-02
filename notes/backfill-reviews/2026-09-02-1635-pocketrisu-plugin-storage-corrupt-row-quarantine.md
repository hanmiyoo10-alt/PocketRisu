# Historical review — plugin storage corrupt-row quarantine

Source: `PocketRisu/PocketRisu`
Commit: `167def7df98e8272dcb179a4e8b4451e29e32604`
Reviewed: 2026-09-02

## Finding

PocketRisu's externalized plugin storage already treats an unparseable persisted value as logically missing rather than letting one corrupt row crash the store. The review follow-up in `167def7df` exposed a second-order failure mode: the server index still lists the corrupt key, while the client removes it from its local readable index. Each periodic index refresh can therefore rediscover the same key and trigger the preload top-up to fetch and parse it again forever.

The adopted fix introduces a bounded local quarantine set for keys whose persisted payload failed to parse. Quarantined keys are excluded from `topUpMissing()` until a concrete repair signal occurs. A successful write to the key clears quarantine; a successful parse clears quarantine; if a refreshed server index no longer contains the key, quarantine is also cleared so a later recreation can be fetched normally.

Regression coverage verifies that one corrupt row is fetched once, subsequent index refreshes do not refetch it, healthy keys remain usable, and rewriting the corrupt key restores normal reads.

## Transferable invariant

**PLUGIN-STORAGE-CORRUPT-ROWS-ARE-QUARANTINED-UNTIL-REPAIR-SIGNAL**

A persistence layer that degrades malformed values to "missing" must not repeatedly retry an unchanged malformed durable value on every background reconciliation cycle. Retry suppression must be scoped to the exact key and must have explicit repair/revalidation exit conditions so quarantine cannot become a permanent false negative.

## Classification

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `MEDIUM`
- Difficulty: `LOW`
- Size: `XS`
- Evidence: `HIGH`
- Risk: `LOW`
- Dependencies: `NONE`
- Priority: `P1`
- lifecycle status: `ADOPTED`
- source evidence: official `PocketRisu/PocketRisu` commit `167def7df98e8272dcb179a4e8b4451e29e32604`, including focused regression test
- benefit: prevents periodic refetch/parse/log churn for known-corrupt plugin-storage rows while keeping healthy keys available and allowing repaired/recreated keys to recover automatically
- conflict/risk: quarantine that lacks precise invalidation can hide a remotely repaired key; never promote a parse failure to deletion authority
- validation need: preserve tests for one-fetch quarantine, healthy-key isolation, local rewrite recovery, remote disappearance/recreation recovery, and reset semantics
- follow-up: preserve this invariant when changing plugin-storage index refresh, preload, corruption handling, or multi-device reconciliation

## Dedupe boundary

This is not the same idea as fail-closed V2 preload activation or partial-write merge semantics. Those govern runtime activation and delete authority. This invariant governs retry ownership after a specific durable row is already known to be unreadable.

## Historical coverage

This review is one bounded slice only. It does not justify advancing `HISTORICAL_BACKFILL_COMPLETE_THROUGH`.
