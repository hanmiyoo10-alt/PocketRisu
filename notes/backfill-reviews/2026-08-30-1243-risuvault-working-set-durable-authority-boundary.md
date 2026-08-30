# Backfill review — RisuVault working-set / durable-authority boundary

Date: 2026-08-30
Source: `InoriNatsume/RisuVault`
Historical evidence commit: `12767efba3d6e824be05c1ea3a9bae2974cca8cf`
Active forward cursor remains: `1284cc93853bdba80fc3aab537fad2817d695914`

## Observation

Commit `12767efb` refactors the project layout into two explicit ownership domains:

- `project_work/<name>/`: plaintext, ignored by git, persistent for editing but explicitly disposable/reconstructible.
- `project_git/<uuid>/...enc`: encrypted durable representation intended for commit/push.

The workflow makes transitions explicit: `pull` reconstructs the working copy from durable state; `sync` publishes working changes back to the durable representation; `wipe-work` can remove the disposable working set without deleting the durable source. The project instructions also require verification before commit.

## Transferable invariant

A reconstructed or hydrated working set must not silently become the durable authority merely because it is convenient to mutate in memory. If PocketRisu later introduces disposable hydration caches, compacted chat working sets, externalized plugin values, or other reconstructed state, the authoritative representation and publish boundary should stay explicit.

The invariant is intentionally narrower than RisuVault's encryption/git architecture:

1. Working state may be discarded only if reconstruction from the durable source is defined and tested.
2. Durable state may be replaced only through an explicit publish/sync boundary with validation.
3. A missing working copy means `NOT_LOADED` / reconstructible absence, not deletion of durable data.
4. Recovery must identify the authoritative source before reconciling a working copy.

## PocketRisu fit

No directly matching `project_work`/`project_git` style owner exists in current PocketRisu. This therefore remains an architecture invariant/reference rather than a port candidate. It complements, but does not duplicate, existing ideas around deferred-root write intent, inactive-chat memory release, plugin-storage hydration, and backup integrity: those ideas govern specific mechanisms; this one governs authority ownership when a working representation is reconstructible.

## Guardrail check

- No forced `visibilitychange` / `pagehide` DB flush.
- `flushServerDbKeepalive()` remains no-op.
- No storage-format migration proposed.
- No PM2 or runtime/device change.
- No server-phone Android notification.
- External source architecture is evidence only, not authority.

## Decision

Record as `WORKING-SET-DURABLE-AUTHORITY-BOUNDARY`, lifecycle `HOLD`. Do not create an implementation branch or PR until PocketRisu has a concrete reconstructed/disposable state owner whose authority semantics need hardening.

`HISTORICAL_BACKFILL_COMPLETE_THROUGH` is unchanged: this is a bounded single-source slice and does not establish complete historical coverage across all tracked sources.
