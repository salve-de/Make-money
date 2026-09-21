# Production catalog integration — in progress

## Current scope and evidence — 2026-09-21 11:47 JST

The owner clarified the acceptance path: Web ChatGPT scheduled research -> immutable R2 persistence -> local application reading, browsing and execution. Additional production-app deployment and billing changes are out of scope. v0 activation and the 2,050-record revision remain deferred.

- PR #45 was normally merged as `a85634c5cdd5f95ca83a483ca250ffc9cd8c4775`; root main was fast-forwarded. Final CI lint, typecheck, unit, Workers build and E2E all passed. The earlier pending/failure entries below are historical, not current failures.
- Before that scope clarification the app was deployed as version `7d86eb96-1452-455d-8b94-11aad6d7144a`, tag `main-a85634c`. All 31 production catalog pages returned 3,085 unique IDs matching the manifest. Later requests exposed intermittent Cloudflare CPU-limit error 1102. Production stability is NOT proven; no additional deployment or plan change is being made for local acceptance.
- Local root main on port 3000 reads live Foundation R2 through `/api/businesses`. Amy's Kitchen (`ent_company_ccade80e595347e0fbc6`) rendered its evidence-tab text about the Santa Rosa closure and 260 affected jobs. The source run is `run_r2queue_20260920T100142Z_q19`; recovery receipt and completed 22-entity projection were inspected. This is recovered real-source data, not proof of a new automatic scheduled run.
- Local execution previously reduced R2-only cases to identity-only plans. The follow-up reads the existing serving view, validates its schema and identity, applies the existing publication/public-field boundaries, and carries planning context into execution. Port 3002 browser verification confirms the R2 case reaches the six-step workspace with source context. Unknown facts remain unknown; no research data was modified.
- Follow-up source tests: seven passed; TypeScript and focused ESLint passed. Full regression and main integration are still required.
- Concurrent R2 repair (writer scheduling, resumable persistence and financing-vs-revenue adapter) remains separately owned and unintegrated at this checkpoint. Its manual recovery must not be called scheduled success. Preserve the other task's root untracked audit script.

The sections below record the prior implementation chronology.

### Local pipeline follow-up — 11:52 JST

- Integrated R2 task commit `219f83a` as `edcbce3`, preserving main's full SHA journal IDs and source-time publication assignment when resolving overlaps. All 560 unit tests, 11 Foundation tests, 16 architecture tests and six recovery tests passed.
- A full local readback initially failed on page two with `Network connection lost`. The existing page/new-arrival readers launched up to hundreds of R2 reads concurrently. Both now use an eight-in-flight ordered reader. Five view tests (including 301 ordered reads and failure propagation), TypeScript and focused lint passed.
- Repeated the actual local API readback at port 3002 after the change: four pages, all 171 IDs from q19/n14/q17/q23/q22r1/q20/q35 recovery receipts matched; zero missing, all responses reported `foundation_lake`. This includes the four financing-only cases previously hidden by the revenue misclassification.
- PR #46 is the integrated candidate. Its final CI/main promotion and the next scheduled Writer run are still pending. No additional production-app deployment occurred.

Scope: finish the accepted product and one authoritative main. Deferred only: v0 activation and the 2,050-record curation revision. Neither protected source JSON nor its deferred stash was modified.

Branch: `codex/production-catalog-20260921`, worktree `.worktrees/main-consolidation`, based on main `f44c776`. Root main remains unchanged; its unrelated untracked `scripts/audit-scheduled-handoffs.ts` belongs to another task.

## Implemented, not yet released

- Immutable content-addressed private R2 catalog preparation, publication/readback and runtime readers; checked-in manifest pinned to accepted source SHA-256 `5b9ecc23f47150534032b4bc1d8a6651938c0d2a978e55b871c36597b1c1ebd4`.
- 3,341 schema-valid source records; 3,085 after publication gate and alias removal. Do not promote rejected records or adopt deferred data to increase the count.
- `/api/catalog` 100-record pages and whole-catalog search; lazy dossier read by real stored SHA-256; Discover and approval candidates use the pinned release in Workers. Public/premium boundaries retained.
- Home now uses the same publication gate as API. This reveals a pre-existing homepage bypass: Keyence, PDF.ai and Disco were rendered despite failing the API publication gate. Known unpublishable deep links now show an explicit notice and a blank-plan link rather than displaying unverified financial claims. Source data was not changed.
- Removed fabricated `dossier_<id>_v1` hashes that caused detail 404s; added schema/identity checking on immutable dossier reads.

## Evidence so far

