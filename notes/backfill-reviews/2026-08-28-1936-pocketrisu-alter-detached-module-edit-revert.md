# Historical backfill review — PocketRisu-Alter detached module edit revert

Date: 2026-08-28 19:36 KST
Source: `PocketRisu-Alter/PocketRisu-Alter`
Reviewed commits:
- `219dc859ed6892b292196e42ff4edef425f10d05` — `perf(modules): edit modules on a detached copy, commit on save/unmount`
- `855144c732c5a09201fd14e10e822aabdbf6f04e` — immediate revert of the above change

## Finding

The attempted optimization identified a real hot path: editing an existing module directly through the live `DBState.db.modules` object could cause every keystroke to participate in broad reactive/save work. The attempted fix detached the module into a snapshot and committed that snapshot on explicit Save or component unmount.

The change was then reverted less than an hour later with no durable causal explanation in the commit message. Therefore the transferable lesson is not "port detached editing". The durable lesson is that a detached editor changes ownership and commit semantics and must prove merge/concurrency/exit behavior before it can be used as a performance optimization.

## PocketRisu inspection

Current `hanmiyoo10-alt/PocketRisu:main` still assigns `tempModule = rmodule` for edit mode, so the editor is live-bound to the persisted/reactive module object. The specific Alter helper introduced by `219dc859` is absent. This makes the original performance concern potentially relevant, but the immediate revert prevents treating the detached-copy mechanism as validated evidence.

## Normalized classification

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `MEDIUM`
- Difficulty: `MEDIUM`
- Size: `S`
- Evidence: `MEDIUM`
- Risk: `MEDIUM`
- Dependencies: direct PocketRisu module-edit profiling plus explicit ownership/merge semantics for concurrent module changes and every editor exit path
- Priority: `P2`
- Lifecycle status: `HOLD`
- Source evidence: `PocketRisu-Alter/PocketRisu-Alter` `219dc859ed6892b292196e42ff4edef425f10d05`, reverted by `855144c732c5a09201fd14e10e822aabdbf6f04e`
- Benefit: if the current live-bound editor is measured to trigger broad snapshots/effects per keystroke, isolating draft edits could substantially reduce large-module typing lag.
- Conflict/risk: detached drafts can overwrite external/runtime changes made after edit start, silently commit on unrelated unmount/navigation, lose edits on unmodeled exits, or change plugin/module refresh timing. The source implementation was reverted, so its exact mechanism is not authority.
- Validation need: first profile current PocketRisu typing with large module/lorebook data and identify actual reactive/save owners. Any future draft model must test explicit Save, Cancel/navigation/unmount, module reorder/delete while editing, concurrent external/plugin mutation, stale draft detection, merge/reject behavior, and crash/reload semantics.
- Follow-up: retain as an ownership/performance design warning. Do not implement a detached snapshot editor until measurements establish the hot path and draft-vs-live ownership is explicitly designed.

## Backfill marker

This review increases evidence coverage for PocketRisu-Alter around 2026-06-12, but does not establish complete initial-history coverage for all tracked sources. Do not advance `HISTORICAL_BACKFILL_COMPLETE_THROUGH` from this review alone.
