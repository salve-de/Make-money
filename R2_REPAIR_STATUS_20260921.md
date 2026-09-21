# R2 handoff repair - 2026-09-21 JST

Status: q39 scheduled storage and 25-item API arrival are proven; UI acceptance and main integration remain with the coordinating task. Do not equate local parser verification with deployment.

## Latest confirmed state — q39 and local parser handoff

- The existing scheduled Writer saved q39: `run_r2queue_20260921T060537Z_q39`. The scheduled receipt/readback evidence is retained under `/private/tmp/r2-live-audit.mfgRor/q39.scheduled-receipt.json` and `/private/tmp/r2-live-audit.mfgRor/q39.scheduled-readback.json`; no manual q39 PUT was performed.
- The 25 q39 entities reached the local Foundation API. UI acceptance for those 25 and integration into main are still pending with coordinating task `01a0c092-3996-7bb0-8261-266be038a37a`.
- Shared helper commit `6a3330bb417ea09fe84391714e1272086af67a05` and parser/wiring commit `5d4cb009963ab715419f0e200aaa9506c5cb47aa` passed targeted Vitest (4 files / 41 tests), ESLint, and `tsc --noEmit --incremental false` locally. These commits are not deployed or pushed by this task.
- Fixed40 scope is unchanged: 31 saved business runs, 677 distinct IDs, 9 remaining artifacts classified as normalization3 / evidence-mapping1 / subject-identity1 / incomplete-original2 / audit-only2, and 19 named `NEEDS_RESEARCH` holds.
- Canonical R2 originals remain unchanged. No deletion, overwrite, new Cron, billing change, production app deployment, GitHub push, or new collection scope was performed.

The time-stamped sections below are historical observations. In particular, “next 15:20 pending” describes the state at that time and is not the current q39 status.

## History — 15:30 JST — actual scheduled arrival proven; q39 name quality remained

- Actual hourly:20 v19 event logged06:23:07.626Z, outcomeok/cron20*, applicationPARTIAL due knowna1/b2/c3 skips; q39 and historicald4 processed. q39 receipt06:23:01.125Z SUCCESS,25entities/25evidence,102CREATED/0identical/102readbacks,25newviewscomplete. No manual q39 PUT.
- Independent GET-only readback06:25:43.966Z verified all102 object bytes/SHA against receipt and fetched25 views. Canonical bundleSHA408cc220adb06f697d9703da487c441df297ed1544118ddd05f74a3f1ff949dc/150183bytes. Privateq39.scheduled-receipt.json, q39.scheduled-ids.json, q39.scheduled-readback.json andscheduled-v19.jsonl.
- Parent local25 API PASS06:26:55.468Z (7listpages/25details/failed0/strictFoundation), no overlap with677→702distinct IDs. This proves automatic storage and API arrival, NOT correct names/UI completion.
- Independent representativeUI exposed all25 q39 canonical_name values are upstream internal IDs despite explicit normalized.Entity.id/name in source. q39.name-diagnosis.json maps all25; example sourceent_company_c2e9ba83a0ae5808c355 named ECA Texas multifamily portfolio / Elowen Capital became storedent_company_0abb9196ea4d33196d0f with sourceID as name. Current localmaterialize hash exactly matches actual stored bundle: parser priority, not later source change.
- Structured Claim arrays in normalized wrappers also produce0 typed claims because object extraction is gated on __audit_record; other structured types are still in preserved row snapshots, not erased. Exact source data remains inobservations. Name repair and any structured-field scope are under parent coordination; no q39 original overwrite/new manual correction yet. Do NOT end heartbeat or claim full UI completion until this quality issue is handled.

## History — 15:15 JST — local677 acceptance complete; scheduled proof remained

