# Forward review — HaejeokRisuai explicit delete intent

Reviewed source: `nevaeh5379/HaejeokRisuai:main`

- Previous authoritative cursor: `866de33e1ed579f31d2ceba95a20cf626e9d2a99`
- Reviewed through: `d7796eb4960b54faa8b1fd8e1a77fa3b885e6377`
- Forward commits reviewed: `a7546449da7efce5fd9120c89dd6baccd908cd11`, `370a5c6d63ee0634c09f23fe06ac64cc4cd1b601`, `e0e82d94d180ffbb4189ce693a5355a44a3ad09a`, `5312b5d13be713b8639f5b6c04bd1ebbf60257f6`, `ed31f5795c6b394a1b8103fc4c85cfbbb3963e38`, `d7796eb4960b54faa8b1fd8e1a77fa3b885e6377`.

## Meaningful evidence

`ed31f5795c6b394a1b8103fc4c85cfbbb3963e38` replaces character deletion inferred from the complement of `characterIds` with an explicit `characterDeletes` list. The source commit states the reason directly: an incomplete sync payload must not be interpreted as proof that omitted characters were intentionally removed.

`d7796eb4960b54faa8b1fd8e1a77fa3b885e6377` extends the same ownership rule to chats with `chatDeletes`, removing chat/message manifest-complement pruning and leaving destructive mutation tied to explicit delete intent.

The preceding four commits are storage-code refactors/extractions without a distinct transferable behavior change, so they are cursor-reviewed but not promoted as separate ideas.

## Deduplication / classification

Merged into existing Feature-ID `PARTIAL-HYDRATION-PERSISTENCE-BOUNDARY`; do not create a duplicate idea.

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `HIGH`
- Difficulty: `MEDIUM`
- Size: `M`
- Evidence: `HIGH`
- Risk: `HIGH`
- Dependencies: PocketRisu current persistence/hydration ownership audit; no implementation until a partial/stub/incomplete collection can reach a write/delete boundary
- Priority: `P1`
- Lifecycle status: `DESIGN_NEEDED`
- Source evidence: `nevaeh5379/HaejeokRisuai@ed31f5795c6b394a1b8103fc4c85cfbbb3963e38`, `nevaeh5379/HaejeokRisuai@d7796eb4960b54faa8b1fd8e1a77fa3b885e6377`; consistent with earlier RisuVault evidence already recorded in the dossier
- Benefit: prevents silent deletion when a bounded/deferred/partial sync projection omits durable entities that still exist
- Conflict/risk: changing deletion protocol or persistence semantics can itself lose data; server/client compatibility and replace-all semantics must be explicit
- Validation need: prove whether PocketRisu has any complement-of-manifest, absence-means-delete, or incomplete-payload-to-delete path; test partial payload, intentional delete, empty authoritative collection, stale async hydration, and replace-all separately
- Follow-up: keep design-only until a concrete PocketRisu owner/hazard is reproduced; first implementation slice, if justified, must be a single bounded write/delete boundary with no storage migration

## PocketRisu inspection

Bounded code search in `hanmiyoo10-alt/PocketRisu` did not find the source protocol names `characterDeletes`, `chatDeletes`, `chatManifests`, or `messageManifests`. That is not proof the hazard is absent; it means this external SQL protocol must not be ported blindly. The transferable invariant remains: **absence in an incomplete projection is not destructive intent**.

## Autonomous progression

- ledger evidence merge: recorded in `notes/idea-ledger-addenda/2026-08-29-0541.md`
- design dossier: strengthened under `products/pocketrisu-helper-mod/docs/features/storage/partial-hydration-persistence-boundary/`
- implementation branch/tests/PR: not created; `Risk: HIGH` and destructive persistence semantics remain behind the design-only gate
- historical backfill marker: unchanged; this run is forward-only
