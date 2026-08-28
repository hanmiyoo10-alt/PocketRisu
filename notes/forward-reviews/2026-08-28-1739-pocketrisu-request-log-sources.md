# Forward review — PocketRisu request-log source coverage and budgets

Reviewed source: `PocketRisu/PocketRisu:develop`

Authoritative prior cursor: `a266f52ea6cea5924c1145de0a9d2ebde6e5e0c9`
Reviewed through: `615b79df3375bf9db2924a8003f61a747721c725`

## Forward commits reviewed

- `222911203581270ad4657b4d98e0f474a00b4ef3` — trim leading keep-alive whitespace from logged non-streaming responses so log viewers do not appear blank when providers pad before JSON.
- `2deffd1f63d0b118dcbaa299b124b4efe79706ca` — expand request-log source coverage to plugin, legacy auxiliary, Ollama/Horde/Stability paths; persist log filters; add source attribution plumbing; add a smaller plugin-specific storage byte budget before the global budget.
- `615b79df3375bf9db2924a8003f61a747721c725` — support-dialog scope/community warning copy. Reviewed; no transferable Risu-family idea promoted.

## Meaningful adopted invariant

### Source-scoped request observability with bounded noisy-source storage

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `MEDIUM`
- Difficulty: `LOW`
- Size: `S`
- Evidence: `HIGH`
- Risk: `MEDIUM`
- Dependencies: `NONE`
- Priority: `P1`
- Lifecycle status: `ADOPTED`
- Source evidence: official PocketRisu commits `222911203581270ad4657b4d98e0f474a00b4ef3`, `2deffd1f63d0b118dcbaa299b124b4efe79706ca`
- Benefit: request diagnostics cover non-main request owners without letting a high-volume plugin source crowd out the entire bounded log store; provider keep-alive padding no longer makes valid logged responses look empty.
- Conflict/risk: request logs can contain sensitive prompt/response material and source attribution can broaden exposure; preserve masking/redaction, bounded retention, explicit source ownership, and do not treat logging as an authorization bypass.
- Validation need: source-tag attribution tests; plugin-budget rotation must retain newer plugin rows while not deleting unrelated source rows; global budget still applies; masking/redaction remains effective; leading-whitespace trim must not alter meaningful payload bytes after the first non-whitespace byte.
- Follow-up: preserve this as an observability invariant when adding future provider/plugin request paths. New sources should declare a source owner and appropriate retention pressure rather than silently joining an unbounded generic bucket.

## Cursor / history

This was a forward-only review. It does not change historical-backfill completeness markers.
