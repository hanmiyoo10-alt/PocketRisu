# Historical backfill review — stale plugin manifest writes fail closed

Source: `PocketRisu/PocketRisu:develop`
Reviewed commit: `856807a25b3145c59845713a0631a5e2fa22f309`
Current develop checked: `278251f85a19bfdfd4cf3faae780e62682878f9e`

## Finding

PocketRisu externalizes character/module asset lists behind manifest descriptors for Plugin V2 compatibility. A plugin may hydrate a snapshot, another actor may advance the manifest, and the plugin may later write its older hydrated array back. Treating that array as authoritative can roll back newer asset state. Commit `856807a2` tags hydrated snapshots with the manifest revision and rejects a write when the hydration mark no longer matches the current descriptor. It also preserves a distinct valid case: an in-place edit of the live V2 database object is resolved during write-back rather than being mistaken for an unhydrated stale write.

The current `develop` implementation still contains this stale-read rejection.

## Durable invariant

**PLUGIN-MANIFEST-STALE-HYDRATED-WRITES-FAIL-CLOSED**

A plugin-visible hydrated asset list may replace/inline a manifest-backed list only when ownership can be tied to the current manifest revision (or an explicitly equivalent live-object write-back path). A snapshot hydrated from an older manifest must not replace a newer manifest-backed list; fail closed and preserve the newer stored manifest.

This is separate from partial plugin-storage merge semantics: this invariant governs revision ownership of externalized character/module asset manifests, not key-level plugin custom storage.

## Classification

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `HIGH`
- Difficulty: `LOW`
- Size: `XS`
- Evidence: `HIGH`
- Risk: `MEDIUM`
- Dependencies: `NONE`
- Priority: `P0`
- lifecycle status: `ADOPTED`
- Source evidence: `PocketRisu/PocketRisu@856807a25b3145c59845713a0631a5e2fa22f309`; current `develop@278251f85a19bfdfd4cf3faae780e62682878f9e` retains stale-read rejection
- Benefit: prevents stale Plugin V2 snapshots from rolling back newer externalized asset lists while preserving legitimate in-place live-object edits
- Conflict/risk: an over-broad stale-write rule could discard legitimate edits; manifest revision identity and the live-object coexistence case must remain explicit
- Validation need: regression coverage for stale hydrated snapshot rejection, same-revision hydrated writes, never-hydrated lazy-shape writes, and in-place V2 live-object edits
- Follow-up: preserve this invariant through future plugin asset-manifest/storage refactors; do not weaken revision ownership merely to simplify compatibility hydration

## Guardrail check

No DB lifecycle flush, keepalive, PM2, notification, system package/runtime, destructive migration, or targeted V3 reload behavior is involved.
