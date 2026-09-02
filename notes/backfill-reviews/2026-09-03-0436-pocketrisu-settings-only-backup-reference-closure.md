# Historical backfill review — settings-only backup preserves reference closure

- Reviewed source: `PocketRisu/PocketRisu:develop`
- Source commit: `b6156083aeeda26fe7aace84005d9ded9ea6db5c`
- Current develop checked: `278251f85a19bfdfd4cf3faae780e62682878f9e`
- Review date: 2026-09-03

## Finding

Official PocketRisu added a settings-only backup that removes characters, chats, inlay images, cold-storage character payloads, and character ordering while retaining settings-domain state such as modules, plugins, presets, personas, lorebooks, theme, credentials, and the assets still referenced by that trimmed database.

The important transferable invariant is the asset filtering boundary. The export computes two reference closures from the same trimmed database: one including module assets and one excluding them. Module-only marginal assets are the set difference. This means disabling module assets cannot accidentally remove an asset that is also referenced by a retained domain such as a persona icon. The same plan drives both the estimate shown to the user and the actual export, preventing estimate/export semantic drift.

The current develop branch still contains `stripToSettingsOnly()` / `buildSettingsOnlyPlan()` and a compatibility regression test explicitly asserting that an asset shared by a module and persona survives when module assets are excluded.

## Classification

- Feature-ID: `SETTINGS-ONLY-BACKUP-PRESERVES-REFERENCE-CLOSURE`
- System impact: `NO_SYSTEM_UPDATE`
- Importance: `HIGH`
- Difficulty: `MEDIUM`
- Size: `M`
- Evidence: `HIGH`
- Risk: `MEDIUM`
- Dependencies: `NONE`
- Priority: `P1`
- lifecycle status: `ADOPTED`
- source evidence: `PocketRisu/PocketRisu` commit `b6156083aeeda26fe7aace84005d9ded9ea6db5c`; invariant and focused compatibility test remain on develop `278251f85a19bfdfd4cf3faae780e62682878f9e`
- benefit: portable settings backups stay much smaller than full backups without silently dropping assets that retained settings domains still reference; estimate and produced archive use the same plan
- conflict/risk: incomplete reference discovery can make a filtered backup lossy; adding new asset-bearing settings domains without extending reference discovery can break future exports; credentials are intentionally included, so backup handling remains sensitive
- validation need: assert characters/chats/inlays/cold storage are absent; retained settings domains survive; shared assets survive optional module-asset exclusion; module-only assets can be omitted without removing module definitions; estimate and archive counts/bytes derive from the same plan; every new retained asset domain extends reference-discovery tests
- follow-up: preserve reference-closure filtering and shared plan ownership whenever backup modes, asset domains, or cleanup/reference-discovery code are refactored

## Dedupe boundary

This overlaps the general orphan-cleanup/reference-discovery family but is not the same operation. Cleanup decides what may be deleted from the live store; this invariant decides what a filtered backup must carry so the resulting archive remains closed over references retained in its trimmed database. The two should share reference-discovery knowledge where practical, but neither should silently inherit the other's destructive authority.
