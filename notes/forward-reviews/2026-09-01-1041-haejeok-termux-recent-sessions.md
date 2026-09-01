# Forward review — HaejeokRisuai 398dcec0 → 20fc61f2

Reviewed source: `nevaeh5379/HaejeokRisuai:main`
Previous authoritative cursor: `398dcec0de070c8e615b85015f3c9cb49a3e0e16`
Reviewed through: `20fc61f274e7d7f94ac8db41930b44f305514a41`

## Commits reviewed

- `963f59f38fab187721937885faa13692dd3904ed` — recent-sessions backend parity for web SQLite + Node PostgreSQL/Oracle and lazy-hydration-safe session navigation.
- `75d3da1a03b30ae934dbb8939dad5740264728a1` — first-class Android/Termux server deployment with a released runtime bundle, private PostgreSQL, `termux-services`/runit, localhost-only default binding, explicit LAN opt-in, and CI syntax checks.
- `20fc61f274e7d7f94ac8db41930b44f305514a41` — merge of the above branches.

## Meaningful idea

### TERMUX-RUNIT-LOCALHOST-DEPLOYMENT

- `System impact`: `SYSTEM_UPDATE_REQUIRED`
- `Importance`: `HIGH`
- `Difficulty`: `HIGH`
- `Size`: `L`
- `Evidence`: `MEDIUM`
- `Risk`: `HIGH`
- `Dependencies`: current PocketRisu server-phone/runit ownership inventory; authoritative persistent-data and backup-domain inventory; supported Termux/Node/PostgreSQL version policy; listen/LAN exposure ownership; release checksum policy; explicit user authorization for any future system/package/runtime migration
- `Priority`: `P2`
- lifecycle status: `DESIGN_NEEDED`
- source evidence: `nevaeh5379/HaejeokRisuai` `75d3da1a03b30ae934dbb8939dad5740264728a1`, merged by `20fc61f274e7d7f94ac8db41930b44f305514a41`
- benefit: gives the server-phone workflow a reproducible containerless deployment model while preserving runit and a localhost-safe default; separates released application runtime from persistent data and makes LAN exposure explicit
- conflict/risk: host package/runtime/database changes can strand data, break startup, expose the service, or conflict with the existing PocketRisu server-phone setup; this is outside autonomous implementation gates
- validation need: fresh supported-Termux install; reboot/runit ownership; localhost negative remote-connect test; explicit LAN enable/disable; interrupted install/update recovery; upgrade/rollback with persistent data preserved; backup + clean-context restore; disk/package failure handling; artifact checksum verification; server-phone RSS/CPU/storage/idle measurements; confirm no Android notification path
- follow-up: design only. Helper dossier: `products/pocketrisu-helper-mod/docs/features/deployment/termux-runit-localhost-deployment/DESIGN.md`. Do not implement until the user explicitly authorizes a narrower system/package/runtime migration.

## Other reviewed change

`963f59f3...` demonstrates a useful generic lesson: a lazy-hydrated UI cannot use an in-memory object graph as a complete fallback for durable recent-session metadata, and backend capability parity must cover every supported storage implementation. This is currently source-feature-specific and no matching PocketRisu recent-sessions surface was established in this pass, so it is retained here as evidence rather than creating a duplicate/unsupported port candidate.

## Guardrail check

The Termux source uses `termux-services`/runit rather than PM2 and defaults the Node server to localhost. No autonomous code implementation was attempted because the idea is `SYSTEM_UPDATE_REQUIRED` and `Risk: HIGH`. Existing PocketRisu save/integrity, keepalive, V3 reload, and server-phone notification guardrails remain untouched.

## Cursor / backfill

Advance only the Haejeok forward cursor to `20fc61f274e7d7f94ac8db41930b44f305514a41`. The other ten Active sources were compared against their authoritative cursors during this run and were identical. `HISTORICAL_BACKFILL_COMPLETE_THROUGH` is unchanged because this was a forward review.