- Parent additional50 API PASS at06:12:39.745Z:3list pages/50details/failed[], strict Foundation source. No overlap with previous627: total677distinct IDs accepted. Representative l12Pallet andm13ConradKacsik both rendered local detail→actual execute-link click→six steps/FIND...EARN. Not677 individually inspected screens.
- No recovery batch remains running. v19 is live; next15:20 genuine scheduled new-candidate R2/API/UI proof is the remaining operational acceptance. Source/identity/research holds are explicitly retained and not promoted to complete data.

## 15:12 JST — all50 recovered,677 saved IDs

- recover-null50 batch57915 finishedexit0. l12 25IDs:438readbacks/233created205identical; m13 25IDs:332readbacks/180created152identical. Same original inputs through normal preparation/persist replay bothcreated0 andall770readbacks; both serving projectionscomplete. No immutable overwrites or fallback histories.
- l12 canonicalSHA19f7dfdedc92527a07e85b1eedfdd99cd8dc70c82f9214595907bea0177ee6dd/135921bytes; m13 b9f3f31c0e09141d98d71f51368f351af56aacb2123f1bfecd9622d865559153/130786bytes. Private `.null-recovery/.null-replay/.null-projection.json` files contain proofs and IDs.
- Fixed40 ledger regenerated06:11:47.470Z:31 saved business runs/677distinctIDs;9remaining artifacts (normalization3, q18mapping1, q34identity1, original incomplete2, audit-only2). Nineteen named research holds retained. Parent verifying only the additional50 APIs; prior627 PASS remains separate. l12 representativePallet browser detail→execute6steps already independently passed.
- Livev19 e6c4a45e enabledtrue; next15:20 real scheduled new-candidate proof pending. Tail session14750 writes sanitized scheduled-only events toscheduled-v19.jsonl; oldtail13709 stopped/replaced. Existingheartbeat:25 active and refreshed. No new manualq37+ save.

## 15:02 JST — v19 live, authorized50 recovery running

- Existing Writer v19 deployed from89f9166: e6c4a45e-7e55-453c-a815-efa62fa421cd. Health returnsenabledtrue/versionv19. Cron remains20 * * * *. No website deployment/newcron/push. Prior rollback versionv18=9a6e0120-ec49-49d8-afca-bb042cfecd45.
- Parent localmain1b7396cf1eef7f291f8e6aafdbab26b25bf7ac5d includes wiring,79tests/tscPASS. Existing627 local API evidence remains valid; added50 local acceptance still pending.
- Fresh GET-only l12/m13 full plans770 objects passed0conflicts (205/233 and152/180 identical/absent). After deployment ended, started /private/tmp/r2-live-audit.mfgRor/recover-null50.ts --apply (execsession57915). Do not start a duplicate batch. It saves create-only, verifies bytes/hash, reruns same original input to provecreated0/allreadbacks, then projects views.
- Private receipts are l12/m13.null-recovery.json, .null-replay.json, .null-projection.json. Receipt absence is not zero writes. Only after complete readbacks/replay/view should ledger and local50 acceptance be marked complete.
- Existing heartbeat r2 ACTIVE/hourly:25 refreshed with current permissions/status;15:20 genuine scheduled new-arrival proof still pending. No q37+ manual pre-save.

## 14:55 JST — v19 preparation and completion authorization

- User explicitly requested completion; parent released the prior Writer-deploy/50-case-write wait. This task alone may update the existing Writer and recover l12/m13 create-only. No app deployment/newcron/push/overwrite/delete. Next real scheduled run15:20; q37+ manual pre-save remains forbidden.
- prepareScheduledBundle now wires the pure helper only for incoming missing MoneySignal unit/amount_label, with its GET charged to the900-operation invocation budget. Existing canonical bytes are never parsed/transformed. Incoming two-field completion is reusable only when its entire serialized bytes equal existing canonical bytes; normal preflight independently re-reads all objects. Other differences remain ordinary conflicts.
- Initial save followed by same-input replay passes withcreated0/allreadbacks; wrong business value rejects and stored original remains unchanged. Sixfiles50tests and tsc passed. Parent reviewed this boundary without blocking findings. v19 config prepared, not yet deployed; live/health stillv18 enabledtrue.

