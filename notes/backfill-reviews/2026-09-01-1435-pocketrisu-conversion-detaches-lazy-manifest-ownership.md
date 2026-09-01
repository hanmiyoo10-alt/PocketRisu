# Historical backfill review — conversion detaches lazy manifest ownership

Reviewed source: `PocketRisu/PocketRisu:develop`

Commit: `dd718991c4e5344f50f1a7c61f04d3b64c86487e`

## Finding

Character↔module conversion previously copied a lazy asset-manifest descriptor. The converted object therefore retained the source object's backing manifest identity until reload, so editing the copy's assets could rewrite the source owner's manifest. The adopted fix hydrates the manifest-backed asset list into a plain array before conversion, deletes the manifest descriptor from the detached copy, and makes conversion handlers async with re-entry/error handling.

## Durable invariant

**Feature-ID: `CONVERSION-DETACHES-LAZY-MANIFEST-OWNERSHIP`**

When converting, duplicating, exporting-for-edit, or otherwise creating a logically independent persisted object from an object whose large field is represented by a lazy/backing-store descriptor, do not blindly copy the descriptor. Materialize/copy the value when independent ownership is intended, and remove the original backing-store identity from the new object. Descriptor reuse is only valid when shared ownership is explicit and tested.

## Classification

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `HIGH`
- Difficulty: `LOW`
- Size: `XS`
- Evidence: `HIGH`
- Risk: `MEDIUM`
- Dependencies: `NONE`
- Priority: `P0`
- lifecycle status: `ADOPTED`
- source evidence: `PocketRisu/PocketRisu` commit `dd718991c4e5344f50f1a7c61f04d3b64c86487e`
- benefit: prevents cross-object asset corruption after character/module conversion and documents a reusable ownership boundary for future lazy/externalized stores
- conflict/risk: eager materialization can be expensive for very large fields; shared-descriptor reuse may be intentional in other features, so detachment must follow semantic ownership rather than type alone
- validation need: preserve regression coverage that conversion creates an independently editable asset list; test conversion failures/re-entry and verify source manifest is unchanged after editing the converted object
- follow-up: preserve as an adopted invariant whenever additional lazy/externalized domains gain duplicate/convert/export-for-edit flows

## Guardrail check

No change to DB lifecycle flush behavior, `flushServerDbKeepalive()`, save/integrity optimizations, V3 plugin reload, runit/PM2 policy, or Android notification behavior.

## Backfill marker

This is one bounded historical slice. It does not establish complete historical coverage and does not move any forward cursor backward.
