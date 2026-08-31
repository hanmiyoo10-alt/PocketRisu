# Historical backfill — explicit delete tombstones over omission inference

- Source: `nevaeh5379/HaejeokRisuai`
- Commit: `d7796eb4960b54faa8b1fd8e1a77fa3b885e6377`
- Reviewed as historical evidence only; active forward cursor is unchanged.

## Finding

The source replaced manifest-based chat pruning (`delete anything not present in the client manifest`) with an explicit `chatDeletes` collection. The protocol validates each explicit ID and storage backends delete only those identified rows. Message deletion was likewise already explicit by chat/id collection.

This establishes a reusable safety rule: **absence from a partial/sparse synchronization manifest is not, by itself, deletion authority**. Destructive removal should require an explicit tombstone/delete intent unless a separately proven full-replacement transaction owns the complete domain.

## PocketRisu relevance

PocketRisu has optimized save/patch behavior and must preserve data-integrity guardrails. Any future chat/message/entity partial-save protocol should avoid deriving destructive deletes from incomplete manifests or sparse payload omission. The source wire shape is evidence, not an automatic port target.

## Classification

- Feature-ID: `EXPLICIT-DELETE-TOMBSTONE-SEMANTICS`
- System impact: `NO_SYSTEM_UPDATE`
- Importance: `HIGH`
- Difficulty: `MEDIUM`
- Size: `S`
- Evidence: `MEDIUM`
- Risk: `HIGH`
- Dependencies: PocketRisu save/patch ownership audit; proof of which payloads are full-authority replacement vs partial updates; explicit delete/tombstone lifecycle and revision conflict semantics
- Priority: `P1`
- Lifecycle: `DESIGN_NEEDED`

## Benefit

Reduces accidental destructive deletion when a client sends a partial, stale, filtered, or asynchronously assembled manifest.

## Conflict / risk

Changing deletion semantics can leave intentional deletions unapplied or create orphan rows if explicit tombstones are not generated and retired correctly. Incorrect conflict/revision handling could also replay stale tombstones.

## Validation need

- Audit current PocketRisu chat/message/entity persistence paths for omission-derived deletion.
- Distinguish full-replacement snapshots from partial/patch commits.
- Regression-test partial payloads that omit live entities: omission must not delete them.
- Regression-test explicit delete intent: exact target is deleted, unrelated entities remain.
- Test stale revision/retry behavior so a tombstone cannot delete a newer replacement by identity confusion.

## Follow-up

Keep `DESIGN_NEEDED`. No production implementation is authorized until current PocketRisu deletion ownership is proven and rollback/compatibility semantics are concrete.
