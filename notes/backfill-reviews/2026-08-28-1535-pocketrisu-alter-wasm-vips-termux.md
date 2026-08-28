# Backfill review — PocketRisu-Alter wasm-vips / Termux portability

Date: 2026-08-28
Source: `PocketRisu-Alter/PocketRisu-Alter`
Historical commit: `fba9a53a0d85492219b66223f8f243e05f789c23` (2026-05-15)

## Finding

The Alter commit replaced the Node `sharp` image dependency with `wasm-vips` as part of a Termux/Android-arm64 compatibility slice. The relevant portable lesson is narrower than “support Termux”: keep server-side image processing on a dependency whose runtime/ABI assumptions fit the supported self-host targets, and lazily initialize the WASM runtime so failed initialization can be retried instead of poisoning process-global state.

Current `hanmiyoo10-alt/PocketRisu:main` already carries the same architectural choice: `package.json` depends on `wasm-vips` and `server/node/server.cjs` imports `wasm-vips` behind a retryable lazy `getVips()` promise. Therefore this historical idea is not a port candidate; it is an already-adopted deployment/runtime invariant worth preserving.

## Classification

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `MEDIUM`
- Difficulty: `LOW`
- Size: `XS`
- Evidence: `HIGH`
- Risk: `MEDIUM`
- Dependencies: `NONE`
- Priority: `P1`
- Lifecycle: `ADOPTED`
- Source evidence: `PocketRisu-Alter/PocketRisu-Alter@fba9a53a0d85492219b66223f8f243e05f789c23`; current personal PocketRisu `package.json` and `server/node/server.cjs`
- Benefit: preserves Android/Termux/self-host portability and avoids a native-image ABI dependency that can fail on constrained or unusual hosts.
- Conflict/risk: WASM image-processing parity/performance can differ from native libraries; future refactors must not silently reintroduce a native-only dependency without target-runtime validation.
- Validation need: keep server image-transform coverage across supported formats and verify lazy initialization failure/retry behavior if this boundary is touched.
- Follow-up: preserve as an invariant; no implementation branch or PR is needed in this run.

## Backfill coverage

This bounded pass establishes reviewed Alter history at least through 2026-05-15 for this portability slice. It does not prove complete history coverage for every tracked source, so `HISTORICAL_BACKFILL_COMPLETE_THROUGH` must not advance.
