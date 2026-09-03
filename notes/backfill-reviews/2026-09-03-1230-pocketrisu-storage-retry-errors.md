# Backfill review — bounded storage retry and actionable errors

Reviewed source: `PocketRisu/PocketRisu@e57c0435018646800566f2158fd1a9fa12caa9e2`.

Finding: storage requests gained a bounded transient-retry boundary and typed actionable errors. Retry is limited to transient gateway/network failures, while deterministic errors and aborts remain immediate. Aggregated chat-save failure includes the first concrete underlying error so operator-visible diagnostics do not erase the real cause.

Current-state check: the `StorageRequestError` / bounded retry boundary is still present on `PocketRisu/PocketRisu:develop@278251f85a19bfdfd4cf3faae780e62682878f9e`.

Deduplication: this is related to generic retry/fallback bounding, but it is kept as a storage-specific adopted invariant because persistence operations have stricter idempotency, diagnosability, and failure-surfacing requirements.

Classification: `NO_SYSTEM_UPDATE / HIGH / LOW / S / Evidence HIGH / Risk LOW / Dependencies NONE / P0 / ADOPTED`.
