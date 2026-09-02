# Forward review addendum — 2026-09-02 23:43 KST

## Source: `rpaddict/RisuBard:main`

Reviewed authoritative forward range `54a82c32b7398ae539bb40bfcaa96d2228f5a2a5..d81bb1fa171dbaf9a8d032263de280769313294a` (one commit, release `v0.9.17`).

### Idea: GLOBAL-DYNAMIC-MODAL-LAYER-STACK-IS-NOT-SAFE-AUTHORITY

- `System impact`: `NO_SYSTEM_UPDATE`
- `Importance`: `MEDIUM`
- `Difficulty`: `LOW`
- `Size`: `XS`
- `Evidence`: `MEDIUM`
- `Risk`: `MEDIUM`
- `Dependencies`: `NONE`
- `Priority`: `P1`
- lifecycle status: `HOLD`
- source evidence: `rpaddict/RisuBard` commit `d81bb1fa171dbaf9a8d032263de280769313294a` (`v0.9.17`). The release explicitly removes the global `modalLayerStack` observer/tier assignment introduced earlier and restores bounded static/local z-index ownership after fullscreen plugin and nested-window controls could become hidden/unusable. The commit deletes `modalLayerStack.ts` and its observer tests, removes `data-risu-modal-tier`/floating-layer ownership from callers, and restores static shared tiers plus narrow local overrides.
- expected PocketRisu benefit: preserve operable modal/plugin/fullscreen controls and avoid a global DOM observer becoming hidden authority over unrelated portal/floating surfaces.
- main risk / conflict: a fully static z-index scheme can also become brittle if unbounded magic numbers proliferate. The transferable lesson is not “copy RisuBard's numbers”; it is to keep stacking ownership explicit and bounded, and to avoid global mutation/observation that silently reorders unrelated surfaces without an interaction contract.
- validation evidence or measurement needed: before any future PocketRisu modal-stack centralization, add an interaction matrix covering nested dialog over base dialog, dropdown/select/tooltip portals, fullscreen plugin UI, plugin floating controls, loading/alert/top blockers, and close/minimize/escape/outside-click operability. Verify ordering under rapid open/close and detached portal nodes.
- follow-up: regression/design lesson only. Keep `HOLD` unless PocketRisu develops a concrete stacking-order bug or proposes a global dynamic observer. If centralization is revisited, require explicit owner/portal boundaries, bounded tiers, local override rules, and focused cross-surface regression tests before implementation.

This is distinct from responsive-shell state ownership and sortable-filter event ownership: it concerns cross-portal visual/interactivity authority, not layout breakpoint state or drag filtering.

## Source: `Nagase-Kotono/PocketRisu-kotono:main`

Reviewed authoritative forward range `1fa0294df185910c45606dfd678c490b1793ebcb..7dc29aeec37bba4d08dfc769fc3e467409a1d68b`.

The range is large (`177` commits) because `513988785b411559c0f6b68b7f72e186894f57cf` merges official PocketRisu `278251f85a19bfdfd4cf3faae780e62682878f9e` into the fork. All upstream behavior in that merge is already covered by the first-class `PocketRisu/PocketRisu:develop` source cursor, so it was deduplicated rather than re-added as Kotono evidence. The fork-local head `7dc29aeec37bba4d08dfc769fc3e467409a1d68b` only bumps the operating image tag to `1.11.2-k1`; this is deployment bookkeeping, not a transferable PocketRisu idea.

No new classification item was created for the Kotono range. Advance its cursor because the complete forward range was reviewed and the upstream merge was explicitly deduplicated.

## Cursor / coverage result

- `rpaddict/RisuBard` reviewed through `d81bb1fa171dbaf9a8d032263de280769313294a`.
- `Nagase-Kotono/PocketRisu-kotono` reviewed through `7dc29aeec37bba4d08dfc769fc3e467409a1d68b`.
- Other checked Active sources remained at their authoritative cursors: `nevaeh5379/HaejeokRisuai` `b16374e7b8b84854b39a4ff2ca6237a1f9a5251a`; `kwaroran/Risuai` `754af0ba5d546db9a8cc0c2676ba4c2693f3f72d`; `kwaroran/Risuai-Next` `b0d40f89a9f40b29900d86e5251a78649b2c6173`; `PocketRisu/PocketRisu` `278251f85a19bfdfd4cf3faae780e62682878f9e`; `InoriNatsume/RisuVault` `1284cc93853bdba80fc3aab537fad2817d695914`; `TripleHwang/RisuVault` `5afa95a9379ef45ef8484617a5407726d14e5f2b`; `seto-sama/PocketRisu-Kei` `3b55f692c02c04082b087547b0114506a5373681`; `tegy1117/Kei-Risu` `8d794f9753381ab2582509a6cfb577968a6de595`; `PocketRisu-Alter/PocketRisu-Alter` `128482ce9984a30ecb68834d561169846d068295`.
- bounded discovery surfaced recent zero-signal RisuAI forks but no maintained meaningful divergence sufficient for Active-source promotion.
- `HISTORICAL_BACKFILL_COMPLETE_THROUGH` unchanged: this run was forward-focused and does not establish complete historical coverage for every tracked source.

No implementation/dossier/branch/test/personal PR was created: the only new classified item is a `HOLD` regression lesson, and the Kotono advance contains no independent transferable candidate.