# Historical backfill — PocketRisu-Alter model profile snapshot updates

Date: 2026-08-27
Source: `PocketRisu-Alter/PocketRisu-Alter`
Forward cursor: unchanged at `128482ce9984a30ecb68834d561169846d068295`.

## Evidence

- `54d19a2063a088102c1e18c82fd4ad671a785d4b` — adds model-profile snapshot update diff/apply logic with extensive tests.
- Nearby architecture commits `813219d5f4c3727277f1fcc283716645719c99a6`, `3caee21b19b9f92379785554f27a9ac95b67d439`, `ecbc8395089594a8e0c6564a34fc67b43e85b08a` establish shared adapter primitives and provider-specific adapters around the snapshot model.

## Normalized idea

**Idea:** Versioned provider/model profile snapshots should update by explicit diff against their recorded source identity, preserving user-owned values/secrets and refusing ambiguous source resolution rather than silently replacing the whole preset.

- `System impact`: `NO_SYSTEM_UPDATE`
- `Importance`: `MEDIUM`
- `Difficulty`: `MEDIUM`
- `Size`: `M`
- `Evidence`: `MEDIUM`
- `Risk`: `MEDIUM`
- `Dependencies`: PocketRisu model/preset ownership audit; evidence that a remote/versioned model-profile registry exists or is planned
- `Priority`: `P2`
- lifecycle status: `HOLD`
- source evidence: `PocketRisu-Alter/PocketRisu-Alter` `54d19a2063a088102c1e18c82fd4ad671a785d4b`
- benefit: if PocketRisu adopts versioned provider/model profiles, registry updates can evolve endpoint/schema/capability metadata without overwriting user credentials or local preset choices.
- conflict/risk: PocketRisu may not share Alter's registry/profile architecture; copying it would create unnecessary preset/provider complexity. Incorrect ownership rules could overwrite secrets or user-selected model values.
- validation need: first map current PocketRisu preset/provider ownership. If a versioned registry boundary exists, test same-version/no-source/missing-source/downgrade/ambiguous registry cases plus preservation of user-owned secret/model values.
- follow-up: remain architecture evidence only. Promote to `DESIGN_NEEDED` only if a matching PocketRisu registry/update boundary is confirmed.

## Backfill coverage

This bounded pass continued Alter history into the 2026-05-24 architecture sequence. It does **not** establish initial-commit coverage, so no global `HISTORICAL_BACKFILL_COMPLETE_THROUGH` marker is advanced.
