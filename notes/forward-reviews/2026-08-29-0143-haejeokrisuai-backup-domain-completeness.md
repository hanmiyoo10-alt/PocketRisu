# Forward review — HaejeokRisuai backup-domain completeness

Reviewed authoritative forward range:

- Source: `nevaeh5379/HaejeokRisuai`
- Branch: `main`
- Previous cursor: `f982424e9dc542c4fed013f66fd5642593c53a3e`
- Reviewed HEAD: `56b0385ce70bb0acf1475a7f34679b13d07a8173`
- Range: 4 commits, forward-only

## Meaningful evidence

### 1. Every durable domain must participate in backup classification and all supported backup writers

`5ddf12b9e5129186486ceee42363a896e23a6188` and `e6465f500f755dea89141b6a3dba73408a8bf113` add `.risuinlay` as an explicit backup entry kind in shared backup policy and Android-native handling, then distinguish signature inlays from media inlays during parsing. This is evidence for the existing `STORAGE-DEFERRED-DOMAIN-COMPLETE-SNAPSHOT` idea rather than a new independent idea.

Reusable invariant: a persistence/backup format is complete only when every durable logical domain is explicitly covered by its classification/allowlist and by every supported writer/restore path. A newly added durable domain must not fall through to generic asset handling, and typed non-media records must not be interpreted as media merely because they share a container family.

### 2. Export completeness must hydrate shallow character state

`9b150a269a757e0dd20c10267396383ae4d3793b` and `56b0385ce70bb0acf1475a7f34679b13d07a8173` hydrate unloaded character details into the export target before serialization and add regression coverage. This independently reinforces the existing invariant that shallow runtime projections are not complete persistence/export snapshots.

### 3. Async media helpers must settle for already-complete and failed images

The same commits harden `writeInlayImage` against already-complete images and image errors so a promise cannot remain unresolved forever. PocketRisu does not currently expose the same named owner in code search, so this remains source-specific evidence rather than a port-ready candidate.

### 4. MCP tool-call decoder fix

`9b150a269a757e0dd20c10267396383ae4d3793b` also fixes opening `<tool_call>` tag stripping so payload content is not truncated. Parser/tool-call decoding is security-sensitive; no autonomous implementation is authorized from this evidence alone. No matching PocketRisu owner was found in the bounded inspection.

## Classification merge

Existing idea: `STORAGE-DEFERRED-DOMAIN-COMPLETE-SNAPSHOT`

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `HIGH`
- Difficulty: `MEDIUM`
- Size: `M`
- Evidence: `MEDIUM`
- Risk: `HIGH`
- Dependencies: identify PocketRisu snapshot/export/restore owners; enumerate every durable domain and backup classification path; define authoritative hydration reads; validate native/web format parity
- Priority: `P1`
- Lifecycle status: `DESIGN_NEEDED`
- Source evidence: `nevaeh5379/HaejeokRisuai` `391c2574df6170dd91a5e68624ae8c9b5afb6be1`, `fdd175297d23a1cd83e7e0484f04d0dbecf5c431`, `5ddf12b9e5129186486ceee42363a896e23a6188`, `e6465f500f755dea89141b6a3dba73408a8bf113`, `9b150a269a757e0dd20c10267396383ae4d3793b`, `56b0385ce70bb0acf1475a7f34679b13d07a8173`
- Benefit: prevents silent omission or mistyping of deferred/new durable domains in backup/export and keeps logical exports complete regardless of runtime hydration state
- Conflict/risk: incorrect domain enumeration or fallback classification can produce incomplete backups or reinterpret typed records; storage/restore mistakes are potentially destructive
- Validation need: domain inventory tests, backup classifier parity tests, shallow-vs-fully-hydrated export equivalence, native/web round-trip parity, fail-closed missing-domain tests
- Follow-up: improve assistant-owned design; do not implement until concrete PocketRisu owners and executable acceptance tests are identified

## Progression decision

Design evidence improved, but readiness does not change: `DESIGN_NEEDED` remains correct because `Risk: HIGH` and PocketRisu's concrete complete-snapshot owner/domain inventory are unresolved. No feature branch, implementation, tests, or personal-fork PR were created.

`HISTORICAL_BACKFILL_COMPLETE_THROUGH` is unchanged because this was a forward review.
