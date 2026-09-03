# PLUGIN-STORAGE-PENDING-WRITE-READ-YOUR-WRITES

- Lifecycle: `ADOPTED`
- Feature-ID: `PLUGIN-STORAGE-PENDING-WRITE-READ-YOUR-WRITES`
- System impact: `NO_SYSTEM_UPDATE`
- Importance: `HIGH`
- Difficulty: `LOW`
- Size: `XS`
- Evidence: `HIGH`
- Risk: `MEDIUM`
- Dependencies: `NONE`
- Priority: `P0`
- Source evidence: `PocketRisu/PocketRisu@83ffa0474abd013581c4df23e50b20c559d4b47a`; preservation verified at reviewed tip `ca09a80746e74e5334145e5e78af47ce423e0eba`.
- Benefit: preserves synchronous-style plugin storage compatibility after storage externalization: a caller that performs `setItem`/remove and immediately reads the same key, or asks `snapshotAll()`, observes the newest local intent even while the server write is still in flight.
- Conflict/risk: pending state must not become an independent authority after failure, clear, or a newer write. Pending remove must read as missing; pending set must expose exactly the newest queued bytes/value; later rollback/token ownership rules still decide final cache/server convergence.
- Validation need: in-flight set then immediate get; in-flight remove then immediate get; snapshot during held write; same-key set→remove ordering; failed write rollback; newer-write token ownership; clear epoch interaction; malformed pending bytes fail closed.
- Follow-up: preserve as an invariant when changing plugin-storage queue/cache/snapshot code. Do not simplify reads to server/cache-only while async write-through remains.
- Deduplication: distinct from `PLUGIN-STORAGE-WRITE-TOKEN-ROLLBACK-AUTHORITY`. That invariant governs who may roll back after failure; this one governs what readers observe before the write settles.

## Why it matters

Upstream plugin storage historically behaved synchronously. Externalizing the store made persistence asynchronous, so returning only the old cache/server value during an in-flight write breaks plugins that write and immediately read without awaiting. Commit `83ffa047...` made the pending queue part of the read view: remove → `null`; set → pending value (or matching cached object); snapshots inherit the same latest-intent semantics.

## Compatibility / guardrails

- No forced DB flush on `visibilitychange` / `pagehide`.
- `flushServerDbKeepalive()` remains a no-op.
- No PM2 or system/runtime migration.
- Targeted V3 reload behavior is untouched.
- Pending intent is transient compatibility state, never durable authority over a failed/newer mutation.
