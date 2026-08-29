# Forward review — RisuBard staged import publish barrier

Reviewed source: `rpaddict/RisuBard:main`

- Previous authoritative cursor: `769c611cc3574e6b0277e944afa1ffaaf99c100d`
- Reviewed HEAD: `5f5f80348509a034acb318563fb52ebef188a3f0`
- Forward commits reviewed: 5
  - `d33fcf6fce28eb4dfc2b8bb10a30cbd841164b95` — release 0.9.5
  - `818afbcb28709b55931aa8da4beb8cbd9504f1a3` — autosave/BardWiki chat-import stabilization and deletion/retraction ordering
  - `9e0111b2b7656a260e320e709b098b9555eb1192` — release 0.9.6
  - `9a8a02f2a0610cc58cc257de4007721c077dfed7` — release 0.9.7; includes staged account-backup validation-before-publish work and canonical-section patching
  - `5f5f80348509a034acb318563fb52ebef188a3f0` — release 0.9.8

## Meaningful merged idea

### `STAGED-IMPORT-PUBLISH-BARRIER`

The most PocketRisu-relevant transferable invariant in this forward slice is the backup/import publish barrier demonstrated in `9a8a02f2a0610cc58cc257de4007721c077dfed7`.

RisuBard's account-backup compatibility plan stages the candidate database, handles transformation/decryption before publication, decodes the final staged database, and only then permits the active KV manifest/revision to be replaced. Malformed metadata, transformation/decryption failure, or undecodable database data must fail while the prior active data remains readable.

This is not an instruction to copy RisuBard's AES/account-key path. The transferable idea is failure atomicity: **candidate import state is non-authoritative until complete validation succeeds; active durable state must remain untouched on every pre-publish failure.**

## Classification

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `HIGH`
- Difficulty: `MEDIUM`
- Size: `S`
- Evidence: `MEDIUM`
- Risk: `HIGH`
- Dependencies: matching PocketRisu-owned backup/import publish boundary; current format/key-authority inventory; failure-atomicity tests across malformed/decryption/parse failures
- Priority: `P1`
- Lifecycle status: `DESIGN_NEEDED`
- Source evidence: `rpaddict/RisuBard` `9a8a02f2a0610cc58cc257de4007721c077dfed7`; supporting failure-ordering evidence in `818afbcb28709b55931aa8da4beb8cbd9504f1a3`
- Benefit: prevents malformed/partially decoded imports from replacing the last known-good durable database; makes restore failure rollback a discard of staged state rather than recovery from partial publication
- Conflict/risk: backup/restore and parser/crypto boundaries are destructive/security-sensitive; copying source-specific account-key or encryption behavior would exceed autonomous implementation gates
- Validation need: locate PocketRisu's actual import/restore publisher; prove malformed/truncated/unsupported candidate input leaves the old active revision unchanged; prove publish failure cannot select a partial new revision
- Follow-up: assistant-owned design dossier created at `products/pocketrisu-helper-mod/docs/features/backup/staged-import-publish-barrier/DESIGN.md`; remain design-only until a concrete PocketRisu owner/gap is demonstrated

## Deduplication decision

This extends the existing backup/restore safety family rather than creating a separate encryption feature. Existing ideas about restore limits, recovery ordering, and fail-closed storage remain authoritative; this entry adds the explicit **validation-before-publish** invariant and keeps all source-specific crypto/key mechanics out of scope.

## Autonomous progression

- forward evidence reviewed and normalized into the shared schema
- helper-repo design dossier created
- PocketRisu code search for a matching delete/retraction/memory owner returned no matching result for the RisuBard-specific narrative-memory mechanism; no source-specific memory deletion implementation was attempted
- no implementation branch, code change, tests, or personal-fork PR were created because `Risk: HIGH` and the storage/import owner dependency is unresolved

## Other active-source forward check

At this run, the following source HEADs matched their registry cursors and therefore required no forward review: `nevaeh5379/HaejeokRisuai` `b46e748658bc6f867d2a2915e34ad604dba91636`; `kwaroran/Risuai` `984f46b7306ca38312a043e0ef28d447f2a92766`; `kwaroran/Risuai-Next` `b0d40f89a9f40b29900d86e5251a78649b2c6173`; `PocketRisu/PocketRisu:develop` `615b79df3375bf9db2924a8003f61a747721c725`; `InoriNatsume/RisuVault` `1284cc93853bdba80fc3aab537fad2817d695914`; `TripleHwang/RisuVault` `5afa95a9379ef45ef8484617a5407726d14e5f2b`; `seto-sama/PocketRisu-Kei` `3b55f692c02c04082b087547b0114506a5373681`; `Nagase-Kotono/PocketRisu-kotono` `1fa0294df185910c45606dfd678c490b1793ebcb`; `tegy1117/Kei-Risu` `8d794f9753381ab2582509a6cfb577968a6de595`; `PocketRisu-Alter/PocketRisu-Alter` `128482ce9984a30ecb68834d561169846d068295`.

## Historical backfill marker

No `HISTORICAL_BACKFILL_COMPLETE_THROUGH` change. This run was forward-driven and did not establish complete historical coverage across all tracked sources through a later date.
