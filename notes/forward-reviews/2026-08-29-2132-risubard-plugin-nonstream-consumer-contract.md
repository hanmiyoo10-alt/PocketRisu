# Forward review: RisuBard plugin non-stream consumer contract

- Reviewed source: `rpaddict/RisuBard:main`
- Previous authoritative cursor: `5f5f80348509a034acb318563fb52ebef188a3f0`
- Reviewed through: `40b66b2e1ee149a60ef14f1654237aa0e5d6ffc6`
- Commit count reviewed: 1

## Meaningful evidence

`40b66b2e1ee149a60ef14f1654237aa0e5d6ffc6` (`release: prepare 0.9.9`) contains a real compatibility fix in addition to release metadata. In the plugin-provider request path, if a provider returns a `ReadableStream` while the caller explicitly requested `useStreaming === false`, RisuBard now drains that stream with the existing stream collector and returns the completed text as a normal success response. A regression test asserts that the non-stream branch consumes the stream before the generic streaming return path.

The same release also aligns a BardWiki prompt contract with its validation schema. That part is BardWiki-specific and is retained as supporting evidence for the already-known general rule that prompt/output contracts and validators must not contradict each other; it does not warrant a duplicate PocketRisu idea.

## Deduplicated idea

Feature-ID: `PLUGIN-NONSTREAM-CONSUMER-CONTRACT`

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `MEDIUM`
- Difficulty: `LOW`
- Size: `XS`
- Evidence: `MEDIUM`
- Risk: `LOW`
- Dependencies: matching PocketRisu-owned plugin/provider request path in which a streaming provider can satisfy a caller that explicitly requested a non-stream response; reproducible mismatch or parity test
- Priority: `P1`
- Lifecycle: `HOLD`
- Source evidence: `rpaddict/RisuBard` `40b66b2e1ee149a60ef14f1654237aa0e5d6ffc6`
- Benefit: preserves caller response-shape contracts across plugin providers, avoiding empty/failing internal jobs when a provider streams regardless of the caller's requested mode.
- Conflict/risk: indiscriminately buffering streams can increase memory/latency and would be wrong for true streaming callers. The conversion must be owned strictly by the explicit non-stream consumer boundary and must preserve cancellation/error semantics.
- Validation need: identify the current PocketRisu plugin-provider owner, reproduce a provider-stream/caller-nonstream mismatch, and test complete text collection plus error/cancel propagation while keeping normal chat streaming unchanged.
- Follow-up: keep on HOLD until the matching PocketRisu owner and failure path are demonstrated. If found, the first slice should be one regression test and the minimal response-shape adapter only.

## PocketRisu inspection

Bounded search of `hanmiyoo10-alt/PocketRisu` did not find the RisuBard-specific `requestPlugin` / `statusStream` / `collectStreamingText` ownership pattern. No implementation branch or code change is justified from external evidence alone.

## Cursor decision

Advance the RisuBard forward cursor to `40b66b2e1ee149a60ef14f1654237aa0e5d6ffc6`. This is forward-only and does not alter historical backfill coverage.
