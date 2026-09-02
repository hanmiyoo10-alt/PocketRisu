# Haejeok forward review — 2026-09-02 17:47 KST

Reviewed `nevaeh5379/HaejeokRisuai:main` from authoritative cursor `92f6f79b035ea4bac5b49c95a89be9817ac4af18` through `65838a46c9813c420fd0c6de097f1dd3e478f9e1` without moving backward.

## FIRST-MESSAGE-SELECTION-INDEX-NORMALIZATION

- System impact: NO_SYSTEM_UPDATE
- Importance: MEDIUM
- Difficulty: LOW
- Size: XS
- Evidence: MEDIUM
- Risk: LOW
- Dependencies: NONE
- Priority: P1
- lifecycle status: READY_TO_PORT
- source evidence: `nevaeh5379/HaejeokRisuai@b53207aa3a699e44f8f6477c7b46ad939894e6f3`, merged by `65838a46c9813c420fd0c6de097f1dd3e478f9e1`; direct PocketRisu inspection at `PocketRisu/PocketRisu@278251f85a19bfdfd4cf3faae780e62682878f9e` shows `Number.isFinite` guards but no integer/range normalization.
- benefit: invalid persisted/migrated first-message indices fail safely to the default greeting and cannot render `undefined` or produce nonsensical page state.
- conflict/risk: must preserve valid `-1` sentinel and existing cyclic alternate-greeting navigation exactly; UI-local rollback.
- validation need: focused pure-helper tests for undefined/null/NaN/out-of-range/fractional/zero-alternate cases plus valid navigation behavior.
- follow-up: helper dossier created at `hanmiyoo10-alt/-:products/pocketrisu-helper-mod/docs/features/chat/first-message-selection-index-normalization/FEATURE.md`; autonomous isolated implementation is eligible under the safety gate.

## Async hydration ordering/selection evidence merged, not duplicated

`8843365579e676e078e781f5c8a4c362b2618124` (merged by `bba6da8ba08f4f107ec16f528bc43d7c60a8b15b`) changes Haejeok's domain-store hydration merge so live in-memory chat order remains authoritative while newly loaded persisted chats are appended, and it preserves the active chat by stable chat id rather than stale positional index. This is meaningful evidence for the existing character/chat switching + stale async completion ownership family, not a separate PocketRisu port candidate: current PocketRisu does not use Haejeok's characterStore/detailsLoaded architecture. Preserve the transferable invariant: an async hydration completion must not overwrite newer user-owned ordering/selection state; reconcile by stable identity when available.

Classification of the merged evidence remains under the existing switching/hydration design item rather than creating a duplicate lifecycle entry.

## Cursor result

All four commits in the range were reviewed. Advance `nevaeh5379/HaejeokRisuai:main` `Last reviewed HEAD` to `65838a46c9813c420fd0c6de097f1dd3e478f9e1`.

`HISTORICAL_BACKFILL_COMPLETE_THROUGH` is unchanged; this was forward review, not proof of complete historical coverage across all tracked sources.
