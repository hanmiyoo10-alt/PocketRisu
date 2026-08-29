# Historical backfill review — Risuai-Next runtime DB adapter boundary

Reviewed source: `kwaroran/Risuai-Next:main`
Reviewed commit: `b0d40f89a9f40b29900d86e5251a78649b2c6173` (`feat: basic database and formatting`)

## Finding

Risuai-Next introduces a single server DB access contract and schema while selecting the concrete Drizzle adapter at runtime. `getDb()` dynamically imports only the adapter selected by `DATABASE_MODE` (`node-sqlite`, `better-sqlite3`, `libsql`, `bun-sql`, or Cloudflare D1/sqlite-proxy), while callers share one schema type. This is useful as an architectural invariant: runtime-specific native/server dependencies should stay behind one capability/adapter boundary rather than leaking conditional imports and divergent query semantics throughout application code.

## Transferable idea

Feature-ID: `RUNTIME-DB-ADAPTER-CAPABILITY-BOUNDARY`

The transferable part is not adopting Drizzle, D1, Bun, or any new runtime. It is the boundary: one application-level persistence contract, explicit runtime/capability selection, lazy loading of incompatible host adapters, and common schema/semantic tests.

## PocketRisu fit

No current PocketRisu requirement justifies a storage/runtime migration, and changing the existing persistence architecture would be high blast radius. Keep this as a design invariant for any future server persistence abstraction or runtime expansion. Do not introduce new host packages, a new DB engine, PM2, or system/runtime migration from this evidence.

## Validation before any future adoption

- identify a real PocketRisu owner where runtime-specific DB/storage imports or semantics are duplicated;
- prove the adapter boundary can preserve current save/integrity semantics, ETag/revision behavior, backup/restore compatibility, and runit deployment;
- test the same application contract against each supported adapter, including failure/transaction semantics;
- ensure unsupported host adapters are not eagerly imported/bundled;
- require an explicit rollback path and no storage-format migration in the first slice.

## Backfill coverage

This bounded slice reviewed Risuai-Next's current database-introduction commit and its DB owner files. It does not justify moving any active forward cursor backward or advancing the global `HISTORICAL_BACKFILL_COMPLETE_THROUGH` marker.
