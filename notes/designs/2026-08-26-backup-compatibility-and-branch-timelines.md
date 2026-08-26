# 2026-08-26 — backup compatibility and in-chat branch timeline design notes

Source: `nevaeh5379/HaejeokRisuai:main`
Evidence commits: `798f27d012da4a998039ef2c962aabf1a9f290c8`, `76062ad13da3ae9223bd2a98a7b22739d4a0a28a`, `5101294bf8255f491b8b9c4cd68e7ee334e92941`, `bc36ad269e876dbe3fe5132f4ebc39f8d35272e1`, `4552f46eda411253e8c2d099466cde49d0daafca`.

## Idea A — compatibility backup must materialize lazy/cold state before conversion

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `HIGH`
- Difficulty: `MEDIUM`
- Size: `M`
- Evidence: `MEDIUM`
- Risk: `HIGH`
- Dependencies: PocketRisu backup/export hydration audit; authoritative lazy/cold storage identity; legacy-format compatibility contract
- Priority: `P1`
- Status: `DESIGN_NEEDED`

### Problem/evidence
A backup built from a lazy in-memory shell can silently omit unloaded chats/characters or preserve pointers that older consumers cannot resolve. Haejeok now compares in-memory state with full storage snapshots, materializes cold-stored character/chat payloads, and only then converts native branch metadata to a legacy-compatible representation.

### Minimal safe scope
Before changing formats, add an export completeness audit: prove every authoritative chat/character represented in storage is either fully materialized in the export snapshot or intentionally represented by a portable payload. Do not change normal save semantics.

### Ownership boundaries
Backup/export snapshot builder; lazy SQL/chat hydration; cold storage; compatibility encoder. Live database mutation remains out of scope.

### Proposed mechanism
Build a detached export snapshot from authoritative storage plus current dirty/in-memory state. Resolve lazy/cold references into the detached snapshot. If any required pointer cannot be resolved, fail closed or retain an explicitly supported portable pointer; never silently delete the marker. Compatibility conversion runs only after completeness validation.

### Compatibility/invariants
- Export must not overwrite newer live in-memory edits.
- Backup must contain all chats/characters known to authoritative storage.
- Unresolved lazy/cold references must never be silently dropped.
- Existing PocketRisu save/patch integrity and no-op `flushServerDbKeepalive()` policy remain unchanged.
- Native backup may retain native metadata; compatibility backup may flatten unsupported structures only in the detached copy.

### Validation / acceptance
Fixtures with unloaded chat, partially hydrated character, cold chat containing Hypa/script/local-lore state, dirty loaded chat newer than storage, missing cold pointer, and round-trip restore. Assert no source object mutation and exact chat-count/content preservation. Failure injection must prove unresolved references abort or remain recoverable.

### Risk / rollback
High data-loss blast radius if completeness detection is wrong. Ship behind explicit compatibility-export path first. Rollback is disabling the compatibility path and retaining the existing native export.

### PR decomposition
1. Export completeness detector/tests only.
2. Detached lazy/cold materializer.
3. Compatibility conversion on the proven-complete detached snapshot.

## Idea B — normalize and validate backup asset paths before restore writes

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `HIGH`
- Difficulty: `LOW`
- Size: `XS`
- Evidence: `MEDIUM`
- Risk: `HIGH`
- Dependencies: PocketRisu restore-path audit across browser/Node/Tauri and existing archive-entry validation
- Priority: `P0`
- Status: `DESIGN_NEEDED`

### Problem/evidence
Haejeok fixed restore behavior by canonicalizing separators, placing entries under the asset namespace, creating nested directories, and rejecting empty, absolute, dot, and parent-traversal segments. This is both correctness and archive path-safety evidence.

### Minimal safe scope
One shared pure path normalizer used before every backup asset write. It must return a canonical relative asset key or reject the entry.

### Invariants
No absolute path, empty segment, `.` or `..`; Windows separators normalize to `/`; repeated leading `assets/` does not escape or double-prefix; all writes remain under the intended asset root.

### Validation / acceptance
Table tests for plain names, nested names, Windows separators, repeated `assets/`, empty names, traversal, absolute paths, encoded/odd separators where applicable. Integration test each restore backend. High risk means do not mark READY_TO_PORT until current PocketRisu paths are audited and rollback is simply reverting to the previous restore implementation without accepting unsafe archives.

## Idea C — branch/reroll alternatives as timelines inside one chat

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `MEDIUM`
- Difficulty: `HIGH`
- Size: `L`
- Evidence: `MEDIUM`
- Risk: `HIGH`
- Dependencies: PocketRisu chat/message-store ownership audit; long-chat paging compatibility; backup/export semantics; bookmark/search/plugin assumptions
- Priority: `P3`
- Status: `DESIGN_NEEDED`

### Problem/evidence
Haejeok replaced branch-as-duplicate-chat sessions with durable branch metadata inside one chat, exposing only the active timeline through the existing message interface and storing inactive suffixes as branch metadata. This avoids duplicate sidebar sessions and creates a cleaner ownership model, but it changes message persistence and export semantics substantially.

### Minimal safe scope
Do not port the feature wholesale. First extract a pure branch-timeline model and test whether an inactive suffix can remain detached from the active render/message path without increasing long-chat retained memory.

### Invariants
Active timeline remains compatible with existing message consumers; branch switch is atomic from the user's perspective; stale async generation cannot write into a no-longer-active branch; bookmarks/message IDs remain valid or are remapped explicitly; copying a chat does not accidentally retain shared branch ownership; compatibility export preserves every branch.

### Validation / acceptance
Rapid branch switching during generation/cancel, long-chat paging, search/edit/bookmarks, plugin message APIs, crash/reload persistence, copy/delete, native backup and legacy-compatible export. Measure retained heap/DOM and storage duplication versus duplicate-session branching.

### Risk / rollback
Broad chat-state and persistence blast radius. Keep behind a feature flag or isolated model until compatibility matrix passes; rollback returns to existing reroll/chat behavior without migrating authoritative data destructively.
