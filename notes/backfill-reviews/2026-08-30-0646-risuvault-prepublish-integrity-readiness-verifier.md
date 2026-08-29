# Backfill review — InoriNatsume/RisuVault integrity readiness verifier

Reviewed historical source commit `InoriNatsume/RisuVault@1d0d352fa6d93ba88629e30089bf38accf2c0fd5` without moving the active forward cursor backward.

## Evidence

The source introduced a dedicated read-only `risuvault verify` primitive and made a successful verifier result mandatory before commit/publish. The verifier checks multiple independent invariants rather than trusting one metadata flag: on-disk naming/layout, actual decryptability of DB-mapped encrypted files, encrypted DB header expectations, absence of forgotten plaintext/unlocked cache state, required ignore rules, and disagreement between registry and on-disk project directories. A failed check exits non-zero and blocks the publish step.

The transferable idea is not the source crypto/storage format. It is the boundary: a durable export/publish/recovery artifact should have an explicit readiness verifier that independently inspects the state it is about to bless and fails closed when invariants disagree.

## PocketRisu relevance

PocketRisu already has several save/integrity and backup safety invariants, but a bounded search did not find an obvious single `verify backup integrity` owner in the personal fork. This therefore remains a design candidate rather than an implementation candidate.

Potential PocketRisu checks, if a matching owner is later confirmed, should be derived from existing architecture only: referenced durable stores/assets exist, manifest/revision identity is internally coherent, pending-write state is either drained or explicitly represented, and the verifier itself performs no repair or mutation.

## Deduplication

This is related to `BACKUP-SNAPSHOT-DURABLE-STORE-BARRIER` but is not the same mechanism. The barrier coordinates pending writers before snapshotting; this verifier independently validates the candidate state/artifact before it is treated as trustworthy. If both are pursued, they should compose in one backup/export pipeline rather than become competing implementations.

## Classification

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `HIGH`
- Difficulty: `MEDIUM`
- Size: `S`
- Evidence: `MEDIUM`
- Risk: `MEDIUM`
- Dependencies: PocketRisu backup/export authority map + explicit invariant inventory + non-mutating verification API + false-positive/false-negative failure tests
- Priority: `P1`
- Lifecycle: `DESIGN_NEEDED`

No production branch, code change, test run, or PR was created in this pass. The source is evidence only; no RisuVault crypto, SQLCipher, filesystem layout, or host/runtime dependency is proposed for PocketRisu.