## 14:46 JST review follow-up

- f418cd1 review found status normalization inconsistent between success recognition and search-only rights/notes. Shared result/status/state normalization now handles case, whitespace and semicolon suffix for both; accepted search-only variants force metadata_only even if incoming rights claim raw permission. Raw bytes remain absent and UNVERIFIED stays unchanged.
- 28 parser tests, typecheck, focused ESLint and diff check passed. Fixed83262f q38 still25/25 schema/count/determinism PASS with unchanged8f32ca89 hash; old q23/q22r1/q20/q35/q36 hashes all unchanged. Follow-up is local only; production v18 remains unmodified.

## 14:43 JST update — q38 read-only materialization passed

- Hold fix b3a75ed passed independent re-review and partner integrated it into localmain0ea79aa44da62eb844a5bd8ce896cee2d083bf2d; no production Writer deployment.
- Separate parser candidate identifies only explicit R2QueueCandidateBatch/NormalizedCandidateManifest audit roles. Mixed/unknown roles, duplicate audit types, absent/duplicate candidate IDs, invalid rows and declared-count mismatch fail closed; existing individual audit joins remain unchanged.
- Actual q38 also uses exact success_search_extract_only for Allspring. Added that metadata observation outcome without fact-verification promotion or raw-body claims. Unknown/failure outcomes still reject; original UNVERIFIED retained.
- Read-only GitHub commit83262f3880f8c3b2d65bd4cedff61b0f9570a454 q38:25 entities/25 evidence, source evidence IDs unchanged, identical output to explicit individual-row route, canonical schema PASS, same-input deterministic. Bundle SHA2568f32ca890ff22a409f1b94c5b55534e280f5ffa37508e4d3ff0b68a737fad68f,114826bytes. This is NOT an old-bundle hash comparison because prior q38 parsing failed.
- Old successful q23/q22r1/q20/q35/q36 bundle SHA regressions all identical. Real R2 PUT0. Actual scheduled q38 still has only the failed v18 receipt; new parser not deployed.

## 14:33 JST update — reviewed candidate, not deployed

- Actual v18 14:20 q38 receipt at05:20:22.763Z is SKIPPED_NOT_READY, planned/created/readback0. Input has25 normalized_candidates but2 recorded_items explicitly typed R2QueueCandidateBatch/NormalizedCandidateManifest; current parser compares audit rows to individual candidates. No q38 manual save. This remains a separate read-only diagnosis, not fixed by the hold patch.
- Candidate Writer catches only successfully read/hash-verified immutable mismatches, writes explicit input/version-bound conflict holds and continues. Holds never assert successful save or zero prior writes. Auth/network/readback failures remain failures. Existing holds no longer monopolize pending priority; changed input can be re-evaluated. Many arbitrary holds may still exhaust the40-call budget; no unbounded progress guarantee.
- Independent review requested tree/content consistency: live GitHub payload.sha must match the tree blob SHA before JSON enters the cache; changed/deleted inputs fail without creating a hold. Hold proof fields/hashes and incomplete/null counters are validated fail-closed.
- Forty-artifact fixture with3 existing holds reaches2 normal successors in13 GitHub calls. Tests cover mid-read queue/source changes, partial writes before conflict, real post-PUT readback failure, and corrupted holds.
- l12/m13 preparation helper is NOT wired into Writer. GET-only normalized full plans passed: l12 438=205identical+233absent; m13 332=152identical+180absent; conflicts0, real PUT0. Actual storage is still held.
- Local627 API acceptance is complete as recorded below. Current candidate only changes code/tests/docs; no additional deployment, R2 write or main integration by this task.

## 14:05 JST update

