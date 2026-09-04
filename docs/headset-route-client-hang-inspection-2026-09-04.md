# Headset route client-hang inspection — 2026-09-04

## Context

A headset route change reproduced PocketRisu infinite loading while the main SSH tunnel and server health remained good and the live model-job database contained no recent job for the incident. Request-log storage is live but stale since August, so the next diagnostic moved to deployed client request and generation-state code.

## Deployed source findings

INSPECT_ONLY source inspection on the server-phone checkout confirmed:

- `fetchNative` is defined in `src/ts/globalApi.svelte.ts` around line 1969, with `fetchNativeRaw` immediately below it.
- Multiple streaming request implementations call `reader.read()` directly, including OpenAI, Anthropic, Google, shared helpers, `jobFetch`, and `src/ts/process/index.svelte.ts`.
- `src/ts/process/index.svelte.ts` has a main stream reader around lines 1518/1615.
- generation state is an in-memory `Map<string, GenState>` in `src/ts/process/generationState.ts`.
- `startGeneration(...)` inserts a live generation and `endGeneration(...)` removes it; there is no persistence or external watchdog in `generationState.ts` itself.
- if a request/stream await never returns and no terminal cleanup path runs, the generation entry can remain present indefinitely and continue feeding the global `doingChat` compatibility state.
- `requestChatDataMain(...)` resolves ModelPreset/classic mode first. ModelPreset calls `requestModelPreset(...)`; classic falls through to the legacy model path.

## Current interpretation

This inspection does not yet prove the exact hang site, but it establishes the structural condition required for the observed symptom: a browser-side fetch or stream read that never settles can prevent later `endGeneration(...)` / `clearPendingSend(...)` cleanup from running, leaving the UI in an infinite-loading state while the backend remains healthy.

The next high-value inspection is the deployed `fetchNative` / `fetchNativeRaw` implementation plus the surrounding main-stream loop and terminal cleanup blocks in `src/ts/process/index.svelte.ts`. The key questions are:

1. whether direct/proxy fetch attempts have a bounded timeout that survives Firefox/Android route changes;
2. whether `reader.read()` is protected by timeout/abort logic;
3. whether terminal generation cleanup is guaranteed by a top-level `finally` or can be skipped when an awaited stream never resolves.

No automatic page reload is to be added as recovery.