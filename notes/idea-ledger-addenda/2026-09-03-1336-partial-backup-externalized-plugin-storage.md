# Idea ledger addendum — 2026-09-03 13:36 KST

## PARTIAL-BACKUP-EMBEDS-EXTERNALIZED-PLUGIN-STORAGE

- `System impact`: `NO_SYSTEM_UPDATE`
- `Importance`: `HIGH`
- `Difficulty`: `LOW`
- `Size`: `XS`
- `Evidence`: `HIGH`
- `Risk`: `HIGH`
- `Dependencies`: `NONE`
- `Priority`: `P0`
- lifecycle status: `ADOPTED`
- source evidence: `PocketRisu/PocketRisu@343c2e278414e5d050b8192a49f55755aeb3639b` (`fix(backup): include plugin storage in partial local backup`); preserved on `develop@278251f85a19bfdfd4cf3faae780e62682878f9e`.
- benefit: preserves plugin state across partial local backup/restore after plugin storage was externalized from the browser DB object. A backup format that will later replace a domain must include the complete authoritative state for that domain even when the ordinary client snapshot intentionally contains only a stub/empty projection.
- conflict/risk: materializing all plugin values for a backup can increase one-off memory, I/O, and backup latency; snapshot assembly must not accidentally change steady-state preload/LRU ownership. Object assembly must preserve unusual but valid keys such as `__proto__` as own properties. Because restore replacement is destructive, omission is a data-loss class failure.
- validation need: preserve focused `snapshotAll()` tests for complete detached snapshots, no `preloaded` flip, and `__proto__` own-property safety; preserve an integration-level invariant that a partial backup created with externalized plugin storage restores all plugin keys rather than clearing omitted values. For future externalized domains, test backup→restore round-trip rather than only encoder shape.
- follow-up: preserve this as an adopted backup-integrity invariant. When any new domain is externalized/lazily hydrated, audit every backup/export flavor and ask whether the restore semantics are replace, merge, or leave-unchanged. If replace, archive creation must explicitly close over the authoritative external store.

### Deduplication / relationship

This is related to `SETTINGS-ONLY-BACKUP-PRESERVES-REFERENCE-CLOSURE` and `PLUGIN-STORAGE-ROUNDTRIP-NON-DESTRUCTIVE-MERGE`, but it is not the same authority boundary. Reference-closure protects assets reachable from retained settings; non-destructive merge protects generic plugin DB round-trips from treating omission as deletion. This invariant protects archive completeness when an externalized domain is intentionally omitted from the ordinary client DB projection but restore semantics replace that domain.