- Partner completed627-ID local acceptance at05:00:50.042Z: localhost3000,7 list pages,627 details,failed[],strict Foundation source. Representative browser list/detail/six execution steps also passed. All627 APIs are verified, not all627 rendered detail screens individually.
- Partner localmain0e0441af2c873c6ffc0130038a43ffdaecff5b51 clean includes6297b3b inventory docs. This checkout does not change rootmain.
- Authorized next step is preparation/dryrun/tests only for l12/m13 null omission; no new R2 writes or deployment yet. A pure helper checks canonical bundle absence, fills only absent unit/amount_label fields, preserves actual strings/empty strings/null and rejects coercion. Existing bundle bytes are returned unchanged without parse/regeneration, and read errors propagate. Worker is not wired to it.
- Seven helper tests plus17 existing Writer tests, typecheck and focused ESLint passed. Real R2 GET-only full-plan normalized preflight is running. k11 recognition remains a read-only design, not an implemented automatic fallback. Production v18 and14:20 monitoring unchanged.

## 13:56 JST update

- Fixed40 inventory finalized: 29 saved/projected business runs, 627 distinct entity IDs. Historical 11 original bundles reprojected after exact SHA verification; q32 uses its corrected bundle separately. Manifest `/private/tmp/r2-live-audit.mfgRor/fixed40-acceptance.json` at04:56:08Z sent to partner for one all-ID local API comparison. Local all627 acceptance remains pending.
- Legacy batch completed: f6/g7/h8/i9/j10/q33, 97 IDs,760 readbacks (472created/288identical), all projections complete. l12/m13 remain incomplete: full GET-only preflight found22 MoneySignal differences, all stored unit:null/amount_label:null versus incoming omitted fields; no business-value changes, no overwrite, no fallback applied.
- k11 manual history39 remains saved/projected. Normal retry still conflicts at one entity evidence_ids and one bundle warning (Merged91 versus25 after manifest reference deduplication). Current GitHub receipts remain v1/v2 SKIPPED_NOT_READY; future scheduled replay can stop here. Do not confuse manual recovery with automatic stability. No automatic fallback was introduced.
- Remaining11 artifacts are explicitly classified in `docs/worklogs/R2_FIXED40_ACCEPTANCE_20260921.md`: normalization3, technical conflict2, evidence mapping1, multi-entity identity1, incomplete originals2, audit-only2. Nineteen named NEEDS_RESEARCH cases within saved runs remain upstream holds.
- Partner reports rootmain c9dc286 clean, strict Foundation API working and visible list/detail/execution UI PASS after local read-transport repair and foreground browser verification. Full627 local acceptance is separate and pending.
- Production remains v18, existing14:20 JST scheduled proof pending. No new app deployment, Cron, billing change, deletion or GitHub push. No R2 write batch is still running.

## 13:36 JST update

- Production Writer v18: 9a6e0120-ec49-49d8-afca-bb042cfecd45, enabled=true, existing hourly minute-20 only. d8f8bb3 fixes explicit old artifact manifests, q34r1 audit counters and SUCCESS_RESTRICTED_FULLTEXT metadata without upgrading verification.
- Actual v17 13:20 scheduled tail outcome=ok but application status=PARTIAL: q37 and a1/b2/c3 skipped, d4/e5 processed existing data. q37 receipt at 04:20:22Z has writes=0 due one restricted-fulltext metadata status. Real q37 now dry-runs25 successfully, but was NOT manually persisted. v18 actual scheduled new-candidate proof awaits the next existing run.
- q32 all25 control/view readbacks completed, and partner independently verified local API exact per-entity corrected evidence IDs for all25 at04:17:20Z. Prior manual local241 plus q32 acceptance are distinct from k11's pending local acceptance.
- getPlatformProxy consecutive R2 operations now reproduce EADDRNOTAVAIL. Single GET can still succeed. Recovery uses the existing Keychain wrapper and existing S3 readR2Object/putR2ObjectCreateOnly instead; secrets are never logged. This is a local transport issue, not evidence of corrupted stored data.
- Fixed legacy recovery batch f6/g7/h8/i9/j10/l12/m13/q33 runs serially using that guarded transport. f6 completed10 entities,98 readbacks,55created/43identical and serving projection. Receipt absence during earlier transport failures was NOT proof of zero writes; idempotent resumed readbacks account for existing partial data.
- Batch receipts/holds are tracked in /private/tmp/r2-live-audit.mfgRor/legacy-batch-summary.json. All40 inventory remains in progress. Final local list100 verification encountered the same dev-proxy EADDRNOTAVAIL/503; partner owns that reader diagnosis and final integration, not a canonical rewrite.
- Existing heartbeat r2 updated with current status and stop conditions; unchanged hourly :25 cadence, no added Cloudflare Cron.

