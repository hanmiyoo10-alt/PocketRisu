# Historical backfill — update-safe custom backup path ownership

- Reviewed at: 2026-08-28 13:30 KST
- Source: `PocketRisu-Alter/PocketRisu-Alter`
- Source commit: `922bd30f70989a9a4af01d4d7b017fe6c05b8226`
- Forward cursor: unchanged (`128482ce9984a30ecb68834d561169846d068295`)
- Bounded historical coverage in this pass: inspected Alter history at least through 2026-05-20/21; this is not proof of complete initial-history coverage.

## Idea

Keep user-owned backup data outside updater-owned replacement roots, and when a configurable backup directory is allowed inside the application tree, make updater preservation explicit and fail closed for paths that overlap managed application directories.

### Classification

- `System impact`: `NO_SYSTEM_UPDATE`
- `Importance`: `HIGH`
- `Difficulty`: `MEDIUM`
- `Size`: `S`
- `Evidence`: `MEDIUM`
- `Risk`: `HIGH`
- `Dependencies`: current PocketRisu self-update/update-replacement ownership audit; confirm whether configurable server backup paths can exist inside the install tree and how updater keep/delete roots are derived
- `Priority`: `P1`
- lifecycle status: `DESIGN_NEEDED`

### Source evidence

Alter commit `922bd30f70989a9a4af01d4d7b017fe6c05b8226` adds a small updater-readable marker for the configured server backup path, rejects backup paths rooted under updater-managed application directories, and preserves the safe top-level segment when an in-tree custom backup path is used. Its regression coverage distinguishes managed application paths from a safe custom `data/backups` path.

### Expected PocketRisu benefit

Prevent an in-place application update from deleting or replacing user-owned backups merely because the configured backup directory happens to live under the install root. The general invariant is stronger than the specific Alter implementation: destructive update replacement must know which paths it owns and must not infer user-data ownership from location alone.

### Conflict / risk

Updater path handling is destructive and path canonicalization is security-sensitive. A permissive keep rule can preserve stale executable/application files; a too-narrow rule can delete backups. Marker/config disagreement can also create false ownership. Do not copy Alter's marker mechanism blindly, and do not add an in-tree backup feature merely to make this idea applicable.

### Validation need

1. INSPECT_ONLY audit of current PocketRisu updater/install replacement behavior and server backup path configurability.
2. If an applicable boundary exists, tests for app-managed roots, safe user-data roots, outside-root paths, root itself, `..`/canonicalization, symlink/reparse-point cases where relevant, stale/missing marker/config, and update rollback.
3. Verify updater failure is fail-closed before deleting/replacing anything when ownership is ambiguous.
4. Preserve current PocketRisu guardrails; no PM2, no device/system migration, no Android notification behavior, and no visibility/pagehide DB flush changes.

### Follow-up

Assistant-owned design dossier: `products/pocketrisu-helper-mod/docs/features/backup/update-safe-backup-directory/DESIGN.md`.

Remain `DESIGN_NEEDED`. This is not eligible for autonomous implementation because `Risk: HIGH` and the current PocketRisu ownership dependency is unresolved.