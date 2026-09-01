# PocketRisu historical review — blocked send feedback preserves serialization

- Reviewed source: `PocketRisu/PocketRisu:develop`
- Source commit: `ab77ae215b880c14dd0d86826efc256ace5eac4b`
- Review type: bounded historical backfill
- Forward cursor impact: none; do not move any Active-source cursor backward.

## Finding

`sendMain()` intentionally keeps the global `doingChat` serialization guard because the downstream send path reads current-chat state at request time. Relaxing that guard to permit another live send could cross-contaminate chat/model/trigger state. The bug fixed by this commit was instead that a blocked send silently returned, making an active or stuck generation—especially in another chat—look like a dead Send button.

The adopted fix leaves the safety guard intact and adds bounded explanatory feedback. It distinguishes this-chat versus other-chat generation, throttles repeated Enter-key reentry, and suppresses the informational toast while another modal/alert owns the notification surface so it does not clear unrelated blocking UI.

## Normalized idea

Feature-ID: `BLOCKED-SEND-FEEDBACK-PRESERVES-SERIALIZATION`

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `MEDIUM`
- Difficulty: `LOW`
- Size: `XS`
- Evidence: `HIGH`
- Risk: `LOW`
- Dependencies: `NONE`
- Priority: `P1`
- lifecycle status: `ADOPTED`
- source evidence: `PocketRisu/PocketRisu@ab77ae215b880c14dd0d86826efc256ace5eac4b`
- benefit: prevents a deliberately serialized send path from appearing dead while retaining the concurrency boundary that protects request-time current-chat reads.
- conflict/risk: feedback must not weaken the guard, spam on key-repeat, misidentify ownership, or steal/clear a higher-priority modal or wait alert.
- validation need: preserve tests or manual checks for same-chat blocked send, other-chat blocked send, repeated Enter throttling, active modal suppression, and proof that a second live send still cannot enter while the first owns the global generation boundary.
- follow-up: preserve as an adopted invariant whenever generation ownership, background generation, per-chat job tracking, or notification surfaces are refactored; do not treat the UX symptom as justification to remove serialization without first changing downstream ownership semantics.

## Durable invariant

When an operation is intentionally rejected by a correctness/concurrency guard, make the rejection observable without weakening the guard. Feedback should identify the blocking owner when practical, be rate-bounded, and respect higher-priority UI ownership.

## Backfill coverage

This review covers one bounded historical commit only. It does not justify advancing `HISTORICAL_BACKFILL_COMPLETE_THROUGH`.
