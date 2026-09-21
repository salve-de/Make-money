# Local main acceptance — 2026-09-21

## Current acceptance evidence

- Revision: `main` / `c9dc286`
- Focused verification: `36 focused` / `tsc` / `lint` PASS
- Root local runtime: `PORT=3000 node scripts/with-r2-keychain-secrets.mjs pnpm dev` (session `92413`)
- Strict Foundation API: `3000`, `foundationOnly=true&limit=100`, `source=foundation_lake`, `count=396`, `11252ms`
- Visible UI acceptance: `保存済み台帳 + Foundation R2` / `新着公開便297件` / `488件`; Amy detail and `execute` 6 steps PASS
- Consolidated all-ID API acceptance: PASS; `checkedAt=2026-09-21T05:00:50.042Z`, `localhost:3000`, `listPages=7`, `detailsVerified=627`, `failedEntityIds=[]`, strict `source=foundation_lake`
- Protected catalog hash unchanged: `5b9ecc23f47150534032b4bc1d8a6651938c0d2a978e55b871c36597b1c1ebd4`
- Root tree clean; no GitHub push and no additional deploy

The keychain wrapper command is recorded without any credential values. When the document is non-visible, the hook suppresses fetching until the page becomes visible; this is expected behavior, not a defect.

## Evidence boundary

The older `581 + 18 + 16 + 6` suite, `build` at `280cf1f`, and `E2E 45/45` are prior-revision evidence and are kept distinct from the current `c9dc286` acceptance evidence. No full suite or build was rerun for this worklog.

## Remaining items

- Technical null-representation repair for `l12` / `m13` remains owner dry-run/tests work
- `k11` automatic retry remains unresolved
- Actual scheduled run after 14:20 remains unproven

2050 and v0 are excluded. `ownerR2_REPAIR_STATUS` was not edited.
