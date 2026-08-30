# Historical backfill — backup durability barrier

Reviewed source: `nevaeh5379/HaejeokRisuai@4342d6c38015c3a8a63c8597245476297671a163`

## Finding

HaejeokRisuai hardens local backup creation by establishing a durability barrier before the storage-level snapshot: it first folds the canonical live SettingsStore into the active preset, then flushes character/settings/message/persona/module stores together, and only then proceeds with snapshot/export work. The same commit also reinforces a broader ownership rule by deriving the active preset from canonical settings state instead of maintaining a separately mutated preset object.

This is not the same idea as restore dry-run, revision diff, or destructive recovery validation. It is a pre-snapshot correctness invariant: every domain that can hold authoritative unsaved state must either participate in the barrier or be proven irrelevant to the backup format.

## PocketRisu inspection

Current personal fork `hanmiyoo10-alt/PocketRisu:develop` has multiple backup paths. `SaveLocalBackup()` delegates to `forageStorage.exportBackup()`, while `SavePartialLocalBackup()` snapshots `getDatabase()` and separately hydrates placeholder chats before encoding. The browser-side owner inspected here does not expose a single explicit all-domain durability barrier. Because PocketRisu's save architecture differs from HaejeokRisuai and the full export path crosses the browser/server boundary, the correct barrier owner and required participating domains are not yet proven.

No implementation is authorized from this evidence alone.

## Classification

- Feature-ID: `BACKUP-AUTHORITATIVE-STORE-DURABILITY-BARRIER`
- System impact: `NO_SYSTEM_UPDATE`
- Importance: `HIGH`
- Difficulty: `MEDIUM`
- Size: `M`
- Evidence: `HIGH`
- Risk: `MEDIUM`
- Dependencies: PocketRisu backup/export ownership audit; enumerate every authoritative dirty-state domain; prove canonical save/flush APIs and ordering; confirm server export observes the post-barrier revision
- Priority: `P1`
- Lifecycle status: `DESIGN_NEEDED`
- Source evidence: `nevaeh5379/HaejeokRisuai@4342d6c38015c3a8a63c8597245476297671a163`
- Benefit: prevents successful-looking backups from omitting recently edited settings/personas/modules/messages or other domain-owned pending writes.
- Conflict/risk: an incorrectly placed barrier can create long blocking saves, duplicate writes, ordering races, or accidentally revive forbidden pagehide/visibility full-flush behavior.
- Validation need: deterministic tests with pending mutations in each authoritative domain immediately before backup; exported snapshot must contain the post-mutation values and one coherent revision; failure of any required flush must abort rather than emit a partial-success backup.
- Follow-up: audit `forageStorage.exportBackup`, server backup endpoint/revision ownership, partial-backup snapshot path, and current immediate-save APIs. Design must explicitly preserve `flushServerDbKeepalive()` no-op and must not add visibility/pagehide flushing.

## Backfill coverage

This bounded review covers this historical commit only. It does not justify advancing `HISTORICAL_BACKFILL_COMPLETE_THROUGH`.