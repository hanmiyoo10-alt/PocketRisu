# Historical backfill review — settings search deep-link index

- Reviewed at: 2026-09-01 03:29 KST
- Source: `PocketRisu/PocketRisu:develop`
- Source commit: `1aac7c30537fb699ef2f60b6b9d8e3c3424d212a`
- Feature-ID / invariant: `SETTINGS-SEARCH-DECLARATIVE-DEEPLINK-INDEX`
- Forward cursors: unchanged; all 11 Active sources were checked against the authoritative registry before this backfill slice.
- `HISTORICAL_BACKFILL_COMPLETE_THROUGH`: unchanged; this is one bounded historical slice, not complete coverage through a new date.

## Evidence

The source commit adds a command-palette-style settings search without requiring every settings page to be rewritten into one schema. Declarative `SettingItem` arrays are indexed per item, with visibility conditions evaluated at query time; hardcoded pages/sub-tabs are represented in a small explicit manifest. Navigation reuses the existing `openSettings()` route boundary, promotes page-local submenu selection into explicit stores where deep-linking requires it, then scrolls to stable `data-setting-id` anchors. Search covers the current locale plus English labels/help and bilingual keywords, ranks label matches above keyword/help matches, and caps results at 30.

This is a reusable architecture lesson rather than a request to copy the implementation wholesale: discovery metadata should describe existing settings ownership, while runtime visibility and navigation remain authoritative in their existing owners.

## Classification

- `System impact`: `NO_SYSTEM_UPDATE`
- `Importance`: `MEDIUM`
- `Difficulty`: `LOW`
- `Size`: `S`
- `Evidence`: `HIGH`
- `Risk`: `LOW`
- `Dependencies`: `NONE`
- `Priority`: `P1`
- lifecycle status: `ADOPTED`

## PocketRisu benefit

- Makes a growing settings surface discoverable without duplicating whole pages into a second UI architecture.
- Keeps conditional settings out of results when they are not currently reachable.
- Reuses existing route/opening semantics and makes only the minimum tab-state ownership explicit for deep links.
- Bounded result count and lightweight metadata keep search work predictable on mobile/self-host clients.

## Conflict / risk

- A stale manual manifest can point at removed routes, tabs, or anchors.
- Index-time evaluation of visibility would leak unreachable options; visibility must be checked at query/use time.
- Search navigation must not create a competing settings state machine or bypass existing guards/side effects.
- Locale fallback/keywords can drift from user-visible labels if not maintained with settings changes.

## Validation / acceptance

1. Hidden/conditional settings are absent when their visibility predicate is false and appear when it becomes true without rebuilding the application.
2. Every emitted result resolves through the normal settings route/opening boundary.
3. Deep links select the intended sub-tab before scrolling and tolerate a missing anchor without trapping navigation.
4. Search ordering remains deterministic (`label > keyword > help`) and bounded to the configured result cap.
5. Current-locale and English fallback terms both locate the same setting where intended.
6. Adding/removing a hardcoded settings section requires an explicit manifest/anchor test so stale metadata is detected.

## Follow-up

Preserve this as an adopted invariant for future settings growth. When new settings surfaces are added, prefer declarative indexing from their existing metadata; use a small explicit manifest only for hardcoded surfaces, and keep navigation/visibility authority with the original settings subsystem.

## Discovery note

A bounded GitHub repository-search attempt for recently pushed PocketRisu-name repositories was rejected by the connected GitHub endpoint policy. This is an integration/discovery limitation only; it does not change code/CI status or any active-source cursor.
