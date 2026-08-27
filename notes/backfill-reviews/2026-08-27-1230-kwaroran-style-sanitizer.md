# Historical backfill — kwaroran/Risuai parsed-DOM CSS restoration

Date: 2026-08-27
Source: `kwaroran/Risuai:main`
Forward cursor: unchanged at `e565563a288ebe4c65b6099a1645ba477d1c84b4`
Reviewed historical evidence: `90522c67e171f3cce37996f13aed151f22862ed7` (2026-08-08)

## Deduplicated idea

This is additional evidence for the existing parser/security idea: **restore transformed CSS only from call-scoped parsed elements/markers after sanitization, never by raw string reinsertion**. Do not create a second backlog idea.

### Classification

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `HIGH`
- Difficulty: `HIGH`
- Size: `S`
- Evidence: `HIGH`
- Risk: `HIGH`
- Dependencies: PocketRisu markdown/style pipeline audit; security regression matrix for chat/backgroundHTML/translation/edit-display paths
- Priority: `P2`
- Lifecycle status: `DESIGN_NEEDED`

### Source evidence

`kwaroran/Risuai` commit `90522c67e171f3cce37996f13aed151f22862ed7` demonstrates a concrete failure mode in a second sanitization pass: decoded `<style>` CSS containing markup-like text (for example SVG data-URI or CSS content text containing `<...`) could be silently removed by DOMPurify SAFE_FOR_XML behavior. The fix sanitizes once to a DOM, replaces only actual parsed `risu-style` elements with real style elements in-place, and prevents decoded CSS from re-entering the HTML parser. It also adds focused regression tests. The commit explicitly notes a remaining non-idempotence/auto-translation path, so this evidence strengthens the design but does not prove PocketRisu is ready for a direct port.

### Expected PocketRisu benefit

Preserve authored/scoped CSS without weakening the sanitizer boundary or silently dropping valid CSS in repeated render/translation paths.

### Main risk / conflict

Parser and sanitizer changes are security-sensitive. A naive string decode/reinsert can create an HTML parsing bypass; a naive second sanitize can destroy valid CSS. Repeated trim/translation paths may also violate idempotence. This remains outside autonomous implementation gates.

### Validation need

- Audit current PocketRisu `trimMarkdown`/style-marker/translation/backgroundHTML paths before changing anything.
- Test CSS with markup-like text, SVG data URIs, `</style` breakout attempts, marker text inside attributes, malformed hex/CSS, repeated trim, pretranslate+render double-pass, and edit-display regex styles.
- Confirm sanitizer output and style semantics remain stable across repeated calls.

### Follow-up

Merge this SHA into the existing sanitizer/CSS backlog item's source evidence during the next safe full-ledger normalization. If PocketRisu still has the same parsed-string restoration boundary, improve the assistant-owned design dossier first; do not implement automatically because `Risk: HIGH` and parser/security-sensitive work is explicitly gated.

## Backfill coverage

This bounded pass reviewed `kwaroran/Risuai` history around 2026-08-08. It does **not** establish complete source history coverage and does not advance `HISTORICAL_BACKFILL_COMPLETE_THROUGH`.
