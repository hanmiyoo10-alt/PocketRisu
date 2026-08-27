# Historical backfill — PocketRisu-Kei token-count boundary

Date: 2026-08-27
Source: `seto-sama/PocketRisu-Kei`
Forward cursor: `3b55f692c02c04082b087547b0114506a5373681` (unchanged)

## Idea: shared debounced CBS-aware token-count component

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `MEDIUM`
- Difficulty: `LOW`
- Size: `S`
- Evidence: `MEDIUM`
- Risk: `LOW`
- Dependencies: audit current PocketRisu editable prompt/persona/character token-count surfaces and tokenizer/CBS ownership
- Priority: `P1`
- Lifecycle status: `DESIGN_NEEDED`
- Source evidence: `seto-sama/PocketRisu-Kei` commit `ae05122d6f7423a285e74d1e07fe245ac1847236`
- Benefit: centralize expensive editor token counting so all supported text fields use the same CBS-aware tokenizer, debounce policy, stale-async-result rejection, and cleanup behavior; reduce duplicated reactive effects and avoid stale counts after rapid edits.
- Conflict/risk: token counts are only useful if the shared component uses the same expansion/tokenizer semantics as generation. A generic component must not accidentally tokenize hidden/unsupported fields or add expensive work to every textarea.
- Validation need: inventory current token-count call sites; verify CBS expansion parity with generation; rapid-edit test proving stale async completions cannot overwrite the newest count; unmount/timer cleanup; measure keystroke-path work and first-count latency.
- Follow-up: draft a helper dossier. Promote to `READY_TO_PORT` only if PocketRisu has duplicated or inconsistent token-count call sites and the shared tokenizer contract is confirmed. If PocketRisu already has an equivalent shared boundary, reclassify `ADOPTED`/`SUPERSEDED` instead of porting.

## Evidence notes

Commit `ae05122d...` replaces several per-field tokenization effects in character configuration with a reusable `TokenCount` component and enables the same component for persona settings. The component debounces by 400 ms, increments a sequence immediately when input changes, and only accepts an async tokenization result when its sequence is still current. It calls `tokenizeAccurate`, whose source comment states that CBS expansion occurs before encoding.

This is a bounded UI/performance/correctness pattern, not authority to copy PocketRisu-Kei UI structure wholesale.

## Backfill coverage

This bounded pass inspected the recent PocketRisu-Kei history around 2026-08-17 and the concrete token-count commit. It does not establish complete history coverage and does not advance `HISTORICAL_BACKFILL_COMPLETE_THROUGH`.