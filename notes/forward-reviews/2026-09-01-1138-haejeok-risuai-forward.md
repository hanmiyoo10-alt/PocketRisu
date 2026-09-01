# Forward review — HaejeokRisuai + RisuAI — 2026-09-01 11:38 KST

## Cursor movement

- `nevaeh5379/HaejeokRisuai:main`: `20fc61f274e7d7f94ac8db41930b44f305514a41` -> `7edb216d1307a285581757e011d7d0402f802406` (6 commits; forward-only).
- `kwaroran/Risuai:main`: `ffabb06a386f1aee13217e5ca3c4268a35edb421` -> `9d31f8f48a4c7588070588b1e45ee246b950aa07` (1 commit; forward-only).

All other Active source HEADs were checked and still matched their durable cursors: RisuBard `f1ad9f75407e48e8053908ad7ab58fa94ff5faf6`, RisuAI-Next `b0d40f89a9f40b29900d86e5251a78649b2c6173`, official PocketRisu `b8bbcbe065755379d33f74d6ad16a36d634917c1`, Inori RisuVault `1284cc93853bdba80fc3aab537fad2817d695914`, TripleHwang RisuVault `5afa95a9379ef45ef8484617a5407726d14e5f2b`, PocketRisu-Kei `3b55f692c02c04082b087547b0114506a5373681`, PocketRisu-kotono `1fa0294df185910c45606dfd678c490b1793ebcb`, Kei-Risu `8d794f9753381ab2582509a6cfb577968a6de595`, PocketRisu-Alter `128482ce9984a30ecb68834d561169846d068295`.

## Meaningful evidence

### TERMUX-RUNIT-LOCALHOST-DEPLOYMENT — evidence strengthened

Haejeok commit `549ecda8ceff9dc8ede773148feb716c734fc232` fixes a concrete Termux dependency mismatch by changing the package from `openssl` to `openssl-tool`, adds a credential-generation helper that uses `openssl rand` when available and `/dev/urandom` otherwise, fails closed when neither source exists, and adds regression assertions around package/install and localhost-first behavior. The fix is merged by `7edb216d1307a285581757e011d7d0402f802406`.

This strengthens the existing design conclusion: host-package/runtime deployment must treat executable availability and package naming as explicit preflight/acceptance criteria rather than assuming desktop/Linux package names map directly onto Termux.

Classification remains:
- System impact: `SYSTEM_UPDATE_REQUIRED`
- Importance: `HIGH`
- Difficulty: `HIGH`
- Size: `L`
- Evidence: `MEDIUM`
- Risk: `HIGH`
- Dependencies: current PocketRisu server-phone/runit inventory; persistent-data and backup-domain inventory; supported Termux/Node/PostgreSQL/package-name policy; credential entropy source availability; LAN exposure ownership; release checksum policy; explicit authorization for system/runtime migration
- Priority: `P2`
- lifecycle status: `DESIGN_NEEDED`
- Source evidence: Haejeok `75d3da1a03b30ae934dbb8939dad5740264728a1`, `549ecda8ceff9dc8ede773148feb716c734fc232`, merge `7edb216d1307a285581757e011d7d0402f802406`
- Benefit: deterministic localhost-first runit deployment on a server phone with explicit package/runtime ownership
- Conflict/risk: package/runtime/database changes can break startup, strand data, weaken credential generation, or expose the service; Android notification and PM2 guardrails remain hard constraints
- Validation need: clean supported-Termux install; exact package-name/executable preflight; entropy-source failure test; runit reboot/restart; localhost negative remote-connect test; LAN opt-in reversal; update/rollback; backup/restore; resource measurements
- Follow-up: design-only; do not implement without a narrower explicit system-update instruction

### INDEPENDENT-SETTING-VISIBILITY — low-signal UX reference

Base RisuAI commit `9d31f8f48a4c7588070588b1e45ee246b950aa07` removes a conditional that hid Asset Style whenever Insert Asset Prompt was disabled, because those settings are semantically independent.

Classification:
- System impact: `NO_SYSTEM_UPDATE`
- Importance: `LOW`
- Difficulty: `LOW`
- Size: `XS`
- Evidence: `HIGH`
- Risk: `LOW`
- Dependencies: `NONE`
- Priority: `P2`
- lifecycle status: `HOLD`
- Source evidence: `kwaroran/Risuai` `9d31f8f48a4c7588070588b1e45ee246b950aa07`
- Benefit: avoids making a valid independent control unreachable because an unrelated feature toggle is off
- Conflict/risk: PocketRisu may not have the same coupling; changing visibility without checking semantics can expose a nonfunctional control
- Validation need: inspect PocketRisu settings predicates for independently meaningful controls hidden behind unrelated enable flags
- Follow-up: only promote if an equivalent PocketRisu coupling is found; otherwise retain as a settings-visibility invariant reference

## Other Haejeok commits

The remaining forward commits are custom-model request/UI handling (`a71c5204...`, merge `9fc3a710...`, custom-model browser grouping merged by `bb369526...`) and merge bookkeeping. They are useful product polish but did not establish a stronger PocketRisu candidate than the two items above in this bounded review.

## Coverage marker

`HISTORICAL_BACKFILL_COMPLETE_THROUGH` is unchanged. This was a forward review and does not establish exhaustive historical coverage.