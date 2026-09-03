# PLUGIN-STORAGE-V2-STREAMED-BULK-PRELOAD

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `HIGH`
- Difficulty: `LOW`
- Size: `S`
- Evidence: `HIGH`
- Risk: `MEDIUM`
- Dependencies: `NONE`
- Priority: `P0`
- lifecycle status: `ADOPTED`
- Area: plugin storage / startup / remote self-host performance

## Source evidence

- `PocketRisu/PocketRisu@ee482f74524efdb0fb9eae26dfcdd0dcab01d65e` — replaces N per-key V2 plugin-storage preload GETs with one authenticated streamed `GET /api/plugin-storage/all` NDJSON response. Server iterates raw KV rows without materializing the full store; client ingests incrementally, preserves pending local writes/removals, and falls back to per-key reads if the bulk stream fails or an older server lacks the endpoint.
- Follow-up `PocketRisu/PocketRisu@b49cb05181e0cedffaa9e27947376263620afdc2` adds server streaming coverage.
- Follow-up `PocketRisu/PocketRisu@b69fafa9dd11a9b355edf0f058ecc458209336a5` stops waiting on stream drain after client disconnect and hardens adjacent plugin-storage ownership semantics.
- Current durable-tip code still exposes `getPluginStorageAll()` and `preloadBulk()`; the invariant remains adopted.

## Benefit

Legacy V2/V2.1 plugin APIs are synchronous, so enabled legacy plugins require all plugin-storage values locally available before execution. On remote/self-host links, N sequential HTTP requests can turn thousands of keys into minutes of startup latency. One streamed response removes round-trip amplification while keeping peak server memory bounded to row-wise iteration.

## Conflict / risk

A bulk snapshot can race with local pending writes/removals or fail mid-stream. The client must therefore preserve session-local state as newer authority and must not treat partial stream completion as a successful authoritative preload. Backward compatibility also requires graceful fallback to the per-key path. Authentication and existing storage isolation remain mandatory.

## Validation need

Preserve tests that prove: one bulk request replaces N key reads on success; pending local write/removal state wins over streamed server rows; mid-stream/endpoint failure falls back safely; client disconnect does not hang server backpressure; malformed/corrupt rows retain the separate quarantine semantics; memory remains bounded by streaming rather than full-store server materialization.

## Follow-up

`ADOPTED`: preserve as a startup/performance invariant while legacy V2/V2.1 support exists. Do not generalize this into eager hydration for V3 or other lazy domains; bulk preload is justified specifically by the synchronous legacy API contract. No autonomous implementation or PR is needed.