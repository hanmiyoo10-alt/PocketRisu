# Historical backfill review — PocketRisu-Alter async cache generation ownership

- Reviewed source: `PocketRisu-Alter/PocketRisu-Alter`
- Source commit: `98a96cf2460b3df98869e848b5cc7ab51c7e8a52`
- Review type: bounded historical backfill; no forward cursor movement

## Finding

The Gemini cached-content integration had a post-response race: detached cache create/extend work from an older turn could complete after a newer turn had already invalidated or replaced cache state. A simple in-flight lock was insufficient because it could discard the newest turn instead of making the newest turn authoritative.

The source replaced that lock with a per-cache-key generation. Each participating turn increments the generation before its synchronous pre-request mutations. Detached post-response work captures the generation and may mutate durable/runtime cache state only while its generation is still current. A stale successful create is cleaned up as an orphan; stale failures are ignored before error policy runs, preventing an old 403 from disabling a newer working session.

This is a transferable concurrency invariant, not authority to copy the Gemini cache implementation.

## Classification

- Feature-ID: `ASYNC-CACHE-LATEST-GENERATION-WINS`
- System impact: `NO_SYSTEM_UPDATE`
- Importance: `MEDIUM`
- Difficulty: `LOW`
- Size: `XS`
- Evidence: `MEDIUM`
- Risk: `MEDIUM`
- Dependencies: a matching PocketRisu-owned provider/context-cache or detached post-response cache mutation owner; reproducible overlap path showing an older completion can mutate newer state
- Priority: `P1`
- Lifecycle status: `HOLD`
- Source evidence: `PocketRisu-Alter/PocketRisu-Alter@98a96cf2460b3df98869e848b5cc7ab51c7e8a52`; three overlap reproduction tests are described by the source commit
- Benefit: prevents stale async completions from resurrecting invalidated cache state, overwriting a newer turn, or applying obsolete failure policy to the newest session
- Conflict/risk: generation scope must match the true cache/session ownership key; wrong scoping can suppress valid work or leak orphan remote cache entries. Provider credential/session semantics are security-sensitive and must not be inferred from this source.
- Validation need: overlapping turns where old create/extend resolves after new invalidation; stale success orphan cleanup; stale 403/error must not disable current session; newest completion wins; generation reset/test isolation; no cross-chat/provider/credential key collision
- Follow-up: keep as an invariant until PocketRisu owns a comparable detached provider-cache lifecycle. If that owner appears and the race is reproducible, first slice is one failing overlap regression test plus one per-owner generation guard.

## PocketRisu applicability check

A bounded code search in `hanmiyoo10-alt/PocketRisu` found no `cachedContents` owner. Therefore there is no safe autonomous implementation candidate in the current fork and no branch/PR was created.

## Guardrail check

No DB flush, keepalive, plugin reload, service manager, Android notification, device package, storage migration, or destructive data behavior is involved in this historical review.

## Backfill coverage

This is one bounded historical slice from a single source. It does not establish complete reviewed coverage for all tracked sources, so `HISTORICAL_BACKFILL_COMPLETE_THROUGH` is unchanged.
