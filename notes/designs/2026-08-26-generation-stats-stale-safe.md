# Design draft — stale-safe generation telemetry

Source evidence: `nevaeh5379/HaejeokRisuai` `a0bfba7b6721057ff2714d58c81ecf95ba1c69ac`.

Classification: System impact `NO_SYSTEM_UPDATE`; Importance `MEDIUM`; Difficulty `LOW`; Size `S`; Evidence `MEDIUM`; Risk `LOW`; Dependencies `NONE`; Priority `P1`; lifecycle `READY_TO_PORT`.

## Problem / evidence
Streaming generations have useful latency/token-rate signals, but naive reactive token counting can add jank and stale async updates can attach metrics to a superseded generation. Haejeok demonstrates a generation-ID-owned store, deferred/debounced tokenization, and stale-update rejection.

## Minimal safe scope
Add optional in-memory generation telemetry only: generation id, selected character/chat identity, model, start/first-token/completion timestamps, output-token estimate, and derived tokens/sec. No persistence and no provider/request behavior changes.

## Ownership boundaries
Browser generation lifecycle owns start/update/complete/cancel. UI only observes matching selected character/chat. Tokenization runs deferred and debounced.

## Mechanism
Every generation receives a unique ID. Store mutation helpers ignore updates whose ID is not current. Token counting is deferred/debounced and disposable. Completion telemetry expires after a bounded display window. Character/chat switching hides mismatched telemetry without mutating chat data.

## Compatibility / invariants
Telemetry must never alter generation text, request payloads, save ordering, DB flush behavior, targeted V3 reload, or cancellation semantics. Stale generations cannot overwrite current stats. Feature removal/revert leaves no persisted state.

## Validation / acceptance
Unit-test stale old-generation updates, cancel, superseding start, completion expiry, and selected-chat mismatch. Measure streaming main-thread cost with telemetry enabled/disabled on a long response; acceptance is no material typing/streaming regression. Tokenizer failure must degrade to elapsed-time-only display.

## Risk / rollback
Low blast radius because state is ephemeral and observer-only. Rollback is removing/feature-gating the widget/store.

## PR decomposition
One small PR: telemetry store/tests + optional floating UI. If measurement shows tokenizer overhead, land lifecycle timing first and defer token count.
