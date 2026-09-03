# Forward review — HaejeokRisuai module-local auxiliary model routing

Reviewed source: `nevaeh5379/HaejeokRisuai:main`

Forward range: `0329f44199e93103ba07a247df5e831173f02039..5cb7fa23010d11076a6382fd8a98402858605833`

Meaningful source commits include:

- `a264a8ea22705e78aa41b9921efff11c105df52c` — adds an opt-in beta boundary for per-module auxiliary models, default off, and gates propagation/routing behind the setting.
- `cf259589741de3c1ab825d41fd7732c0d22e2bb4` — E2E verifies provider-context resolution: module-local `subModel` wins only when supplied; unset/disabled falls back to the global auxiliary model.
- `060bf33fb1565536841de8b45fe511dcf7c6f7ad` — related settings renderer hardening: generic segmented setting controls must route reads/writes through declared setting ownership rather than hardcoding `SettingsStore`; reproduces a crash for `PresetStore`-owned `reasoningEffort`.
- Merge HEAD: `5cb7fa23010d11076a6382fd8a98402858605833`.

## Idea: MODULE-LOCAL-MODEL-OVERRIDE-IS-EXPLICIT-AND-REVERSIBLE

- `System impact`: `NO_SYSTEM_UPDATE`
- `Importance`: `MEDIUM`
- `Difficulty`: `MEDIUM`
- `Size`: `S`
- `Evidence`: `MEDIUM`
- `Risk`: `MEDIUM`
- `Dependencies`: PocketRisu would need an explicit module-trigger/request ownership boundary and a user requirement for module-specific auxiliary-model routing.
- `Priority`: `P2`
- lifecycle status: `HOLD`
- source evidence: `nevaeh5379/HaejeokRisuai` commits `a264a8ea22705e78aa41b9921efff11c105df52c`, `cf259589741de3c1ab825d41fd7732c0d22e2bb4`, merge `5cb7fa23010d11076a6382fd8a98402858605833`.
- benefit: if PocketRisu later supports module-owned model selection, an individual module can pin auxiliary work to a chosen model without silently mutating the global preset; disabling or omitting the override restores the existing global auxiliary-model behavior.
- conflict/risk: hidden precedence can make request provenance hard to reason about, increase provider/cost surprises, and create compatibility drift across module import/export. External module taxonomy is not authority for PocketRisu.
- validation need: prove precedence at the final provider-facing request context, verify disabled/unset fallback, import/export round-trip of the optional field, and ensure main-model requests are not affected by auxiliary overrides.
- follow-up: remain `HOLD`; do not port the feature unless PocketRisu develops an owned module-trigger/request boundary and a concrete product need. Reuse the precedence/fallback tests if such a feature is designed later.

## Merged evidence: generic setting controls must respect setting-store ownership

Do not create a duplicate feature for Haejeok's `reasoningEffort` crash. Merge this as an architectural invariant into the existing store/domain-ownership family: a generic setting renderer must access a key through its ownership-aware adapter (`get`/`set` abstraction) rather than assuming every key lives in one backing store. The evidence is credible and regression-tested in Haejeok, but current PocketRisu does not expose the same `SettingSegmented` / split-store architecture in the inspected branch, so no implementation candidate is opened.

Classification for this evidence slice: `NO_SYSTEM_UPDATE / Importance MEDIUM / Difficulty LOW / Size XS / Evidence MEDIUM / Risk LOW / Dependencies: analogous split setting ownership boundary / Priority P1 / HOLD`.

## Autonomous progression

- Read durable registry, common classification schema, and idea backlog first.
- Checked all 11 Active source branch HEADs against authoritative cursors; only HaejeokRisuai advanced in this pass.
- Reviewed only commits newer than the Haejeok cursor.
- Deduplicated the settings-renderer lesson into existing ownership knowledge rather than creating a parallel feature.
- No design draft/dossier/feature branch/tests/personal PR: both retained ideas are `HOLD`, with unresolved PocketRisu ownership/product dependencies.
- `HISTORICAL_BACKFILL_COMPLETE_THROUGH` unchanged; this forward slice does not establish complete historical coverage.
- Bounded discovery query (`RisuAI pushed:>=2026-09-01`) found no new maintained full-code divergence that justifies Active-source promotion in this pass; recent results were existing Active sources, previously reviewed candidates, plugins/tools, or unproven new forks.
