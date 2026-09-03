# STRUCTURED-OUTPUT-REPLAY-POLICY

This is a deduplicated evidence merge into the existing request-safety idea `Bound retry/fallback state machines, including pathological content retries`; do not create a second competing canonical idea for the same underlying replay/fallback boundary.

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `HIGH`
- Difficulty: `MEDIUM`
- Size: `S`
- Evidence: `MEDIUM`
- Risk: `MEDIUM`
- Dependencies: explicit provider-level signal for native structured-output unavailability; a shared validation/parse boundary that can distinguish retryable schema/shape failures from transport/provider failures; preservation of PocketRisu `noRetry` / `toolExecuted` no-replay semantics
- Priority: `P1`
- lifecycle status: `DESIGN_NEEDED`

## Source evidence

- `rpaddict/RisuBard@db8c204b30f338e09634620c707d82ef91932c2c` (`release: v0.9.19`) adds a centralized `runStructuredModelRequest()` policy.
- Native structured output is attempted first; a retryable validation/shape failure may receive one bounded native repair attempt, then one prompt-schema fallback.
- Explicit provider rejection of native structured output falls back immediately to prompt-schema mode.
- Ordinary request failures are not converted into schema fallback.
- `noRetry` or `toolExecuted` results are non-replayable and therefore do not trigger fallback after invalid structured content.
- PocketRisu already carries the important adjacent invariant in `src/ts/process/request/request.ts`: a successful ModelPreset result with `toolExecuted` is returned without outer-loop replay, and request responses can mark `noRetry`.
- PocketRisu provider code already sends native JSON schema for supported Google/OpenAI paths, so the missing design question is policy ownership/failure discrimination rather than whether native schema exists at all.

## Benefit

Centralizing structured-output replay policy would make provider behavior predictable and bounded: use native schema when available, repair only validation failures that are safe to replay, degrade to prompt-schema only when semantically justified, and never duplicate side-effecting tool executions. This is especially useful for auxiliary structured requests and provider compatibility where a native schema feature may exist nominally but be rejected by a specific endpoint/model.

## Conflict / risk

A broad fallback loop could silently multiply requests, cost, latency, or tool side effects. Treating rate limits/network failures as schema incompatibility could hide real outages. Provider-specific APIs do not expose native-schema rejection identically, so error classification must be explicit and conservative. The design must not weaken existing PocketRisu `toolExecuted` / `noRetry` replay guards.

## Validation need

- Unit tests for: valid native response; retryable native validation failure repaired successfully; retryable validation still failing then exactly one prompt fallback; explicit native-schema-unavailable signal then one prompt fallback; invalid prompt fallback with no further retry; ordinary request/transport error with no schema fallback; `noRetry` and `toolExecuted` result with no replay/fallback.
- Provider adapter tests proving only known native-schema-unavailable errors map to the explicit capability failure signal.
- Verify no interaction with normal chat retry/fallback behavior, model fallback lists, cancellation, streaming, or tool-loop side effects.
- Acceptance: total attempts are mechanically bounded and observable in tests; no side-effecting result is replayed; non-schema provider failures remain visible as their original failures.

## Follow-up

Assistant-owned design draft: `products/pocketrisu-helper-mod/docs/features/requests/structured-output-replay-policy/DESIGN.md` in `hanmiyoo10-alt/-`.

Remain `DESIGN_NEEDED` until PocketRisu's schema-validation ownership and provider-specific native-unavailable error mapping are inspected end-to-end. Do not implement automatically yet. If those assumptions resolve cleanly, the smallest safe first slice is a pure policy helper plus unit tests, with provider wiring in a separate PR if needed.
