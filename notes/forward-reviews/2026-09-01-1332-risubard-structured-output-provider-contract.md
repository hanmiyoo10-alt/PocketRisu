# Forward review — RisuBard structured-output provider contract

Date: 2026-09-01
Source: `rpaddict/RisuBard:main`
Authoritative prior cursor: `f1ad9f75407e48e8053908ad7ab58fa94ff5faf6`
Reviewed through: `5340a96440689893bedf6ad6de5a1d30b7c231f0`
Forward commits reviewed: 2

## Meaningful evidence

Primary implementation commit: `c9b7b6f81b6f5672ba7832f740f46a8489ba7541` (`feat: add resilient Bard Lore analysis`). Release commit: `5340a96440689893bedf6ad6de5a1d30b7c231f0`.

The transferable part is not Bard Lore itself but the provider boundary used for schema-constrained model output:

- provider registration explicitly advertises native structured-output support (`structuredOutput` capability);
- opted-in providers receive a normalized response-schema contract while non-opted-in providers keep the compatibility prompt path;
- the host preserves the prompt-level schema instruction as a compatibility fallback rather than assuming every provider accepts a native schema field;
- a native-schema rejection retries at most once with only the native field removed, while keeping the request marked as structured output;
- ordinary text post-processing is not applied to structured JSON responses because newline/escape rewriting can corrupt valid JSON;
- tests cover opt-in/non-opt-in behavior and bounded fallback.

PocketRisu search on current `develop` found no corresponding `structuredOutput` / `response_schema` provider contract, so this is not classified as already adopted.

## Deduplication

This is distinct from the existing generic `Bound retry/fallback state machines` idea. That item concerns bounded request retries generally. This candidate defines a provider-capability contract and JSON-preservation invariant at the structured-output boundary. The one-retry rule is supporting evidence for the older retry idea but not sufficient to collapse the two records.

## Classification

- Feature-ID: `PROVIDER-NATIVE-STRUCTURED-OUTPUT-CONTRACT`
- System impact: `NO_SYSTEM_UPDATE`
- Importance: `MEDIUM`
- Difficulty: `MEDIUM`
- Size: `S`
- Evidence: `MEDIUM`
- Risk: `MEDIUM`
- Dependencies: PocketRisu plugin-provider API inventory; current structured-output/prompt-schema ownership; provider-specific error classification; exact response post-processing path
- Priority: `P2`
- lifecycle status: `DESIGN_NEEDED`
- source evidence: `rpaddict/RisuBard` `c9b7b6f81b6f5672ba7832f740f46a8489ba7541`, release `5340a96440689893bedf6ad6de5a1d30b7c231f0`
- benefit: allow capable plugin providers to use native schema enforcement without breaking providers that only support prompt-based JSON constraints; reduce malformed structured output while keeping compatibility and bounded retries
- conflict/risk: misclassified provider capability can break requests; broad fallback can hide real provider failures; generic text transforms can corrupt JSON; schema objects must not leak secrets or mutate provider semantics
- validation need: contract tests for opted-in vs legacy provider, exact single fallback only on schema rejection, no retry on unrelated errors, JSON escape/newline preservation, streaming/non-streaming parity, and legacy provider compatibility
- follow-up: finish PocketRisu provider/request ownership inspection; resolve error-classification and post-processing assumptions; only then consider `READY_TO_PORT`

## Progression decision

Created an assistant-owned design dossier in the helper repository. This remains `DESIGN_NEEDED`: PocketRisu-specific ownership and provider error taxonomy are not resolved, so no production branch, code modification, tests, or personal-fork PR were started.

## Cursor

The RisuBard cursor may advance monotonically from `f1ad9f75407e48e8053908ad7ab58fa94ff5faf6` to `5340a96440689893bedf6ad6de5a1d30b7c231f0` after this review is durably recorded.