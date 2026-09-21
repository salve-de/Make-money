# R2 fixed-40 acceptance — 2026-09-21

Status: **not complete**. This records storage evidence and explicit holds, not a claim that scheduled operation or every local screen has passed.

## Scope and evidence

- GitHub `salve-de/universal-foundation`, `automation-research`, pinned commit `0f77b8a5b2c611d0916d127f77e11fd01c69aaae`: 40 top-level queue artifacts. New q37+ is a separate real-scheduled acceptance lane, not manually pre-saved.
- Private evidence directory: `/private/tmp/r2-live-audit.mfgRor/`. `fixed40-acceptance.json`, finalized at 04:56:08Z, maps each artifact to receipts, IDs and holds. Historical projection checks finished and the 627-ID manifest was sent for local acceptance.
- R2 canonical originals remain create-only. Serving projections are derived views. A projection receipt alone is not a local API/UI check.
- Historical 12 successful bundles were independently read from R2 with matching receipt bytes and SHA-256 (`historical-bundle-readbacks.json`). This is not a fresh readback of every historical typed object.
- Manual recovery receipts and actual scheduled receipts remain separate. No new Cron, public app deployment, GitHub push/main write, billing change, deletion or immutable overwrite was performed by this task.

## Storage inventory

The 29 saved business runs represent 627 distinct entity IDs; these are IDs, not a claim of 627 deduplicated real-world companies. Local all-ID acceptance passed at 05:00:50.042Z: 7 list pages and all627 details, strict `source=foundation_lake`, no failed IDs. This is API acceptance, not 627 individually inspected browser screens.

| Runs | Saved IDs | Evidence / limitation |
|---|---:|---|
| d4, e5 | 1, 7 | Historical bundle readbacks |
| f6, g7, h8, i9, j10 | 10, 12, 20, 10, 20 | Manual create-only readbacks and completed projections |
| k11 | 39 | 181 bundle/Journal readbacks; immutable core retained; projection completed; normal scheduled replay is blocked below |
| n14, o15, p16 | 25, 22, 23 | Manual receipts; o15 has 3 named research holds, p16 has 2 |
| q17, q19, q20 | 25, 22, 27 | Manual receipts; q19 has 3 research holds |
| q21, q22r1, q23, q24 | 22, 24, 23, 23 | Respective research holds: 3, 1, 2, 2 |
| q25, q26, q27, q28c | 25, 25, 24, 24 | q27/q28c each retain 1 research hold; q28c has legacy epoch timestamp |
| q29, q30, q31 | 24, 25, 25 | Historical bundle readbacks and renewed projections completed; q29 has 1 research hold |
| q32 | 25 | Corrected append-only bundle and Journal: 186 readbacks; 25 controls and 25 views verified; partner local API exact evidence sets 25/25 PASS |
| q33, q35, q36 | 25, 25, 25 | Manual receipts and completed projections |

The six newly recovered runs f6/g7/h8/i9/j10/q33 total 97 IDs, 760 object readbacks: 472 created and 288 already identical. Existing identical objects can include earlier partial writes; missing receipts never proved zero writes.

## Eleven remaining artifacts (not concealed as success)

| Runs | Classification | Why not another completed saved business run |
|---|---|---|
| a1, b2, c3 | Source normalization hold | Queue-resolution/governance rows lack explicit canonical identity or evidence mapping. Rechecks are not automatically new business cases. Source artifacts retained. |
| l12, m13 | Technical immutable-record hold | MoneySignal fixed keys contain `unit:null` and `amount_label:null`; incoming omits these fields. Old data is not overwritten or accepted through an entity-only exception. Full-plan read-only comparison is recorded separately. |
| q18 | Evidence mapping hold | 25-case run has unresolved exact evidence/source associations; shared purpose strings are insufficient proof. No guessed associations or partial success claim. |
| q34 | Subject identity hold | Multi-company entity arrays lack an explicit canonical primary subject. No choosing the first company or invented ID. |
| q22 | Superseded empty artifact | Explicit q22r1 correction identifies the incomplete original; original remains untouched. |
| q28 | Invalid placeholder retained | Not a JSON business bundle; q28c is separately accounted for. |
| q33r1, q34r1 | Audit-only corrections | Allowlisted counter changes validated against originals, not additional businesses or R2 write proof. |

Nineteen named research holds inside otherwise saved runs are upstream `NEEDS_RESEARCH` items. Names are retained in the private manifest and source artifacts; they are not asserted as saved by those runs.

Full read-only planned-object comparison found l12: 438 planned, 193 identical, 233 absent, 12 conflicts; m13: 332 planned, 142 identical, 180 absent, 10 conflicts. All 22 conflicts were only those two omitted-versus-null fields. No real PUT was issued by this diagnostic. Existing partial typed objects do not establish completed bundle/Journal storage for either run.

## Automatic operation remains unfinished

- 14:20 v18 actual q38 receipt at05:20:22.763Z: SKIPPED_NOT_READY, R2 planned/created/readback0. Its25 normalized candidates and2 typed batch/manifest audit rows are miscompared by the current parser. This is new-scheduled acceptance evidence, not expansion of fixed40 or a manually recovered run.
- Undeployed conflict-hold candidate continues after genuine immutable mismatches, validates hold evidence and tree/content SHA consistency, and leaves authentication/connectivity/readback failures as failures. A40-artifact fixture with3 existing holds reaches2 normal successors using13 GitHub calls. Many arbitrary holds are not guaranteed to drain in one invocation.
- Pure preparation-only null default helper passes l12/m13 full GET-only normalized plans with0 conflicts (205/233 and152/180 identical/absent). No real writes or Worker wiring; both remain storage holds.

- Actual v17 13:20 JST invocation ran, but q37 was `SKIPPED_NOT_READY`, writes zero, because restricted-fulltext metadata status was not recognized. Invocation outcome `ok` did not mean candidate save success.
- v18 `9a6e0120-ec49-49d8-afca-bb042cfecd45` supports that exact metadata-only status without upgrading verification or fetching restricted content. Real new-candidate scheduled persistence is still unproven. Existing next cron: 14:20 JST.
- k11 full GET-only preflight: 337 planned, 334 identical, 1 absent, 2 conflicts. One Entity differs only in evidence IDs. The preserved bundle also says `Merged 91...` while current de-duplicated candidate hydration says `Merged 25...` in one warning. Do not mutate the old bundle to erase this distinction.
- Current GitHub tree still contains only v1/v2 `SKIPPED_NOT_READY` receipts for k11/l12/m13. They remain candidates for later normal retries. Raw immutable conflicts can stop a future invocation; manual history recovery does not solve this automatic replay issue.
- Automatic entity-only fallback was deliberately not introduced after full preflight found the second conflict. Any later repair must preserve original data, identify preserved bytes separately from identical bytes, reject unrelated fact changes, and keep invocation budgets.
- q28c historical `retrieved_at` remains the 1970 epoch sentinel. Its receipt/hash match does not establish timestamp quality.

## Local acceptance and ownership

Coordinating task `01a0c092-3996-7bb0-8261-266be038a37a` owns local main integration and list/detail/UI checks. This task owns R2 writes. Partner reports local main `0e0441af2c873c6ffc0130038a43ffdaecff5b51` clean, incorporating the inventory docs. Its627-ID API result is recorded in `docs/LOCAL_MAIN_ACCEPTANCE_20260921.md`; visible list → Amy detail → six execution steps also passed independently. No simultaneous edits to the partner checkout or root main.
