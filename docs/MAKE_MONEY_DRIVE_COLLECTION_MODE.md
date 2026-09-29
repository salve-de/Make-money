# Active Make-Money Drive Collection Mode

Updated: 2026-09-30 JST

The four research lanes currently persist raw JSON to Google Drive because scheduled GitHub create-only persistence repeatedly encountered the OpenAI action-safety write gate. This does not change the long-term Universal Foundation -> R2 architecture and does not auto-publish Drive research into the Make-Money UI.

Schedules remain:
- DISCOVERY :00 hourly
- BACKFILL :10 hourly
- MONITOR :20 hourly
- VERIFY_RECONCILE :30 hourly

R2_QUEUE tasks remain paused for this mode.

Current Drive SSOT:
- root folder id: `1RKmgSZo-4ZG_mMjJHYf9Ah6lOlZQ4hsF`
- manifest v2: `1so2gceMyM6MAplRGJUzwenPvrOf5gatu`
- case schema v1.1: `1nxsXwlmCw841n8zO4WjZcA-Ab_GIrjiQ`

The collection model now includes stable-identity/case-fingerprint dedupe, 90-minute append-only claims for existing-case lanes, uncertain-duplicate quarantine, and per-case media candidates with asset/use/jurisdiction rights metadata.

Canonical operational details live in Universal Foundation:
- `docs/MAKE_MONEY_DRIVE_COLLECTION_MODE.md`
- `docs/MEDIA_THUMBNAIL_AND_LIKENESS_POLICY.md`
- `schemas/foundation/media-use-decision.v1.schema.json`

No Drive record is automatically PUBLIC. `verified` means factual verification, not public-media/publication permission.
