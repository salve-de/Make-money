# Agent worklog: reliability boundaries (2026-09-12)

## Scope

- Make-Money の長期保守境界を、Feature単位のcolocation、固定UIと動的Evidenceのhybrid composition、Runtime Schema Validation、pnpm CIへ整理。
- `CompanyInspectorPane` の責務を分離し、プレーンなJ/K銘柄切替ショートカットを削除。現行キーボード契約は⌘K検索とEscape終了。
- Foundation R2を調査データの読み取り正本、D1をユーザー・決済状態、非公開R2を添付・原本・バックアップとして確認。Neonを新規実行時依存にしない。

## Evidence and verification

- Branch: `codex/reliability-boundaries`
- Code state before this worklog: `df23a0326d7a8b0eeb0f44d7a723ac47b487d2e6`
- Worktree was clean and `git diff --check` passed.
- `pnpm lint` (warning-free), `pnpm typecheck`, Vitest 274, Foundation 11, architecture 8, Recovery 6, Next build/Paid 392, OpenNext Worker build and secret scan, deploy preflight, `pnpm audit --prod`, and Playwright Chromium 25 all passed.
- Local Next and a temporary OpenNext Worker preview were inspected in a real browser. The local fallback and Foundation R2 list/detail routes both returned valid data; unknown financials remained `未確認` and the Photo AI detail showed Evidence, Layer 3, and analyst notes.
- D1 remote migration readback reported `No migrations to apply` after 0004/0005. Existing private-R2 backups and verification receipts were read back by bytes and SHA-256 in their recorded runs.

## Integration and external state

- `HEAD` is a descendant of `origin/main`; local `main` can be fast-forwarded after this record is committed.
- The remote branch `origin/codex/reliability-boundaries` does not contain the current HEAD. GitHub push, main-branch CI for this HEAD, production Worker deploy, Stripe production roundtrip, Neon data migration, production restore, and scheduled backup/RPO/RTO operation are not claimed as complete.
- External writes were not retried after automatic review rejected them as writes to private external sources.

## Feedback and retrospective

- User feedback required complete removal of the J/K shortcut, truthful unknown/estimated financial displays, R2-first storage boundaries, and a closure audit based on direct Git, browser, and readback evidence.
- Retrospective: a clean local branch and passing tests are necessary but do not prove remote integration or production recovery. Future changes must preserve the same separation between local verification, remote state, and release state.

## Closure state

This worklog records the local verification state. Chat closure remains `review-required` until the branch is intentionally pushed and integrated, stale worktree registrations are removed with authority, and the external production items above are either completed and read back or explicitly deferred.

## Closure follow-up (2026-09-12)

- The verified commit was fast-forwarded into local `main` at `3d9d91e25a12980452c2f6781f415a57257cdd36`.
- The two stale worktree registrations under `/private/tmp` were pruned after confirming their directories no longer existed. The repository now has one managed worktree and no untracked or uncommitted files.
- GitHub `origin/main` remains at `6267f9140bf15a06cfdfb26833a9fa50ff4836ec`; local `main` is ahead because the external push was not authorized by the automatic review. Remote release and production recovery items remain explicitly unverified.

## Current-state correction (2026-09-12, verified after the historical entries above)

The entries above are historical snapshots and must not be used as the current release state. The current authoritative state is:

- The working branch is `codex/reliability-boundaries`; its worktree is clean and `HEAD` is `73e4131a734f850e76771bb6cf8320f6fdf40830`. `origin/codex/reliability-boundaries` points to the same commit. `origin/main` is still `aa4e64cfb82add1366ad6c0a7185ddb755b6c1e9`.
- PR #18 is open from this branch to `main`, is `MERGEABLE`/`CLEAN`, and has a successful current GitHub Actions run (`34688073287`) for `lint`, `typecheck`, `unit test`, `build`, and `E2E smoke`. It has not been merged.
- The active `main-quality-gates` ruleset requires those five checks with strict status checks. This proves the merge gate exists; it does not prove that this branch is already in `main`.
- The serving index currently contains 121 records. The 135-record wording in Phase 109/111 is historical; staged candidates remain out of the current display index by design. Current statuses are `VERIFIED 7`, `ESTIMATED 35`, `REPORTED 69`, `POST_MORTEM 3`, and `UNAVAILABLE 7`.
- Local browser verification used the fallback path because the local session did not establish a live Foundation R2 read. Earlier direct Worker/R2 readback is separate evidence and must not be conflated with this local browser run.
- Production Worker deployment, live production R2/D1 cutover, migration of any pre-existing Neon-owned user data, scheduled backup/RPO/RTO operation, and a production restore drill remain unverified. No completion claim may be made for those items.

