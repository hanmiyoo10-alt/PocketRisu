# Backfill review — Kei-Risu tool pipeline stage ownership

Date: 2026-08-29
Source: `tegy1117/Kei-Risu`
Reviewed historical slice: `c92ae0487254349ff6195a15edaffee1cc1c57e0` and immediate follow-up `c056efb14083d640ee1d54c90b658134c08842d5`
Forward cursor: unchanged at `8d794f9753381ab2582509a6cfb577968a6de595`

## Finding

Commit `c92ae0487254349ff6195a15edaffee1cc1c57e0` adds function-specific tool regex rules with an explicit application-stage selector, keeps legacy module-style regex rules as a separate compatibility path, and removes function-scoped regex records when their owning function is deleted. The immediate follow-up `c056efb14083d640ee1d54c90b658134c08842d5` fixes flag parsing order before metadata handling, reinforcing that transformation-stage ordering is semantic, not cosmetic.

The transferable idea is not to copy Kei-Risu's parser or regex feature. The reusable invariant is that configurable transformations in a tool pipeline need explicit ownership and stage identity: a rule should declare which function owns it and at which well-defined pipeline stage it applies; deleting the owner must remove or invalidate dependent rules; legacy transformation paths must remain distinguishable from the new typed path; and parser/order changes require security review because moving a transformation across an argument/output/presentation boundary can change what is executed, persisted, or shown.

## PocketRisu applicability

A bounded code search in `hanmiyoo10-alt/PocketRisu` found no matching `toolShowInChat`, `functionRegex`, or `ToolEditor` owner. Therefore there is no safe direct port candidate. This remains a design/invariant reference for any future PocketRisu-owned tool/function transformation pipeline.

## Classification

- Feature-ID: `TOOL-PIPELINE-STAGE-OWNERSHIP`
- System impact: `NO_SYSTEM_UPDATE`
- Importance: `MEDIUM`
- Difficulty: `MEDIUM`
- Size: `S`
- Evidence: `MEDIUM`
- Risk: `HIGH`
- Dependencies: matching PocketRisu-owned tool/function transformation pipeline; explicit stage-order contract; security review of argument/output/presentation boundaries; legacy compatibility inventory
- Priority: `P2`
- Lifecycle: `HOLD`
- Source evidence: `tegy1117/Kei-Risu` `c92ae0487254349ff6195a15edaffee1cc1c57e0`, `c056efb14083d640ee1d54c90b658134c08842d5`
- Benefit: prevents ambiguous transformation ordering, dangling rules after owner deletion, and accidental cross-stage behavior if PocketRisu later gains configurable tool transforms
- Conflict/risk: parser/tool-call boundaries are security-sensitive; blindly copying regex stages could alter executed arguments, model-visible results, or user-visible presentation
- Validation need: prove a concrete PocketRisu owner first; enumerate stage inputs/outputs and trust boundaries; add ordering, owner-deletion, legacy-compatibility, malformed-pattern, and no-cross-stage-leak tests before any implementation
- Follow-up: keep as HOLD until a matching PocketRisu-owned pipeline exists; if one appears, draft a security-reviewed stage contract before considering implementation

## Automation progression

Recorded historical evidence and classification only. No implementation branch, tests, or PR were created because the matching PocketRisu owner is absent and the parser/tool-call boundary is explicitly outside autonomous implementation gates.

`HISTORICAL_BACKFILL_COMPLETE_THROUGH` is not advanced by this single-source bounded slice.