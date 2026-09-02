# Narrative-memory rebuild checkpoint identity

Status: assistant-owned design draft for the existing `DESIGN_NEEDED` narrative-memory/recovery family.

## Problem / evidence

A future PocketRisu narrative-memory rebuild may need to process long chats in resumable batches and publish a rebuilt state only after staging succeeds. RisuBard already demonstrates the useful staging/checkpoint pattern, but forward commit `8f855433d169f6dfd089d6b4fc121e7a65e3e366` also demonstrates a harder failure mode: a checkpoint format can evolve while the logical source batch must remain exact. Its supported legacy form carried one synthetic first-message ID that current processing no longer includes. The implementation accepts that one known normalization but rejects/cleans a completed legacy checkpoint when the remaining source IDs or event groups no longer match.

Evidence level remains `MEDIUM`: the source implementation and focused tests are credible, but PocketRisu does not yet have the same narrative-memory rebuild subsystem.

## Minimal safe scope

Do not build a narrative-memory system from this draft alone. If PocketRisu later introduces a rebuild job, the first safe slice is only the recovery contract:

1. versioned checkpoint envelope;
2. deterministic logical source-batch identity;
3. explicit list of allowed legacy normalizations;
4. fail-closed mismatch handling;
5. idempotent cleanup/completion semantics.

No automatic content merge, canonical-document rewrite, destructive restore, or cross-chat recovery belongs in this slice.

## Ownership boundaries

- Chat/source ownership: the active source chat and the exact message/event grouping define the logical rebuild input.
- Recovery ownership: checkpoint metadata may preserve progress but never becomes more authoritative than current source identity.
- Staging ownership: partial rebuilt output remains isolated from live narrative-memory state until publish succeeds.
- Publish ownership: exactly one successful publish transition may make staged output live.
- Compatibility ownership: version adapters may normalize representation, but may not broaden the logical source identity they are allowed to represent.

## Proposed mechanism

Define a checkpoint envelope conceptually containing:

- schema/version;
- character/chat identity;
- logical source-batch fingerprint derived from ordered source message IDs plus ordered event/source groups;
- staged workspace/job identity;
- phase (`begun`, `receipt-recorded`, `published`, `complete`) or an equivalent monotonic state machine;
- optional compatibility metadata documenting the representation version that was normalized.

On recovery:

1. Parse and validate the envelope.
2. Normalize only explicitly recognized legacy representations into the current logical identity form.
3. Recompute the logical identity from the current requested source batch.
4. Reuse progress only if normalized checkpoint identity equals the requested identity.
5. If a completed/receipt-bearing legacy checkpoint no longer matches, delete/quarantine that stale recovery state and start fresh rather than replaying it.
6. For malformed or unknown-version state, fail closed and surface a diagnostic; never guess a mapping.

A compatibility adapter must be one-way, narrow, and tested with positive and negative fixtures. Do not use fuzzy matching, prefix matching, set equality that ignores order, or inferred message substitution.

## Compatibility / invariants

- Never reintroduce forced DB flush on `visibilitychange` / `pagehide`.
- Preserve `flushServerDbKeepalive()` as a no-op unless separately reviewed.
- Preserve existing PocketRisu save/integrity optimizations and targeted V3 plugin reload.
- No PM2 and no server-phone Android notifications.
- Recovery state is not live-state authority until publish succeeds.
- A checkpoint from another chat/character/source batch must never be reused.
- A representation-version migration must not silently widen accepted source identity.
- Completed stale receipts must not be replayed into a newer batch.
- Cleanup must be idempotent; retrying cleanup or completion cannot corrupt live state.
- Failure before publish leaves the old live state intact.

## Validation / acceptance

Required focused tests before any implementation can become `READY_TO_PORT`:

- exact current-format checkpoint resumes;
- one explicitly supported legacy fixture resumes after deterministic normalization;
- same IDs in a different order are rejected unless the rebuild algorithm explicitly defines order-insensitivity;
- source-message mismatch rejects reuse;
- event/source-group mismatch rejects reuse;
- character/chat mismatch rejects reuse;
- unknown checkpoint version fails closed with diagnostic;
- malformed checkpoint fails closed;
- completed stale legacy checkpoint is cleaned/quarantined and not replayed;
- unfinished compatible checkpoint can be safely retried according to the state machine;
- crash between begin and receipt leaves live state unchanged;
- crash between receipt and publish leaves live state unchanged;
- crash after publish but before cleanup is recoverable without double-publish;
- completion/cleanup is idempotent;
- no cross-chat or cross-session recovery bleed.

Acceptance requires all failure-path tests plus a manual restart simulation against a bounded test dataset.

## Risk / blast radius

Risk is `MEDIUM` because a bad recovery identity rule can publish stale derived memory or lose resumable work, but the blast radius is containable if staging never mutates live state before publish. The highest-risk failure is accepting a stale completed receipt as authoritative for a different source batch.

Keep recovery data isolated under a feature-owned namespace and log the exact reason a checkpoint was rejected or normalized.

## Rollback / fallback

The fallback is to disable resume compatibility and restart the rebuild from source while preserving the prior live narrative-memory state. Because staged output is not live until publish, reverting the recovery adapter must not require a destructive data migration.

If a version adapter misbehaves, remove that adapter and treat affected checkpoints as non-resumable rather than guessing a repair.

## Dependencies and PR decomposition

Dependencies remain unresolved, so lifecycle stays `DESIGN_NEEDED`:

1. PocketRisu must first have a concrete narrative-memory rebuild/staging subsystem or an equivalent feature boundary.
2. Its source-batch identity and publish authority must be specified.
3. Storage namespace and crash-recovery behavior must be inspectable and testable.

Suggested PR decomposition if those dependencies later exist:

- PR 1: pure checkpoint identity/fingerprint helpers + fixtures/tests only.
- PR 2: versioned recovery envelope and exact-match resume path.
- PR 3: one narrowly justified legacy adapter with negative fixtures.
- PR 4: operational diagnostics/cleanup hardening if needed.

Do not combine these with narrative-memory model prompts, canonical-document taxonomy, retrieval changes, or unrelated storage cleanup.

## Readiness decision

Remain `DESIGN_NEEDED`. The mechanism, invariants, validation, and rollback are now concrete, but the owning PocketRisu subsystem and publish/source identity dependencies do not yet exist or are not yet explicit. Therefore autonomous implementation is not authorized.
