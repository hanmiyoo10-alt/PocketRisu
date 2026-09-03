# STORAGE-TRANSIENT-RETRY-ACTIONABLE-ERRORS

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `HIGH`
- Difficulty: `LOW`
- Size: `S`
- Evidence: `HIGH`
- Risk: `LOW`
- Dependencies: `NONE`
- Priority: `P0`
- lifecycle status: `ADOPTED`

Source evidence: `PocketRisu/PocketRisu@e57c0435018646800566f2158fd1a9fa12caa9e2`; retained on `develop@278251f85a19bfdfd4cf3faae780e62682878f9e`.

Benefit: bounded retry for transient storage/network failures improves save/import reliability while preserving immediate failure for deterministic errors and surfacing the concrete cause.

Conflict/risk: retries must stay hard-bounded and limited to operations with safe retry semantics; aborts and non-transient failures must not be retried.

Validation need: preserve tests for transient recovery, hard attempt cap, immediate non-transient failure, and concrete error propagation through save aggregation.

Follow-up: `ADOPTED`; preserve as a storage/save invariant during future storage wrapper or save-path refactors.
