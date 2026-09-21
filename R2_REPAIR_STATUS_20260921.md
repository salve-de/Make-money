# R2 handoff repair - 2026-09-21 JST

Not complete. Do not equate deployment/materialization with persistence.

## Current production

- Writer v15, version 0002aa94-3302-4f09-bb1e-a9d090e4324c, deployed around 11:35 JST. Existing writer only; no app deployment by this task.
- Existing cron remains `20 * * * *`, enabled true via deployment override.
- Next scheduled production run 12:20 JST. Thread heartbeat `r2` is ACTIVE, checks hourly at minute 25. No added Cloudflare cron or billing changes.
- 11:20 v13 executed and wrote SKIPPED_NOT_READY for q35 at 02:20:22Z. Its single Entity with no embedded ID and search-result-only successful attempt were not recognized. Both formats are now supported with explicit metadata-only provenance; this is not proof of a later scheduled success.
- v11 at 10:20 actually FAILED: Too many subrequests by single Worker invocation, while writing the f6 skip receipt. This is current direct log evidence, not an inferred GitHub rate-limit cause.
- v12 adds invocation-local read caching, avoids GETs for writer receipts absent from GitHub tree, limits GitHub calls to 40, writes version-specific skip receipts, and skips already-retried paths using the tree. A 60-queue test proves the next invocation advances rather than retrying the same prefix.

## Confirmed local real-data checks

- q19: 22 included, 3 research holds, 22 evidence. Indexed source_attempts references now resolve without index shifting on invalid array entries.
- n14: 25 included, 27 evidence. Five artifact_path files contain the actual bundles; their summary rows are not companies.
- q17: 25 included, 28 evidence. normalized wrappers and success_metadata_extract are now supported.
- These 72 items have now been manually recovered in production: 708 immutable objects read back with matching bytes/SHA-256, 574 created and 134 already identical. Canonical research-bundle schema validation passed before writes. No overwrite or delete.
- Existing Make-Money projection generated/updated all 72 serving views. Production list API matched all 72 exact IDs; browser Amy's Kitchen evidence tab displayed the actual plant-closure/260-jobs text. This is manual recovery evidence, not scheduled-run evidence.
- v13 adds an invocation-local R2 operation budget, resumable create-only writes, and mandatory UI projection before SUCCESS. Historical successful storage receipts are SHA-256 checked and projected without rewriting canonical data. AsyncLocalStorage supplies invocation-scoped bindings to existing app projection code without global environment mutation.
- q23/q22r1/q20 add 74 recovered entities, and q35 adds 25: 171 total. Seven local recovery receipts report 1,650 canonical object readbacks (1,481 created, 169 identical). All seven serving projections completed. These are manual recovery receipts, not simulated scheduled successes.
- Production API inventory matched 167/171 IDs. The four missing rows were suppressed because the summary adapter treated funding amounts as sales revenue, then correctly failed the financial evidence gate. Adapter fix retains funding observations while keeping revenue unknown; all four real stored summaries now pass the unchanged public gate locally. App integration/deployment of this fix is not yet claimed.
- v14/v15 add immutable 100-object checkpoints and versioned pending markers. Regression tests prove a 1,001-object plan advances under a 900-operation budget, 60 historical successful receipts do not starve later work, and pending work takes precedence over newer arrivals.
- 41 writer/runtime tests plus 12 adapter tests passed. tsc --noEmit --incremental false, git diff --check and Wrangler deployment passed before handoff; re-run after integration.
- Read-only GitHub connector fetch_file works while gh CLI repository API calls currently fail. Private candidate reads were explicitly authorized. Real-data audit inputs are in /private/tmp/r2-live-audit.mfgRor; do not commit them.

## Still required

- Verify v15's real scheduled receipts, R2 byte/hash readback, API and local rendered UI for exact candidates. 12:20 JST observation pending. Local site consumption is the agreed integration target; public app publication is not required by the coordinating task.
- R2 internal-service subrequest limits are separate from external GitHub calls. Chunked continuation is locally verified, but its scheduled production outcome remains unverified.
- Other historical queue formats/research holds remain. Earlier q32 had excessive evidence associations; repairing the reader does not correct existing stored records. Preserve immutable originals and account for correction explicitly.
- q32 readback matched its original receipt (1,687,274 bytes; SHA-256 656413b1fd19f49101b9aa1161aec2e80e96a70ef12c13a60e80e036dd3424c4). Correct materialization has 54 evidence records, not 1,350. Existing entities/claims/metrics/money/events/relationships differ only in evidence_ids. Originals remain unchanged; no q32 data repair is claimed.
- This candidate is prepared for a local integration commit. It is not yet integrated/pushed to main. Original checkout has concurrent work and must not be overwritten. The root's read-only audit script was copied here for tracking without deleting its original.
- No credential values may be printed. When inspecting tail output, emit only scheduled-event status/logs; omit HTTP request headers and client metadata.
- Structured evidence metadata was stored; this does not prove original HTML/PDF content was archived. UI's generic raw-CAS badge must not be treated as proof.