## 13:15 JST update

- Writer v17 deployed: 4dbcab7f-d6a2-45eb-a6ae-29cb1e039a0c, existing hourly minute-20 schedule and enabled=true. No app deployment. Actual 13:20 scheduled new-candidate persistence remains unverified.
- q32 corrected canonical bundle projected to 25 new views. All 25 dry-runs passed; 25 independent controls and 25 entity views applied with matching byte/hash readbacks. Original canonical records unchanged. Local consumer verification assigned to partner, not claimed here. Final reviewed consumer fixes b01c938/280cf1f included.
- k11 recovered through hash-pinned bundle/Journal-only history: 181 CREATED/readbacks, existing core reread unchanged, 39-target serving progress complete, no unresolved IDs. Remote proxy emitted two hung-runtime warnings during projection retries; final progress completed, but independent local consumption remains required.
- p16 local23/23 now verified by partner; local accepted manual recovery total241 before k11/q32 checks.
- Helper implementation commit cd6bf5a; existing scheduled conflict checks not loosened. Additional old artifact manifest formats f6-j10/l12/m13 are now identified for targeted hydration, not research absence. Fixed 40-queue snapshot is the acceptance scope; do not manually save new arrivals before the real scheduled proof.

## 13:04 JST update (supersedes older status)

- Local consumer task independently verified 218 IDs (previous 171 + q36 25 + o15 22), list and detail source=foundation_lake, zero failures. This is manual-recovery acceptance, not new scheduled-write proof.
- o15: 22 entities, 90 create-only objects/readbacks, 22 completed views. Three research holds and one blocked governance proposal were not invented as companies.
- p16: 23 entities, 94 create-only objects/readbacks, 23 completed views; local verification assigned to partner. Two research holds retained.
- Legacy source/object-evidence/single-artifact fixes committed as bbdbee6. Existing q23/q22r1/q20/q35/q36 materialization hashes unchanged. Partner consumer commits 8201eec and 8d0bb1f locally cherry-picked; 34 focused tests and typecheck passed.
- Writer v17 configuration and build dry-run are prepared, NOT deployed. Production remains v16. Partner review found three correction-control defects; wait for reviewed fix before q32 apply or Writer deployment.
- q32 original and corrected canonical bundles both hash-verified. All 25 product views are absent at their exact R2 keys, so correction dry-run stopped without writes. No q32 view/control has been changed. After reviewed fix, project the corrected canonical bundle through the existing projector, dry-run every entity, then apply guarded correction.
- k11 39-entity schema passed but preflight stopped before PUT: one immutable core entity differs only in evidence_ids. Existing ent_business_07708565692be1d79bd9 must not be overwritten or assigned an invented new ID. Need an existing-contract bundle/Journal history path; currently held, not recovered.
- q18 still has 20 unresolved evidence locators; source attempts use shared/qualified purpose strings and lack explicit evidence-ID mapping. Do not guess one-to-many associations.
- v15 d4/e5 SUCCESS receipts also exist, but describe previously stored/projected data, not new candidate writes. The latest q36 scheduled attempt was SKIPPED_NOT_READY. All-history and new scheduled-write acceptance remain unfinished.
- Private evidence: /private/tmp/r2-live-audit.mfgRor/{o15,p16}.recovery.json, matching projection JSON, q32.view-dryrun.json, k11.entity-conflicts.json. R2 writes exclusively owned by this task; partner owns local API/UI and integration. No GitHub main/push authorization, public app deployment, added Cron, deletion or billing changes.

