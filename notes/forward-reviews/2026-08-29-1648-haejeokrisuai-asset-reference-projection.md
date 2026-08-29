# Forward review — HaejeokRisuai asset-reference projection

Reviewed forward range: `nevaeh5379/HaejeokRisuai` `2a952c4dde32bb1e8f33b610f545737ed6e1b683..b46e748658bc6f867d2a2915e34ad604dba91636` (17 commits).

## Meaningful evidence

Commit `b46e748658bc6f867d2a2915e34ad604dba91636` adds `loadCharacterAssetFields` across SQL storage backends so orphan/reference analysis can load only asset-bearing character fields instead of hydrating lore, scripts, or chats. The projected fields include `image`, `customBackground`, `gptSoVitsConfig`, `vits`, `emotionImages`, `additionalAssets`, and `ccAssets`.

This is not a new orphan-cleanup policy. It is an optimization/refinement of the existing fail-safe asset-reference analysis idea: destructive cleanup should still depend on complete reference discovery, but the discovery reader can use an explicit read-only projection when that projection is demonstrably complete for the reference domain.

## Classification merge

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `MEDIUM`
- Difficulty: `LOW`
- Size: `S`
- Evidence: `MEDIUM`
- Risk: `MEDIUM`
- Dependencies: PocketRisu-owned orphan/reference-analysis path; complete inventory of asset-bearing fields; parity test proving projected reference set equals full-hydration reference set before any destructive cleanup uses it
- Priority: `P1`
- Lifecycle: `DESIGN_NEEDED`
- Source evidence: `nevaeh5379/HaejeokRisuai@b46e748658bc6f867d2a2915e34ad604dba91636`
- Benefit: reduce memory/IO cost of large character reference scans without weakening orphan-analysis correctness
- Conflict/risk: an incomplete projection can create false-orphan results and therefore data loss if trusted by deletion logic
- Validation need: compare projected-vs-full reference sets across every current asset-bearing field/domain; fail closed on unknown/new domains; verify no chat/lore/script hydration is required for reference discovery
- Follow-up: keep merged with the existing asset-integrity/orphan-cleanup design; only extract a code slice after a matching PocketRisu owner and complete parity fixture exist

## Guardrails

No implementation was attempted. This evidence must not weaken PocketRisu's existing reference-aware, fail-closed orphan cleanup invariant. External storage layout is evidence only, not authority.
