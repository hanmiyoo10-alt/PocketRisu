# SERVER-BACKUP-UPDATE-MUTUAL-EXCLUSION

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `HIGH`
- Difficulty: `LOW`
- Size: `S`
- Evidence: `HIGH`
- Risk: `HIGH`
- Dependencies: `NONE`
- Priority: `P0`
- lifecycle status: `ADOPTED`

## Source evidence

- Source: `PocketRisu/PocketRisu:develop`
- Fix commit: `775fcd1e6bbeb52343c8a3a4643be73e8dabe157`
- Current develop evidence: `ca09a80746e74e5334145e5e78af47ce423e0eba`
- Demonstrated failure: the update popup allowed a server backup to stream and then immediately start self-update/restart. Restart during the backup removed the incomplete temporary file, leaving the user without the backup they had just requested.
- Adopted mechanism: keep backup/update actions mutually exclusive while backup save is unsettled; write backups through `.tmp` and clean incomplete output on failure; sweep only stale matching backup temp files at boot so a fresh file potentially owned by another live instance is not deleted.
- Related same-commit hardening: preserve a configured custom backup directory inside the app root during in-app self-update and report the server-side backup directory to the user.

## Expected PocketRisu benefit

A user-triggered update cannot invalidate the backup that is intended to protect that update. Crash/restart leftovers remain bounded without treating every temporary file as disposable, and custom backup locations are not silently lost during updater cleanup.

## Main risk / conflict

Backup/update lifecycle coordination crosses persistence and process-restart boundaries. Over-broad cleanup can delete a live backup; under-broad mutual exclusion can still permit restart during a critical write. The stale-temp sweep must remain name-scoped and age-scoped. This invariant must not be generalized into forced DB flushes on `visibilitychange`/`pagehide`, and `flushServerDbKeepalive()` remains a no-op.

## Validation evidence / measurement needed

Preserve focused coverage that an update action is unavailable while a server backup promise is active, failed backups remove only their own incomplete temp output, startup cleanup ignores fresh/non-matching files, and custom in-tree backup directories survive self-update. A restart/failure-path integration check is the strongest regression proof.

## Follow-up

`ADOPTED`: no autonomous implementation branch is appropriate. Preserve this as a regression invariant whenever update UI, server backup streaming, backup temp naming, or updater keep-list logic changes. If update/backup orchestration is refactored, require explicit restart-during-backup failure-path validation and rollback semantics.
