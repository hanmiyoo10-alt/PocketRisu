# Historical backfill — writer-lock unknown registration state

- Reviewed at: 2026-09-01 01:49 KST
- Source: `PocketRisu/PocketRisu`
- Source commit: `0164a35a48fd083e3eae5dda3b5a44ebd1693ad5`
- Feature-ID: `WRITER-LOCK-UNKNOWN-REGISTRATION-STATE`
- Backfill scope: bounded single-commit correctness slice; active forward cursor unchanged.

## Evidence

The writer-lock `peek(id)` path previously treated an unregistered non-active session as stale. On flaky mobile/VPN links, boot registration can fail independently while the session itself remains valid enough to continue. Marking that state stale caused focus-driven automatic reloads to repeat indefinitely. The adopted fix returns `unknown` when the boot registration is absent, while leaving the write-path lock enforcement intact; a genuinely unsafe write still receives the existing 423-style denial. The source commit adds a regression test covering missing registration, denied write, `unknown` peek, and recovery to `fresh` after registration arrives.

## Classification

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `HIGH`
- Difficulty: `LOW`
- Size: `XS`
- Evidence: `HIGH`
- Risk: `MEDIUM`
- Dependencies: `NONE`
- Priority: `P0`
- lifecycle status: `ADOPTED`
- source evidence: `PocketRisu/PocketRisu@0164a35a48fd083e3eae5dda3b5a44ebd1693ad5`
- benefit: prevents an unrecoverable focus/reload loop on flaky registration transport without weakening writer-lock data protection.
- conflict/risk: treating truly stale sessions as merely unknown would suppress a necessary reload; therefore only absence of registration evidence may map to `unknown`, and the authoritative write path must remain fail-closed.
- validation need: preserve the regression contract: unregistered non-active session => `unknown`; write attempt remains denied; successful later registration restores normal `fresh`/`stale` judgment; sessionless behavior remains unchanged.
- follow-up: preserve as a writer-lock invariant during future session/registration refactors; do not infer destructive/stale state from missing auxiliary registration evidence when the authoritative write guard can independently protect data.

## Deduplication

No existing ledger item found for writer-lock registration uncertainty or focus reload-loop prevention. This is distinct from ETag/revision freshness and from general retry bounds: it is an epistemic-state invariant for multi-session lock inspection.

## Historical coverage

This review does not advance `HISTORICAL_BACKFILL_COMPLETE_THROUGH`; only one bounded historical slice was reviewed.

## Discovery note

A bounded repository-search attempt was blocked by the GitHub integration's allowed-endpoint policy. This is recorded as an integration/discovery limitation only; it is not a code or CI failure and does not affect active-source cursors.