## Latest source and browser correction (2026-09-12)

The previous section is a historical snapshot. The current local source is `d2e34c07c98fcb8683a4f832f90bc83814977182` on `codex/reliability-boundaries`; the worktree is clean and the branch is one commit ahead of `origin/codex/reliability-boundaries` (`ee9a59920fef3c7ac30101ff6250be3adaefdf12`).

- `EvidenceDeckSection` is part of the public inspector composition again. The temporary regression was caused by a stale `.next/standalone` artifact; after a fresh `pnpm build`, the complete Playwright suite passed: **26/26**.
- Current local checks passed: `pnpm lint` (zero warnings), `pnpm typecheck`, `pnpm test` (Vitest 281, Foundation 11, architecture 11, Recovery 6), `pnpm build`, `pnpm workers:build`, `pnpm deploy:preflight`, `pnpm audit --prod`, and `pnpm test:e2e` (26 Chromium tests).
- A real browser session on `http://127.0.0.1:3103/?entity=ent_photoai` showed Photo AI's revenue and operating margin as `未確認`, rendered the Evidence section, kept the Photo AI inspector selected after lowercase `j` and `k`, and closed the visible inspector with `Escape`. No plain J/K shortcut hint was present; `⌘K` remains the search affordance.
- Direct S3 listing of `foundation-lake` is reachable. Direct S3 access to `make-money-production-private` returned `AccessDenied`, and a lookup of the old `architecture/5146dfa.../verification-receipt.v1.json` key returned `specified key does not exist`. Existing private-R2 receipt claims remain historical evidence; a new private-bucket readback is not claimed from this session.

The branch has not been merged into `main`. Production Worker deployment, live production cutover, migration of any pre-existing Neon-owned user data, scheduled backup/RPO/RTO operation, and a production restore drill remain unverified.

## Latest remote and R2 readback (2026-09-12)

- Commit `057f4985249eb36c9ea2eec34e3cd77d8b76ad6a` is now present on `origin/codex/reliability-boundaries`.
- GitHub Actions run `34689950523` completed successfully for all five required checks: `lint`, `typecheck`, `unit test`, `build`, and `E2E smoke`. PR #18 is `OPEN`, `MERGEABLE`, and `CLEAN`; the active `main-quality-gates` ruleset remains in force. No merge was performed.
- A new private-R2 receipt was written only after a missing-key preflight, then read back immediately: `make-money-production-private/architecture/057f4985249eb36c9ea2eec34e3cd77d8b76ad6a/verification-receipt.v1.json` (1,194 bytes; SHA-256 `43d0afef72a9b096cfff74f4d55c3cb8f44c157b19aab35d39a185db338834d7`). The downloaded bytes matched the upload byte-for-byte.
- This R2 receipt records local and GitHub checks plus the browser result and limits. It does not certify production deployment, Neon data migration, scheduled backup/RPO/RTO operation, or production restore.

## Neon ownership-boundary audit (2026-09-12)

The read-only Neon management inventory currently exposes one owned project, `Investrader-hub`. No Make-Money Neon project was listed. The production database's exact query for the former Make-Money table names returned an empty set. Generic tables such as `users`, `chat_messages`, `idea_drafts`, and `view_history` contain data in that other project, but no project discriminator proves Make-Money ownership; those rows were deliberately not copied into Make-Money R2. This confirms the safe decision for this project's known scope without claiming that every Neon account or inaccessible branch is empty.