- `pnpm test`: 515 unit tests, 11 Foundation tests, 16 architecture tests, offline synthetic recovery checks passed before the last small UI edits.
- Focused catalog tests: pagination, search beyond initial page, stale cursor, read failure, hash tamper and corrupt gzip passed.
- Typecheck and lint passed at intermediate checkpoints. Re-run after final edits.
- `catalog:prepare` and `catalog:check` passed; 3,087 objects planned (3,085 dossiers + summaries + Discover).
- R2 publication completed: all 3,087 immutable objects were read back and verified. No canonical source objects were overwritten.
- Workers preview on port 3187 read all 31 catalog pages: 3,085 unique IDs, matching the declared total, no `meta` field in public summaries. Browser search and on-demand Photo AI dossier display passed against remote R2.
- Added shared full-catalog predicates for grid, batch, tag, screener and bookmark conditions, plus compact-name/founder search. Cancelled queries cannot replace the next-page cursor. Targeted catalog/filter tests: 23 passed; typecheck and targeted ESLint passed.
- Full test rerun exposed an outdated non-SHA hash fixture (400 is now correct for malformed input) and a premium-route unit test doing an unintended 59 MB filesystem read. Corrected the fixture to a valid absent SHA and isolated that authorization unit test's catalog dependency; rerun pending.
- Subsequent full unit run: 521 tests in 76 files passed, including selected-dossier preservation after paged summaries. Foundation's 11 tests passed; remaining architecture/recovery stages are running with final build.
- First full browser suite: 35/45 passed. Failures identified (a) SSR full dossier downgraded to summary, fixed with a regression test; (b) ambiguous Ahrefs text selector, corrected to exact-name child; (c) detail API array accepted via a cast and crashing on missing ID, replaced with runtime schema + identity validation. Full rerun is required; these are not waived failures.
- Workers API filters verified against remote R2: SOLO total 1,770, ENTERPRISE total 145, one requested bookmark total 1; all returned rows satisfied the condition.
- Workers browser reached Photo AI execution workspace with FIND → BUILD → LIST → DISTRIBUTE → SELL → EARN and local-save controls. No v0 generation was invoked.
- Replaced remaining page filesystem readers in Playbook, Partners, Radar and Radar detail with the same accepted-catalog reader. Macro content remains explicitly labelled reference examples (its aggregator does not compute statistics from entities).
- Added whole-catalog tag/batch choices to SSR; counts explicitly labelled loaded records, Foundation filtering limited to loaded new arrivals. Accepted catalog filters query all 3,085 records. The Foundation-only UI request no longer transfers a redundant full legacy catalog on provider failure.
- Final unit stages completed: 521 unit, 11 Foundation, 16 architecture, synthetic recovery + 6 recovery tests passed; one additional Foundation-only failure test passed in the focused 18-test rerun (522 total unit tests now). Final Workers bundle and secret scan passed before the last URL-selection-only fix, which passed ESLint and TypeScript.
- Second local E2E run stopped deliberately after 17 passed / 5 failed / 23 not run. One real remaining race reopened a closed deep-linked inspector when catalog rows arrived; fixed by applying each URL navigation once, not on each data arrival. Other failures were operation timeouts under observed concurrent machine load, not waived; independent CI/full rerun must establish acceptance.
- Stopped only this task's Wrangler preview (PID 44451, port 3187) and interrupted this task's E2E runner (PID 52862). Other project servers and production were left running. Browser tab 13 was last on the preview ledger/screener; its session was reset after a tooling timeout.

## Required before completion

### 2026-09-21 CI follow-up

- Candidate `6e6b431` pushed in PR #45. GitHub lint, typecheck, unit tests and Workers build passed. E2E was 44/45 on both GitHub and the independent local rerun; the sole failure was the collected-inbox button disappearing when the first page contained no collected rows.
- Keep that filter entry available even with zero loaded candidates; label its count as loaded, not whole-catalog total. The existing anonymous-approval regression also verifies that clicking it requests the filtered catalog successfully. Full CI re-run is required after this fix.
- Writer health now reports enabled `r2-writer.v13`, changed by the concurrent R2 audit task. This task has not redeployed the writer; coordinate its separate source integration rather than overwriting the live fix with the older main writer.
- Review identified that `next dev` emulates Cloudflare with production vars. Added an explicit development-mode local-reader guard and tests covering both emulated dev and real production/standalone contexts. The production R2 path is unchanged.
- Concurrent R2 audit identified a blanket raw-file preservation claim in SourcesSection even for metadata-only evidence. Replaced it and the fabricated missing-source fallback with explicit source-record / original-file-verification boundaries; added an E2E assertion. No source data changed.

1. R2 publication/readback and initial Workers runtime proof completed. Do not republish unchanged artifacts unnecessarily.
2. Finish/re-run Workers build after final edits, then full E2E and browser verification.
3. Update E2E fixtures/assertions that incorrectly expect Keyence's unbound VERIFIED finances to bypass publication gating. Preserve financial rendering, evidence, notes/recovery, navigation and filter coverage using currently publishable records; add explicit rejected-case assertions. Photo AI is publishable after reconciliation and is now the default featured case. Do not weaken gates to keep old tests green.
4. Re-verify the newly server-backed whole-catalog filters and paging in final browser build, query cancellation, errors, incomplete-data notices and all tag/batch choices. Loaded-count boundary is explicit; macro reference examples are not presented as live all-catalog statistics.
5. Verify all accepted product routes, production submission/persistence/auth boundaries, scheduled R2 → API → UI operation; v0 only is deferred.
6. Commit candidate changes for independent CI, then require all checks/review before normal merge into main (no protection bypass), deploy matching code, fast-forward root main, verify hashes and final state. Candidate is not deployed; local E2E failure evidence must not be described as success.

No claim of completion is made by this worklog.
