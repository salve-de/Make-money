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
