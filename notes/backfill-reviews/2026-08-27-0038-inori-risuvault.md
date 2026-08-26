# Historical backfill — InoriNatsume/RisuVault

Reviewed source: `InoriNatsume/RisuVault:master`
Forward cursor remains: `1284cc93853bdba80fc3aab537fad2817d695914`

## Coverage

Visible public history contains 10 commits from initial commit `8fe679fa357d50391b72b02bacbebdb3ad61d510` (2026-04-16) through current cursor `1284cc93853bdba80fc3aab537fad2817d695914` (2026-04-18). This bounded pass reviewed the full visible commit list, so this source is now **historically complete through its initial public commit**. The global `HISTORICAL_BACKFILL_COMPLETE_THROUGH` marker does not advance because other tracked sources still lack equivalent complete coverage.

## Deduplicated idea/evidence merge

### Backup/export pre-publish integrity verification

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `HIGH`
- Difficulty: `LOW`
- Size: `S`
- Evidence: `MEDIUM`
- Risk: `LOW`
- Dependencies: define PocketRisu export-snapshot invariants and ownership boundaries; identify a bounded hook that does not require re-buffering streamed full backups
- Priority: `P0`
- Lifecycle status: `DESIGN_NEEDED`
- Source evidence: `InoriNatsume/RisuVault` `1d0d352fa6d93ba88629e30089bf38accf2c0fd5` (`verify` primitive); supporting separation/sync evidence `12767efba3d6e824be05c1ea3a9bae2974cca8cf`, `d602bf8d268078a8d425432a217a8bdb12ffdf20`
- Benefit: fail closed before publishing a durable backup/export artifact when required data is unresolved, structurally inconsistent, or outside the intended plaintext/encrypted ownership boundary.
- Conflict/risk: a verifier that guesses too many invariants can reject valid exports; validating a streamed full backup by re-materializing it would defeat current memory/streaming work.
- Validation need: define a minimal invariant set; exercise missing lazy chat, plugin-storage snapshot, manifest-backed assets, malformed/partial encode, and cancellation/failure paths; prove no additional full-buffer copy is introduced.
- Follow-up: merge as additional evidence into the existing backup-safety/export-integrity design axis rather than creating a competing restore architecture. Keep `DESIGN_NEEDED` until a PocketRisu-specific invariant set and zero-copy/low-copy hook are proven.

## PocketRisu inspection

Current `PocketRisu/PocketRisu:develop` already has several relevant correctness guards in `src/ts/drive/backuplocal.ts`: partial backup rehydrates lazy chat placeholders and aborts if a full chat cannot be fetched; module/persona asset manifests are materialized; plugin custom storage is snapshotted before encoding. This means the transferable value is not to duplicate those checks but to make the publish boundary explicit and testable. Existing backup round-trip compatibility tests are also present.

No implementation branch/PR was opened in this pass. Backup/recovery correctness remains design-only until the invariant contract is specific enough to avoid false safety and streaming regressions.
