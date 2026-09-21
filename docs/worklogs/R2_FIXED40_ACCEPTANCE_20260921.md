# R2 fixed-40 acceptance — 2026-09-21

Status: **q39 scheduled storage, local list/detail consumer acceptance, local main integration of consumer commit `e1b60eb`, and coordinating-task browser confirmation complete**. This records evidence and explicit holds, not a claim that every local screen has passed.

## Current confirmed state

- q39 was saved by the existing scheduled Writer run `run_r2queue_20260921T060537Z_q39`; its read-only receipt/readback artifacts are `/private/tmp/r2-live-audit.mfgRor/q39.scheduled-receipt.json` and `/private/tmp/r2-live-audit.mfgRor/q39.scheduled-readback.json`. No manual q39 PUT was performed.
- Root main fast-forwarded cleanly from `b6bad7c43ca6a95b9242cd606202ebf8d6d5b0f9` to consumer commit `e1b60eb5cb40dc601edbc91662dbaeba56aef94c`; both worktrees were clean at that integration point. The source helper/wiring commits `6a3330bb417ea09fe84391714e1272086af67a05` and `5d4cb009963ab715419f0e200aaa9506c5cb47aa` are included through candidate commits `d699133` and `c29155f`.
- Root `localhost:3000` read-only q39 detail check at `2026-09-21T07:47:07Z`: 25/25 HTTP 200, `q39.name-diagnosis.json` names25/25, IDs preserved25/25, Claim25/Metric26/Money20/Event25/Relationship1, snapshots25, issues14, failures0. Total18.08s; p95 0.99s; max3.08s. Report: `/private/tmp/r2-live-audit.mfgRor/q39.candidate-api-report.json`.
- The same e1b60eb list path was measured through seven paginated pages: HTTP 200 on every page, failures0, q39 rows25/25 and non-ID names25/25; per-page6.00–10.48s, total60.88s, no timeout. Report: `/private/tmp/r2-live-audit.mfgRor/q39.candidate-list-pages-report.json`.
- Consumer acceptance: 6 files/44 targeted tests, `pnpm typecheck` (tsc plus schemas:check), targeted ESLint, full `pnpm lint`, and `git diff --check` passed. No deploy/push or R2 write was performed.
- Coordinating-task IAB tab17 confirmed the q39 detail heading `ECA Texas multifamily portfolio / Elowen Capital`, preserved observation, and financial-unpublished/unknown display at `localhost:3000/?entity=ent_company_0abb9196ea4d33196d0f`; its execute link rendered the same name and all six steps. The prior stopped tab16 error page is not current evidence.
- Fixed40 remains unchanged at 31 saved business runs / 677 distinct IDs, with 9 classified remaining artifacts and 19 named `NEEDS_RESEARCH` holds. No new scope was added.
- Canonical R2 originals were not overwritten or deleted. `shasum -a 256 data/entities-index.json` returns the protected SHA `5b9ecc23f47150534032b4bc1d8a6651938c0d2a978e55b871c36597b1c1ebd4`. No new Cron, billing change, production app deployment, or GitHub push was performed.

## Scope and evidence

- GitHub `salve-de/universal-foundation`, `automation-research`, pinned commit `0f77b8a5b2c611d0916d127f77e11fd01c69aaae`: 40 top-level queue artifacts. New q37+ is a separate real-scheduled acceptance lane, not manually pre-saved.
- Private evidence directory: `/private/tmp/r2-live-audit.mfgRor/`. `fixed40-acceptance.json` maps all40 artifacts to receipts,677 IDs and specific holds. Earlier627 API check passed05:00:50.042Z; additional50 passed06:12:39.745Z (3list pages/50details/failed[], strict Foundation source).
- R2 canonical originals remain create-only. Serving projections are derived views. A projection receipt alone is not a local API/UI check.
- Historical 12 successful bundles were independently read from R2 with matching receipt bytes and SHA-256 (`historical-bundle-readbacks.json`). This is not a fresh readback of every historical typed object.
- Manual recovery receipts and actual scheduled receipts remain separate. No new Cron, public app deployment, GitHub push/main write, billing change, deletion or immutable overwrite was performed by this task.

## Storage inventory

The31 saved business runs represent677 distinct entity IDs, not677 deduplicated real-world companies. Earlier627 API acceptance passed at05:00:50.042Z; added50 passed06:12:39.745Z with3list pages/50details/failed[], strict `source=foundation_lake`. The sets have no overlapping IDs. API checks are not677 individually inspected browser screens.

| Runs | Saved IDs | Evidence / limitation |
|---|---:|---|
| d4, e5 | 1, 7 | Historical bundle readbacks |
| f6, g7, h8, i9, j10 | 10, 12, 20, 10, 20 | Manual create-only readbacks and completed projections |
| k11 | 39 | 181 bundle/Journal readbacks; immutable core retained; projection completed; normal scheduled replay is blocked below |
| l12, m13 | 25, 25 | Null-default create-only recovery:770 readbacks,413created/357identical; same-input replaycreated0 and770 readbacks; both projections complete |
| n14, o15, p16 | 25, 22, 23 | Manual receipts; o15 has 3 named research holds, p16 has 2 |
| q17, q19, q20 | 25, 22, 27 | Manual receipts; q19 has 3 research holds |
| q21, q22r1, q23, q24 | 22, 24, 23, 23 | Respective research holds: 3, 1, 2, 2 |
| q25, q26, q27, q28c | 25, 25, 24, 24 | q27/q28c each retain 1 research hold; q28c has legacy epoch timestamp |
| q29, q30, q31 | 24, 25, 25 | Historical bundle readbacks and renewed projections completed; q29 has 1 research hold |
| q32 | 25 | Corrected append-only bundle and Journal: 186 readbacks; 25 controls and 25 views verified; partner local API exact evidence sets 25/25 PASS |
| q33, q35, q36 | 25, 25, 25 | Manual receipts and completed projections |

