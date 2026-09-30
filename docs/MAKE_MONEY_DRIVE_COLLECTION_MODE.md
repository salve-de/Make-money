# Active Make-Money Drive Collection Mode

Updated: 2026-09-30 JST

The four research lanes currently persist canonical JSON into an append-only Google Sheets ledger inside Google Drive. Scheduled GitHub create-only persistence repeatedly encountered the OpenAI action-safety write gate, and the first raw-file bridge could create a temporary Doc but did not complete the Scheduled content-write step. This does not change the long-term Universal Foundation -> R2 architecture and does not auto-publish Drive research into the Make-Money UI.

Schedules remain:
- DISCOVERY :00 hourly
- BACKFILL :10 hourly
- MONITOR :20 hourly
- VERIFY_RECONCILE :30 hourly

R2_QUEUE tasks remain paused for this mode.

Current Drive SSOT:
- JSON Ledger spreadsheet id: `1zDeV8-XpsroXWxAg3j3w92dyiMiK2f7ZcPX3LgDtwKo`
- manifest v3.1: `1299f1b821G-TljIgVgyUI9CDk1SiYAq7`
- case schema v1.1: `1nxsXwlmCw841n8zO4WjZcA-Ab_GIrjiQ`
- media-use-decision.v1 schema: `12Dt88HtHdZjxdYNYQiqxlZOFS2ZHqjTO`

The ledger separates `CasesIndex`, `Claims`, `Runs`, `Payload`, `DedupeReview`, and `MediaIndex`. Canonical JSON is stored in <=40,000-character Payload chunks with SHA-256; indexes are routing projections. Raw `.json` Drive folders remain secondary export/review surfaces, not the Scheduled success path.

The collection model now includes stable-identity/case-fingerprint dedupe, 90-minute append-only claims for existing-case lanes, uncertain-duplicate quarantine, and per-case media candidates with asset/use/jurisdiction rights metadata.

Canonical operational details live in Universal Foundation:
- `docs/MAKE_MONEY_DRIVE_COLLECTION_MODE.md`
- `docs/MEDIA_THUMBNAIL_AND_LIKENESS_POLICY.md`
- `schemas/foundation/media-use-decision.v1.schema.json`

No Drive record is automatically PUBLIC. `verified` means factual verification, not public-media/publication permission.
