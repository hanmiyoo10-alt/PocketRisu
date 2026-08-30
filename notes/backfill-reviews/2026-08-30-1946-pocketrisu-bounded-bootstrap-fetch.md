# Backfill review: bounded bootstrap fetch

Date: 2026-08-30
Source: `PocketRisu/PocketRisu:develop`
Evidence commit: `0afc8f9c82b21024cc8f8be672ee322f706dbcce`
Feature-ID: `BOUNDED-BOOTSTRAP-BEST-EFFORT-FETCH`

## Finding

PocketRisu fixed a boot-path liveness failure by wrapping non-essential boot-reminder/stat fetches in an `AbortController` timeout. Before this change, a stuck `/api/backup/boot-reminder` or `/api/db/stats` request could keep the loading screen blocked indefinitely. The calls are explicitly best-effort: timeout/unreachable failures skip the optional prompt/stats rather than preventing the application from becoming usable.

The current personal fork `hanmiyoo10-alt/PocketRisu:develop` still contains `fetchWithTimeout(..., 5000)` in `src/ts/bootstrap.ts`, so this is an already-adopted invariant rather than a port candidate.

## Classification

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `HIGH`
- Difficulty: `LOW`
- Size: `XS`
- Evidence: `HIGH`
- Risk: `LOW`
- Dependencies: `NONE`
- Priority: `P0`
- Lifecycle: `ADOPTED`
- Source evidence: `PocketRisu/PocketRisu@0afc8f9c82b21024cc8f8be672ee322f706dbcce`
- Benefit: prevents optional server-side boot checks from indefinitely blocking application readiness.
- Conflict/risk: timeout must stay limited to non-authoritative/best-effort boot work; it must not silently truncate required migrations, integrity checks, or durable writes.
- Validation need: preserve a regression case where the optional endpoint never resolves and assert boot proceeds after the bound; also verify timer cleanup and normal-success behavior.
- Follow-up: preserve as an invariant whenever bootstrap/network helpers are refactored; do not generalize the timeout to required recovery/migration work without separate review.

## Deduplication

No existing ledger record containing this source SHA was found. This is related to bounded retry/state-machine ideas, but it is a distinct boot liveness invariant: a non-essential request must have a finite wait budget and failure must degrade by omission, not by blocking readiness.

## Cursor handling

This is historical evidence older than the authoritative `PocketRisu/PocketRisu:develop` cursor `615b79df3375bf9db2924a8003f61a747721c725`. The forward cursor is not moved backward. `HISTORICAL_BACKFILL_COMPLETE_THROUGH` is unchanged because this bounded slice does not prove complete cross-source historical coverage.
