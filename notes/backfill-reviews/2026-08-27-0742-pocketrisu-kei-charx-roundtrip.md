# Historical backfill — PocketRisu-Kei CHARX/module round-trip fidelity

Date: 2026-08-27
Source: `seto-sama/PocketRisu-Kei`
Forward cursor: `3b55f692c02c04082b087547b0114506a5373681` (unchanged; historical review does not move it backward)

## Meaningful idea

Preserve extension metadata and legacy-marker compatibility across character ↔ module/CHARX conversion, with round-trip regression tests.

### Source evidence

- `294c6e4828861b3590bbd6b40d26a259af12ed97` — preserves module namespace and hidden-icon state, maps the live global-note field, accepts legacy `phi` marker, and adds round-trip tests.
- Commit attributes the underlying upstream work to `kwaroran/Risuai` PR #1558 / merge `bd13ae6081f3a33b3dc10b4998a34351e6b8564b`.

### Classification

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `HIGH`
- Difficulty: `LOW`
- Size: `S`
- Evidence: `MEDIUM`
- Risk: `MEDIUM`
- Dependencies: audit current PocketRisu CHARX/module conversion fields and legacy compatibility expectations
- Priority: `P0`
- Lifecycle: `DESIGN_NEEDED`

### PocketRisu benefit

Avoid silent loss or semantic relocation of extension metadata when users convert/import/export characters and modules. Round-trip tests make format evolution safer and preserve older cards/modules.

### Main conflict/risk

PocketRisu may have diverged field names or intentionally different extension semantics. Blindly copying the source mapping could resurrect deprecated fields or alter interoperability. This is a compatibility boundary, so current ownership must be inspected first.

### Validation need

Build a field-level round-trip matrix for current PocketRisu: character → module → character and CHARX import/export. Include namespace, hidden-icon state, global-note replacement, legacy marker acceptance, unrelated lore entries, assets, and unknown extension preservation where applicable. Verify no duplicate indicator entries are introduced.

### Follow-up

Assistant-owned design dossier: `products/pocketrisu-helper-mod/docs/features/import-export/charx-roundtrip-fidelity/DESIGN.md` in `hanmiyoo10-alt/-`.

Do not implement until the current PocketRisu conversion ownership and expected legacy semantics are confirmed. If current PocketRisu already contains equivalent behavior, reclassify to `ADOPTED` and preserve the invariant instead of porting duplicate code.

## Backfill coverage

This bounded pass reviewed the newest visible PocketRisu-Kei history window around 2026-08-17 and identified this compatibility fix. It does **not** prove complete repository history coverage, so `HISTORICAL_BACKFILL_COMPLETE_THROUGH` is unchanged.
