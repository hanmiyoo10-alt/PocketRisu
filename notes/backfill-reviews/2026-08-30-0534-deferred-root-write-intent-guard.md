# Historical backfill review — deferred root write intent guard

Date: 2026-08-30
Source: `TripleHwang/RisuVault`
Reviewed commit: `a78d57b9564f65a8089170a6020d830b4a2142b6`
Active-source cursor: `5afa95a9379ef45ef8484617a5407726d14e5f2b` (unchanged; historical review only)

## Finding

RisuVault documents a concrete data-loss failure where a deferred root collection (`plugins`) was legitimately `undefined` before hydration, but the dirty-commit builder interpreted `undefined` as deletion. Because the root row owned cascaded plugin rows, startup timing alone could turn an unloaded value into permanent deletion.

The fix establishes a stronger invariant: **absence/unloaded state is not delete intent**. Deferred keys are write-gated until hydration has applied them; destructive removal of user-authored collections requires an explicit deletion request. The source also centralizes the deferred-key contract so client and server cannot silently drift.

## PocketRisu relevance

A bounded search of the current personal fork did not find a matching deferred-root write policy or the RisuVault-specific bootstrap/deferred-bootstrap owner. Therefore this is design evidence, not a direct port candidate. It should become actionable only if PocketRisu introduces or already contains a split hydration/write path where an unloaded root value can reach persistence as a delete.

## Classification

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `HIGH`
- Difficulty: `MEDIUM`
- Size: `S`
- Evidence: `MEDIUM`
- Risk: `HIGH`
- Dependencies: matching PocketRisu deferred/lazy root hydration owner + explicit delete-intent boundary + cascade/collection-loss regression tests
- Priority: `P1`
- Lifecycle: `DESIGN_NEEDED`
- Source evidence: `TripleHwang/RisuVault@a78d57b9564f65a8089170a6020d830b4a2142b6`
- Benefit: prevents unloaded/deferred collections from being misclassified as deletion and protects user-authored durable state from timing-dependent loss.
- Conflict/risk: write-policy mistakes can preserve stale data or delete live data; any implementation must be fail-safe and scoped to proven lazy/deferred owners.
- Validation need: reproduce an unloaded-before-hydration save attempt; prove it cannot emit DELETE/empty replacement; separately prove an explicit post-hydration delete still persists; verify client/server deferred-key contract cannot drift.
- Follow-up: keep design-only until a matching PocketRisu owner is identified. If identified, first slice is regression tests and an explicit write-intent type/guard before production behavior changes.

## Guardrails

This idea does not justify forced flushes, storage-format migration, PM2, Android notifications, or changes to `flushServerDbKeepalive()`. It must preserve current PocketRisu save/integrity behavior unless a concrete matching failure is reproduced.
