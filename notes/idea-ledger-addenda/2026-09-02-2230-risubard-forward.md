# Risu-family forward review — 2026-09-02 22:30 KST

## Forward source

- Source: `rpaddict/RisuBard`
- Previous authoritative cursor: `5e8acda4c3b56ff2a4effab7d104b5d2d1d2860a`
- Reviewed through: `54a82c32b7398ae539bb40bfcaa96d2228f5a2a5` (`release: v0.9.16`)
- Range: exactly one commit, fast-forward.

## Deduplicated evidence merge 1 — bounded large-import decode/persist work

Underlying idea remains the existing large-I/O/import batching family rather than a new duplicate item.

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `HIGH`
- Difficulty: `MEDIUM`
- Size: `M`
- Evidence: `MEDIUM`
- Risk: `MEDIUM`
- Dependencies: benchmark PocketRisu's current module/CHARX import path; preserve current asset-manifest ownership/hydration rules; verify bulk persistence failure semantics and retry boundaries before any port
- Priority: `P1`
- lifecycle status: `DESIGN_NEEDED`
- Source evidence: `rpaddict/RisuBard@54a82c32b7398ae539bb40bfcaa96d2228f5a2a5`, especially `src/ts/process/modules.ts`, `src/ts/process/processzip.ts`, `src/ts/storage/nodeStorage.ts` and focused tests in the same commit
- Benefit: avoid large CHARX/module imports stalling in Reading while reducing per-asset persistence overhead and keeping decoded/persist batches bounded by count and bytes
- Conflict/risk: PocketRisu currently has its own asset-manifest/lazy-hydration ownership; directly copying RisuBard's larger persistence batches or `forageStorage.setItems` path could bypass manifest semantics, change retry granularity, or increase peak retained decoded bytes
- Validation need: reproduce a large compressed-asset import on PocketRisu; compare wall time, peak browser heap/RSS, decoded bytes retained, persistence call count, cancellation/failure behavior, and imported asset equality; include one oversized single asset and partial bulk-write failure
- Follow-up: treat RisuBard v0.9.16 as stronger evidence for the existing `Stream large asset/backup payloads and batch DB writes instead of materializing giant buffers/JSON` design family. Do not change lifecycle until PocketRisu-specific measurements resolve batching size and manifest compatibility.

PocketRisu comparison at `PocketRisu/PocketRisu@278251f85a19bfdfd4cf3faae780e62682878f9e`: `readModule()` still uses bounded concurrency of individual `decodeRPack()` + `saveAsset()` operations, while module asset manifests are a separate current invariant. This makes the performance lesson relevant but not a safe blind port.

## Deduplicated evidence merge 2 — bounded structured-output capability downgrade

Underlying idea remains the existing request-safety item `Bound retry/fallback state machines, including pathological content retries`.

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `HIGH`
- Difficulty: `LOW`
- Size: `S`
- Evidence: `MEDIUM`
- Risk: `LOW`
- Dependencies: provider-specific capability/error classification and focused fallback tests
- Priority: `P0`
- lifecycle status: `READY_TO_PORT`
- Source evidence: `rpaddict/RisuBard@54a82c32b7398ae539bb40bfcaa96d2228f5a2a5`, BardWiki reboot hotfix: native JSON Schema rejection may downgrade to the same schema expressed in the prompt exactly once; an invalid downgraded response fails rather than retrying indefinitely
- Benefit: provider compatibility without unbounded retry loops or silent repeated downgrade cycles
- Conflict/risk: overly broad HTTP-400 classification could hide real request errors; fallback must not weaken validation of the returned structured result
- Validation need: native-schema success; explicit unsupported-schema rejection followed by one prompt-schema success; fallback-invalid response; unrelated HTTP 400; cancellation during first or fallback attempt; prove total attempts are bounded
- Follow-up: merge as additional evidence into the existing bounded retry/fallback state-machine item; no new duplicate idea.

## Other release changes

- Persona-builder z-order fix is localized UI behavior and below the current mining threshold.
- v0.9.15 features repeated in the v0.9.16 patch note were already reviewed at the previous cursor; they are not re-added as forward evidence unless changed by this commit.

## Active-source check

All other active source branch HEADs matched their authoritative cursors during this run:

- `nevaeh5379/HaejeokRisuai:main` `b16374e7b8b84854b39a4ff2ca6237a1f9a5251a`
- `kwaroran/Risuai:main` `754af0ba5d546db9a8cc0c2676ba4c2693f3f72d`
- `kwaroran/Risuai-Next:main` `b0d40f89a9f40b29900d86e5251a78649b2c6173`
- `PocketRisu/PocketRisu:develop` `278251f85a19bfdfd4cf3faae780e62682878f9e`
- `InoriNatsume/RisuVault:master` `1284cc93853bdba80fc3aab537fad2817d695914`
- `TripleHwang/RisuVault:main` `5afa95a9379ef45ef8484617a5407726d14e5f2b`
- `seto-sama/PocketRisu-Kei:main` `3b55f692c02c04082b087547b0114506a5373681`
- `Nagase-Kotono/PocketRisu-kotono:main` `1fa0294df185910c45606dfd678c490b1793ebcb`
- `tegy1117/Kei-Risu:main` `8d794f9753381ab2582509a6cfb577968a6de595`
- `PocketRisu-Alter/PocketRisu-Alter:main` `128482ce9984a30ecb68834d561169846d068295`

## Discovery/backfill markers

- Bounded discovery again surfaced `rakey0/PocketRisu`, already present in the discovery pool; no new evidence of maintained behavioral/architectural divergence justified Active-source promotion.
- `HISTORICAL_BACKFILL_COMPLETE_THROUGH` was not advanced or regressed. This run had forward traffic and did not establish complete reviewed historical coverage for all tracked sources through a newer common date.
- No implementation branch/PR was started: the import batching item remains `DESIGN_NEEDED`, while the retry/fallback item is an existing cross-provider safety family and this commit only strengthens evidence rather than creating a new isolated Feature-ID candidate.