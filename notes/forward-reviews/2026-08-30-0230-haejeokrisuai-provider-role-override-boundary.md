# Forward review — HaejeokRisuai provider-role override boundary

Reviewed source: `nevaeh5379/HaejeokRisuai:main`

Forward range: `1d659a5bcfd3b3c33c136ac86b2dd788985a2ff3..463b9fb97b09a3372a8305282ab05be8fc391fe0`

Relevant commits:

- `cad10cc715d7f5948918d60ed881de30a5e95287` — adds per-feature provider/model overrides for memory, translate, emotion, and other auxiliary roles, including NanoGPT/OpenRouter/Ollama settings and request plumbing.
- `463b9fb97b09a3372a8305282ab05be8fc391fe0` — centralizes provider-mode override resolution behind a single helper and adds UI role synchronization when separate auxiliary models are toggled.

## Transferable idea

Feature-specific model/provider routing should have one canonical role-resolution boundary shared by UI state, request preparation, transport URL/header/model selection, and provider-context construction. Callers that are not explicit feature roles must not accidentally inherit feature overrides.

## Classification

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `MEDIUM`
- Difficulty: `LOW`
- Size: `XS`
- Evidence: `MEDIUM`
- Risk: `LOW`
- Dependencies: matching PocketRisu per-feature provider/model override owner or future feature-role routing surface
- Priority: `P1`
- Lifecycle: `HOLD`

## Source evidence

The source first expands per-feature provider overrides across settings and request paths, then immediately follows with a shared `getProviderModeOverride()` helper and tests asserting that only enabled feature modes receive overrides. The follow-up also synchronizes the settings tab role when separate auxiliary-model mode changes.

## Expected benefit

Avoid request-path drift where model, endpoint, headers, or provider context disagree about the active feature role. A shared resolver also prevents main/submodel requests from accidentally consuming feature-only overrides.

## Main risk / conflict

PocketRisu currently does not expose a matching `providerModelOverrides` / `seperateModelsForAxModels` owner in the inspected personal fork, so copying the source structure now would create unused abstraction or divergent semantics.

## Validation need

If a matching PocketRisu role-routing surface appears, add table-driven tests covering main, submodel, memory, translate, emotion, and other auxiliary modes across disabled/enabled override state, and verify request model + endpoint/header/context agree.

## Follow-up

Keep as a reusable invariant. Promote to `READY_TO_PORT` only after a matching PocketRisu owner exists and a concrete duplicated/drifting resolver is demonstrated. First slice should be a resolver test plus one shared helper, not provider UI expansion.
