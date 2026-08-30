# Backfill review — large diff spread safety

- Reviewed: 2026-08-30
- Source: `Nagase-Kotono/PocketRisu-kotono`
- Source commit: `5c93fb9a6044b4baaaaffc9184c02ba197a44af3`
- Historical only: source commit predates active cursor `1fa0294df185910c45606dfd678c490b1793ebcb`; do not move the forward cursor backward.

## Finding

A character diff can legitimately contain enough JSON Patch operations to exceed JavaScript/V8 spread-argument limits. The source replaced `patch.push(...charPatch)` with iterative `patch.push(v)` and added a regression using a 30,000-entry lorebook whose front deletion shifts enough indexes to produce a very large patch. A second test verifies the emitted patch still round-trips through `applyPatch`.

Current `hanmiyoo10-alt/PocketRisu:develop` already contains the same iterative character-diff append and the source commit is present in its history, so this is an adopted invariant/history normalization rather than a port candidate.

## Classification

- Feature-ID: `SAVE-PATCH-LARGE-DIFF-ARGUMENT-SAFETY`
- System impact: `NO_SYSTEM_UPDATE`
- Importance: `HIGH`
- Difficulty: `LOW`
- Size: `XS`
- Evidence: `HIGH`
- Risk: `LOW`
- Dependencies: `NONE`
- Priority: `P0`
- Lifecycle: `ADOPTED`
- Source evidence: `Nagase-Kotono/PocketRisu-kotono@5c93fb9a6044b4baaaaffc9184c02ba197a44af3`; same commit exists in `hanmiyoo10-alt/PocketRisu` history.
- Benefit: prevents save/patch generation from throwing on very large character/lorebook diffs while preserving the exact operation sequence.
- Conflict/risk: iterative append must preserve operation ordering; future refactors must not reintroduce variadic append for unbounded patch arrays.
- Validation need: retain a large-diff regression and an `applyPatch` round-trip assertion.
- Follow-up: preserve as an invariant whenever patch aggregation or diff libraries are changed; no implementation branch or PR is needed because it is already adopted.

## Guardrail check

No DB flush lifecycle change, keepalive change, plugin reload change, service-manager/runtime change, Android notification behavior, storage migration, or destructive recovery behavior is involved.

## Backfill marker

This bounded review does not establish complete historical coverage for all active sources. `HISTORICAL_BACKFILL_COMPLETE_THROUGH` is unchanged.
