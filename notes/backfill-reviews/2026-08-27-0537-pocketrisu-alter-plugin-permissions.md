# PocketRisu-Alter historical backfill — plugin permission isolation

Source: `PocketRisu-Alter/PocketRisu-Alter`
Forward cursor remains: `128482ce9984a30ecb68834d561169846d068295`
Reviewed historical evidence: at least through 2026-06-13 in this bounded pass; forward cursor was not moved backward.

## Meaningful normalized idea

- **Idea:** V3 plugin permission decisions must be keyed by an unambiguous `(pluginName, permissionDesc)` identity, and per-plugin reset must delete exact permission keys rather than prefix-match free-form plugin names.
- **System impact:** `NO_SYSTEM_UPDATE`
- **Importance:** `HIGH`
- **Difficulty:** `LOW`
- **Size:** `S`
- **Evidence:** `HIGH`
- **Risk:** `HIGH`
- **Dependencies:** `NONE` for preservation; any future permission-store refactor must retain the invariant.
- **Priority:** `P0`
- **Lifecycle:** `ADOPTED`
- **Source evidence:** `PocketRisu-Alter/PocketRisu-Alter` commit `23b3784d1138590cbf6d560246dc1262ed1270e0`; related concurrency/reconfirmation hardening `f757d6f63b1860491b69749cb11ccf0905949fed`, `ff4fb0d344e0bee688a66ff9f27ec21ad19b5cf1`.
- **Benefit:** prevents one granted plugin permission from silently authorizing another capability; prevents reset collisions between overlapping/free-form plugin names; avoids legacy key collisions.
- **Conflict/risk:** this is a security boundary. Reverting to name-only keys or delimiter-concatenated keys can recreate cross-permission/cross-plugin authorization bugs. Migration logic must not reinterpret legacy plain-string grants as tuple grants.
- **Validation need:** regression coverage for independent permissions on the same plugin, same-permission coalescing, overlapping plugin-name reset isolation, legacy plain-name collision, and periodic reconfirm serialization.
- **Follow-up:** preserve as an ADOPTED invariant; no autonomous source implementation is needed because the current `hanmiyoo10-alt/PocketRisu` notes branch already contains `permissionKeyOf(pluginName, permissionDesc) = JSON.stringify([pluginName, permissionDesc])`, exact reset enumeration, serialized dialogs, and recomputed periodic reconfirm.

## Current PocketRisu verification

Current file: `src/ts/plugins/apiV3/v3.svelte.ts` on `notes/external-risu-dev-watch`.

Verified properties:

1. `permissionKeyOf()` JSON-encodes `[pluginName, permissionDesc]`.
2. granted/denied checks use the tuple key, not plugin name alone.
3. `resetPluginPermission()` enumerates exact permission keys and separately removes only the legacy name-only entry.
4. periodic reconfirm timestamps use the same unambiguous tuple key.
5. permission dialogs are serialized and rechecked under the lock.

Result: external historical idea is **ADOPTED**, not a new port candidate.

## Backfill coverage note

This pass inspected current history plus older commit pages down through the 2026-06-13 security fixes and further historical pages. It does **not** assert complete repository history to the initial commit, so no global `HISTORICAL_BACKFILL_COMPLETE_THROUGH` advance is justified.
