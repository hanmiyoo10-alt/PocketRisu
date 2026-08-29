# Forward review — RisuBard cancellable auxiliary model jobs

Source: `rpaddict/RisuBard`
Reviewed cursor range: `40b66b2e1ee149a60ef14f1654237aa0e5d6ffc6..c1259e98bbb6b27697e2e891a96b5cb230c5bff8`
Meaningful commit: `c1259e98bbb6b27697e2e891a96b5cb230c5bff8`

## Transferable invariant

Long-running auxiliary model work must have one cancellation owner whose signal propagates all the way to the provider request. Cancellation must also prevent retries and post-request publication from continuing. When the job is resumable, user cancellation should preserve a resumable/paused state rather than recording an ordinary failure.

RisuBard demonstrates this by returning an `AbortSignal` from its wiki-generation owner, threading it through memory-analysis requests, suppressing error/failure recording on aborted operations, and persisting a reboot job as `paused` when cancellation occurs.

## PocketRisu applicability

A bounded code search of `hanmiyoo10-alt/PocketRisu` did not identify a matching BardWiki/memory-analysis job owner or an existing auxiliary-model job with the same lifecycle. This is therefore an architectural invariant rather than a direct port candidate today.

## Guardrails

- Do not infer that every model request should become cancellable through this mechanism; scope cancellation ownership per long-running job.
- A cancel signal must not accidentally cancel the user's primary chat generation unless that is the explicit job owner.
- Cancellation must stop retry and publish/finalization paths, not only the first request.
- Resumable jobs should distinguish `paused/cancelled` from `failed` so recovery logic does not treat user intent as corruption.

## Result

Recorded as `AUXILIARY-MODEL-JOB-CANCELLATION-OWNERSHIP` with lifecycle `HOLD` pending a matching PocketRisu-owned job boundary or reproducible stuck/non-cancellable auxiliary workflow.