The six newly recovered runs f6/g7/h8/i9/j10/q33 total 97 IDs, 760 object readbacks: 472 created and 288 already identical. Existing identical objects can include earlier partial writes; missing receipts never proved zero writes.

## Nine remaining artifacts (not concealed as success)

| Runs | Classification | Why not another completed saved business run |
|---|---|---|
| a1, b2, c3 | Source normalization hold | Queue-resolution/governance rows lack explicit canonical identity or evidence mapping. Rechecks are not automatically new business cases. Source artifacts retained. |
| q18 | Evidence mapping hold | 25-case run has unresolved exact evidence/source associations; shared purpose strings are insufficient proof. No guessed associations or partial success claim. |
| q34 | Subject identity hold | Multi-company entity arrays lack an explicit canonical primary subject. No choosing the first company or invented ID. |
| q22 | Superseded empty artifact | Explicit q22r1 correction identifies the incomplete original; original remains untouched. |
| q28 | Invalid placeholder retained | Not a JSON business bundle; q28c is separately accounted for. |
| q33r1, q34r1 | Audit-only corrections | Allowlisted counter changes validated against originals, not additional businesses or R2 write proof. |

Nineteen named research holds inside otherwise saved runs are upstream `NEEDS_RESEARCH` items. Names are retained in the private manifest and source artifacts; they are not asserted as saved by those runs.

The former l12/m13 technical hold is resolved: incoming-only absent unit/amount_label completion gave whole-plan conflicts0. Create-only save verified l12 438 objects (233created205identical), m13 332 (180created152identical), then the same original inputs replayed withcreated0 and all770 readbacks. Existing canonical bytes were not normalized or overwritten. Per-run proof files: `.null-recovery.json`, `.null-replay.json`, `.null-projection.json`.

## Historical scheduled-operation notes

The bullets in this section preserve earlier observations. Phrases such as “Next15:20 real scheduled proof is pending” describe the state before q39 and are not the current status.

- Current Writer v19 e6c4a45e-7e55-453c-a815-efa62fa421cd from89f9166 is deployed, healthenabledtrue, unchanged hourly:20. It includes conflict holds/continuation, cohort/status parser and exact-byte null replay. Next15:20 real scheduled proof is pending. The50 recovery above is manual, not scheduled success.

- q38 passed read-only validation at GitHub83262f3880f8c3b2d65bd4cedff61b0f9570a454:25 entities/25 unchanged evidence IDs, schema/count and same-input determinism PASS; bundle SHA2568f32ca890ff22a409f1b94c5b55534e280f5ffa37508e4d3ff0b68a737fad68f (114826bytes). The parser is now deployed in v19 but q38 was not manually saved.

- 14:20 v18 actual q38 receipt at05:20:22.763Z: SKIPPED_NOT_READY, R2 planned/created/readback0. The old parser miscompared25 normalized candidates and2 typed batch/manifest audit rows. This remains failed scheduled evidence, not expansion of fixed40.
- Deployed v19 conflict handling continues after genuine immutable mismatches, validates hold evidence and tree/content SHA consistency, and leaves authentication/connectivity/readback failures as failures. A40-artifact fixture with3 existing holds reaches2 normal successors using13 GitHub calls. Actual scheduled continuation remains to be observed; arbitrary many holds are not guaranteed to drain in one invocation.

- Actual v17 13:20 JST invocation ran, but q37 was `SKIPPED_NOT_READY`, writes zero, because restricted-fulltext metadata status was not recognized. Invocation outcome `ok` did not mean candidate save success.
- k11 full GET-only preflight: 337 planned, 334 identical, 1 absent, 2 conflicts. One Entity differs only in evidence IDs. The preserved bundle also says `Merged 91...` while current de-duplicated candidate hydration says `Merged 25...` in one warning. Do not mutate the old bundle to erase this distinction.
- Before v19's first run, GitHub has only old skip receipts for k11/l12/m13. l12/m13 now pass real ordinary-path replaycreated0; k11's actual differences should become explicit holds instead of stopping other runs. Verify the scheduled outcome rather than treating manual recovery as that proof.
- Automatic entity-only fallback was deliberately not introduced after full preflight found the second conflict. Any later repair must preserve original data, identify preserved bytes separately from identical bytes, reject unrelated fact changes, and keep invocation budgets.
- q28c historical `retrieved_at` remains the 1970 epoch sentinel. Its receipt/hash match does not establish timestamp quality.

## Local acceptance and ownership

Coordinating task `01a0c092-3996-7bb0-8261-266be038a37a` owns local main integration and list/detail/UI checks. This task owns R2 writes. Partner localmain1b7396cf1eef7f291f8e6aafdbab26b25bf7ac5d includes v19 code. Prior627 and added50 API checks passed separately. Visible Amy/Pallet/ConradKacsik detail→actual execute-link click→six execution steps passed independently. These are representative screens, not677 individual screen checks. No simultaneous edits to partner checkout or root main.
