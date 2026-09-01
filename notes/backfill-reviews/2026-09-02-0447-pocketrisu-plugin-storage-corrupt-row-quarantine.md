# PocketRisu historical review — corrupt plugin-storage row quarantine

- Reviewed source: `PocketRisu/PocketRisu:develop`
- Source commit: `167def7df98e8272dcb179a4e8b4451e29e32604`
- Review kind: bounded historical backfill
- Active forward cursors: unchanged; this review does not move any cursor backward.

## Finding

`pluginStorageStore` keeps a server-side key index and periodically refreshes it. Before this fix, a value that failed JSON parsing was removed from the local index/cache, but the server index continued to advertise the key. Each later refresh therefore treated the key as merely missing and top-up fetched the same permanently-unparseable row again.

The adopted fix records such keys in a local `unparseable` quarantine set. Top-up skips quarantined keys. The quarantine is cleared only when evidence says the state may have changed: a successful write/read repairs the key, or a refreshed server index no longer contains the key (allowing a later reappearance to be retried). A regression test proves repeated index refreshes do not re-fetch the corrupt row while a rewrite makes it readable again.

## Transferable invariant

**PLUGIN-STORAGE-CORRUPT-ROW-QUARANTINE** — a known-unparseable remote value is not equivalent to an ordinary cache miss. Periodic reconciliation must remember parse-failure state and avoid retry storms until a concrete invalidation/repair event occurs.

This is distinct from preload fail-closed and refresh top-up-only: those govern runtime admission and ordinary missing-key refresh behavior; this invariant governs the retry authority of a key already proven unreadable.

## Classification

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `MEDIUM`
- Difficulty: `LOW`
- Size: `XS`
- Evidence: `HIGH`
- Risk: `LOW`
- Dependencies: `NONE`
- Priority: `P1`
- lifecycle status: `ADOPTED`
- Source evidence: official PocketRisu commit `167def7df98e8272dcb179a4e8b4451e29e32604` plus regression test `a corrupt row is fetched once, not on every index refresh`
- Benefit: prevents deterministic repeated network/parse work, warning spam, and background churn from one persistently corrupt plugin-storage row while preserving recovery after repair.
- Conflict/risk: quarantine must not become permanent negative caching; invalidation must occur on successful repair and when authoritative membership changes.
- Validation need: preserve regression coverage for repeated refresh, repair-by-write, successful re-read, and remove/recreate transitions.
- Follow-up: preserve as a plugin-storage reconciliation invariant; no new implementation is required because PocketRisu already adopted it.

## Guardrail check

No interaction with visibility/pagehide DB flushing, `flushServerDbKeepalive()`, V3 targeted reload, runit/PM2, Android notifications, host packages, or destructive migration.

## Backfill marker

`HISTORICAL_BACKFILL_COMPLETE_THROUGH` is unchanged. This is one bounded historical slice, not proof of complete reviewed coverage across all tracked sources through a new date.
