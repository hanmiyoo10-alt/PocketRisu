# PocketRisu historical review — backup commit blocks restart/update

- Reviewed source: `PocketRisu/PocketRisu:develop`
- Source commit: `775fcd1e6bbeb52343c8a3a4643be73e8dabe157`
- Review kind: bounded historical backfill
- Active forward cursors: unchanged; this review does not move any cursor backward.

## Finding

The update popup allowed a server backup to start and then still allowed an in-app self-update/restart before the streamed backup had committed. Restarting mid-save removed the incomplete temporary file, leaving the user without the backup they had just requested. The same change also made the completed server-side backup location explicit, swept only stale `risu-backup-*.bin.tmp` files at boot, and preserved a configured backup directory inside the app root across self-update.

The adopted UI fix treats an in-flight server backup as an exclusion boundary for both the backup trigger and update/restart trigger until the save finishes. The server side continues to use temp-then-final semantics and cleans incomplete files on failure; boot cleanup is age-gated so it does not blindly delete a possibly-live temp file.

## Transferable invariant

**BACKUP-COMMIT-BLOCKS-RESTART-UPDATE** — an operation advertised as creating recovery material must hold restart/destructive-update authority closed until the backup reaches its committed final state (or fails and releases the boundary). A temporary/in-flight artifact is not a successful backup.

This is narrower than general backup/restore validation. It governs operation ordering and lifecycle ownership: backup completion must precede any user action that can terminate the writer or replace the running app. Stale-temp cleanup must also distinguish abandoned artifacts from potentially active writes.

## Classification

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `HIGH`
- Difficulty: `LOW`
- Size: `XS`
- Evidence: `HIGH`
- Risk: `LOW`
- Dependencies: `NONE`
- Priority: `P0`
- lifecycle status: `ADOPTED`
- Source evidence: official PocketRisu commit `775fcd1e6bbeb52343c8a3a4643be73e8dabe157`; commit message records the concrete restart-mid-save failure and the adopted exclusion/cleanup behavior.
- Benefit: prevents the update workflow from defeating its own safety backup and avoids presenting an in-flight temp file as recovery material.
- Conflict/risk: a stuck backup could leave update controls disabled if completion/failure cleanup is incomplete; stale-temp sweeping must not delete a file that another live writer may still own.
- Validation need: delayed/streaming backup keeps update disabled; success re-enables controls only after final commit; failure re-enables controls and removes incomplete temp; restart leaves only stale temp eligible for age-gated cleanup; custom backup directory remains preserved by self-update.
- Follow-up: preserve as an adopted backup/update lifecycle invariant. No port branch is required unless future update UI or backup streaming refactors bypass the exclusion boundary.

## Guardrail check

No forced DB flush on visibility/pagehide, no change to `flushServerDbKeepalive()`, no V3 reload change, no PM2, no Android notification, and no host/runtime migration. The invariant protects recovery ordering without changing deployment substrate.

## Backfill marker

`HISTORICAL_BACKFILL_COMPLETE_THROUGH` is unchanged. This is one bounded historical slice, not proof of complete reviewed coverage across all tracked sources through a new date.
