# 2026-09-03 14:44 KST — HaejeokRisuai forward review

## SETTINGS-OWNERSHIP-BUILD-DRIFT-GUARD

- `System impact`: `NO_SYSTEM_UPDATE`
- `Importance`: `HIGH`
- `Difficulty`: `MEDIUM`
- `Size`: `S`
- `Evidence`: `MEDIUM`
- `Risk`: `LOW`
- `Dependencies`: PocketRisu settings/ownership inventory; identify canonical source(s) before generating derived lists
- `Priority`: `P1`
- lifecycle status: `DESIGN_NEEDED`
- Source evidence: `nevaeh5379/HaejeokRisuai@969612bf7548be13db67bb3feec6ffd2b878899b`, merged by `25f026ee1af744d83ba8b8acd929cbbbe3015b8f`; follow-up `6f4cc11dcc0c216469d05d4d7c0312820e1a77b2` normalizes CRLF/LF in the staleness check. Forward range reviewed from authoritative cursor `b931529511fbea5187ed16e5bc16282a8ecc7f39` through `cb97bb15afa065b259552f89b2d3b3b9b4c52ccc`.
- Expected PocketRisu benefit: prevent silent drift between runtime setting definitions, domain-store ownership, deferred/hydration key groups, protocol/type artifacts, and generic UI/settings access. Build-time failure is much cheaper and safer than discovering a mis-owned key after persistence/hydration behavior changes.
- Main risk/conflict: Haejeok's exact store split and generated `settingKeys.d.ts` are source-specific; copying its taxonomy would create a second authority in PocketRisu. The first safe slice must be validation-only and generated from PocketRisu's own canonical source(s), with no runtime behavior change.
- Validation need: inventory PocketRisu's duplicated key/ownership lists; prove a canonical source exists; make deliberate drift fail checks; prove regeneration passes; ensure CRLF/LF normalization prevents platform-only failures; run existing settings/storage tests unchanged.
- Follow-up: assistant-owned design created at `hanmiyoo10-alt/-:products/pocketrisu-helper-mod/docs/features/settings/settings-ownership-build-drift-guard/DESIGN.md` (`c31584b469785d602e7933ea83ee39423f623bba`). Move to `READY_TO_PORT` only after the PocketRisu inventory identifies an isolated validation-only first slice and confirms no runtime ownership migration is needed.

### Deduplication / relation

This is related to the existing generic store/domain-ownership family, including the previously reviewed Haejeok `060bf33f...` settings-renderer fix, but is not a duplicate. That item concerns runtime accessor routing; this item concerns preventing ownership/type/key-list drift at build/check time. Evidence is merged conceptually while the execution boundary stays separate.

### Other forward commits in the reviewed range

The same Haejeok forward range also added/fixed an optional save indicator with broad E2E coverage and a Windows line-ending tooling fix. The save-indicator work is useful UX evidence but does not currently justify a separate PocketRisu feature entry; the line-ending fix is incorporated into this design as a validation invariant rather than a duplicate idea.

### Cursor / backfill

- Advance only HaejeokRisuai `Last reviewed HEAD` to `cb97bb15afa065b259552f89b2d3b3b9b4c52ccc` after registry write.
- Other active sources checked this run remained at their authoritative cursors.
- `HISTORICAL_BACKFILL_COMPLETE_THROUGH` is unchanged; this was a forward-review run and does not establish new complete historical coverage.