## 12:36 JST update (supersedes status below)

- main 88532eb includes the earlier repair. Coordinating task verified all 171 recovered IDs in local list and detail APIs, source=foundation_lake, failures=0 at 03:24:49Z.
- Actual 12:20 v15 scheduled q36 receipt finished 03:20:22.774Z, SKIPPED_NOT_READY, writes=0. Its source_run_paths=[] is hardcoded by the skip-receipt builder, not proof that sources were absent.
- q36 separated audit recorded_items from normalized_candidates. Writer selected audit summaries instead of the full candidates. The repair joins them by explicit ID, rejects ambiguous/mismatched inventories, and recognizes explicit upstream secondary/relay/sponsored/conflict success statuses without promoting verification status.
- q36 manual recovery: 25 entities, 152 CREATED objects, all 152 byte/SHA-256 readbacks matched. Projection created 25 views, complete=true, unresolved=0. Private receipts: /private/tmp/r2-live-audit.mfgRor/q36.recovery.json and q36.projection.json. These are not scheduled success evidence. Local q36 verification assigned to integration task.
- Writer v16 deployed: f6cded2a-d936-4891-b1a6-34a74233320e. Existing hourly minute-20 schedule unchanged, enabled=true. No app deployment. 28 focused tests, tsc and deployment dry-run passed.
- Actual v16 scheduled success remains unverified. q32 original remains unchanged and its correction remains unfinished. Integration task owns derived-view correction code; this task exclusively owns R2 writes.
- Read-only inventory pinned GitHub 0f77b8a5b2c611d0916d127f77e11fd01c69aaae found other old unmaterialized inputs. The audit CLI does not yet hydrate artifact_path bundles like production (n14 therefore shows a false-negative); do not call that run unrecovered or all historical inputs complete.

## Current production

### q32 append-only canonical correction at 12:44 JST

- Created a corrected research-bundle under existing registered prefix: `datasets/ds.business.research-bundles.derived/v1/2026/09/21/run_r2queue_20260920T230234Z_q32_evidence_correction_20260921.json`.
- SHA-256 `b5b5a5e8746fd7cd28545be55abae4b637cf4b01c0f7f02f2ba338eb16b4698d`, 190,213 bytes. One bundle plus 185 Journal records created, all 186 byte/hash readbacks matched.
- Old bundle was read from R2 and matched fixed original SHA before writing. All entity/claim/metric/money/event/relationship/observation bodies and IDs match except evidence_ids; correct 54 evidence bodies are an identical subset of old 1,350. All old typed objects and original bundle remain untouched.
- Existing Journal supersedes/notes and bundle quality.warnings preserve original key/hash lineage. No new canonical schema, bucket or root prefix.
- Consumer view correction and persistent replay guard are being implemented by integration task. Do NOT call existing UI references corrected yet. Old deployed Publisher v4 is still HTTP200/event-driven and may invoke old app projection; deployment/coordination boundary remains to resolve before claiming durable correction.

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

## Current remaining boundary

- q39 scheduled R2 persistence and 25-item API arrival are complete evidence. The remaining acceptance is the coordinating task's UI check and main integration; this task does not claim either.
- Fixed40's 677 IDs, nine classified artifacts, and nineteen research holds remain the fixed acceptance scope. No new queue or candidate scope is being added.
- q32 and other historical research/evidence holds remain separately accounted for. Repairing the reader does not rewrite existing stored records; canonical originals and prior hashes remain unchanged.
- The local helper/parser commits are ready for parent integration but are not deployed or pushed. No credential values may be printed, and raw HTML/PDF preservation must not be inferred from metadata-only evidence.
