# STORAGE-ROOT-ASSET-PATH-MUST-BE-STRICT-DESCENDANT

- System impact: NO_SYSTEM_UPDATE
- Importance: HIGH
- Difficulty: LOW
- Size: XS
- Evidence: MEDIUM
- Risk: HIGH
- Dependencies: PocketRisu must first have an equivalent filesystem-backed asset read boundary that accepts caller-controlled relative paths; none was confirmed in the current official develop inspection.
- Priority: P0
- lifecycle status: HOLD
- Source evidence: `nevaeh5379/HaejeokRisuai` commit `6b5c2e845ed94b77f3ee231ded940d16723529d9`, merged by `45e1a03d7eab08e69c6f1b32748f09289cd75853` on `main`.
- Benefit: Prevents a path that resolves exactly to an asset storage root (`''`, `.`, absolute root, or a collapsing descendant such as `asset/..`) from passing a naive containment check and reaching filesystem inspection/open operations. The reusable invariant is that asset reads are authorized only for strict descendants of the configured storage root, and rejection must happen before any filesystem access.
- Conflict/risk: Filesystem path validation is security-sensitive. Blindly copying source path logic can create platform-specific separator/case/symlink mistakes or conflict with PocketRisu's different asset-storage architecture. External Risu code is evidence, not authority.
- Validation need: If PocketRisu later exposes an analogous boundary, add tests covering empty path, `.`, resolved root, `child/..`, `../escape`, absolute paths, normal descendants, Windows separators/case behavior as applicable, and verify rejected inputs do not call `exists`, `stat`, or stream-open sinks. Preserve all existing asset manifest/cache semantics.
- Follow-up: Keep as a security invariant reference. Promote only after identifying a concrete PocketRisu caller-controlled filesystem asset path boundary; then require a feature-specific security review/design before implementation despite the XS code size.

## Deduplication note

This is related to general path-traversal and asset-integrity hardening, but distinct from orphan-reference safety and manifest lookup invariants: the authority boundary here is filesystem containment itself, specifically rejecting the storage root as a readable asset target.
