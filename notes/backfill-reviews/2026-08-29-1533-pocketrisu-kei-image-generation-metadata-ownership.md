# PocketRisu-Kei historical review — image generation metadata ownership

Reviewed source: `seto-sama/PocketRisu-Kei`

Source commit: `016fad84a24db574ea1dff9caedf48a3157ce735` (`feat(image): persist metadata across generation paths`)

## Evidence

The source had multiple image-generation callers (`clientActions`, scripting, triggers) that previously called the low-level generator and then independently converted the returned image into an inlay. That duplication meant provenance metadata could be attached inconsistently depending on the entry path.

Commit `016fad84...` routes those callers through one `generateAIImageInlay` owner. That owner resolves target character/chat identity and writes `imageGeneration` metadata (`prompt`, `negativePrompt`) before returning the inlay reference. The transfer lesson is not the source helper name; it is the ownership rule: when several entry points create the same durable artifact type, artifact creation plus provenance attachment should have one canonical owner rather than caller-specific post-processing.

## PocketRisu applicability

Bounded search of `hanmiyoo10-alt/PocketRisu` found no `generateAIImageInlay` owner, so there is no demonstrated one-to-one port target. Do not add source-specific metadata fields or generation plumbing by analogy alone.

Useful invariant if PocketRisu owns multiple image-generation-to-durable-asset paths later:

1. durable artifact creation and provenance attachment are one operation from the caller's point of view;
2. all generation entry paths reach the same ownership boundary or an equivalent shared helper;
3. character/chat attribution uses the explicit generation target when supplied, otherwise a well-defined current-context fallback;
4. metadata failure behavior is explicit and tested so an artifact is not silently presented as fully attributable when provenance was not committed;
5. metadata remains descriptive provenance, not authorization or trusted security input.

## Classification

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `LOW`
- Difficulty: `LOW`
- Size: `XS`
- Evidence: `MEDIUM`
- Risk: `LOW`
- Dependencies: matching PocketRisu-owned durable generated-image/inlay path plus demonstrated provenance loss or inconsistent metadata across multiple entry points
- Priority: `P2`
- Lifecycle status: `HOLD`
- Source evidence: `seto-sama/PocketRisu-Kei@016fad84a24db574ea1dff9caedf48a3157ce735`
- Benefit: consistent image-generation provenance across scripting/trigger/UI entry points; easier debugging and later inspection
- Conflict/risk: copying source-specific inlay/schema fields into PocketRisu without an owning artifact model would create schema drift; provenance must not become a security authority
- Validation need: enumerate PocketRisu generated-image persistence entry points, reproduce one metadata-loss mismatch, then add cross-entry-point parity tests around the actual owner
- Follow-up: remain `HOLD`; if PocketRisu later exposes multiple durable generated-image paths, first create a failing parity test and propose the smallest shared-owner slice

## Backfill marker

This is a bounded single-source historical review only. It does not justify advancing `HISTORICAL_BACKFILL_COMPLETE_THROUGH`, and it does not alter any Active-source `Last reviewed HEAD` cursor.
