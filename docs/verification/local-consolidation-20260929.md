# ローカル差分の統合 — 2026-09-29

基準: main `2bbe301856dbf0491c410b3690b263154f201dea`。承認済み新UIを維持し、残存ローカル差分を選別して統合する。

## 採用した内容

- 検索の継続・再試行、古い検索結果の混入防止、連続ページ検証。
- 調査coverageの保存と、SEC出典/対象主体の厳密な対応。
- 外部制作/Builder製品の掲載API・紹介画面・所有者管理・D1 migration 0011。旧デザインのheader/partners全置換はしない。
- Steve Hanovの原文が支える最小限の説明・観測追加。旧カードIDを保持し、取込処理の配列順によるID/出典上書きを削除。
- 台帳からregistry83件の状態差を再生成。新たに財務監査済みと認定したものではない。
- 収集案内・権利判断・Publisher運用文書の差分を統合。旧branch URLと固定件数を修正。
- 副作用のない収集補助6モジュールとテスト。外部依存・料金前提が未検証の収集CLIは採らない。

## 保全と除外

20作業コピーの変更・未追跡ファイル407件は、統合前に非公開のローカル復元用アーカイブとGit backup refsへ保全した。原本HTML、全台帳コピー、調査途中のreceipt、個別pilot実行物は公開Gitへ追加しない。旧UI/旧private payload/同等実装の重複は現行へ戻さない。

バックアップは稼働するソースの別版として使わず、復元専用とする。本統合は本番デプロイ、D1本番migration、R2再公開、全事例の事実/権利再監査を意味しない。

## 18旧作業コピーの採否根拠

# Other worktree disposition audit

Basis: main 2bbe301856dbf0491c410b3690b263154f201dea; inventory worktrees.json; live HEAD/status, dirty diff, untracked names, selected source/test/contract contents, git cherry and content comparisons. Read only; no checkout mutations, tests, servers, R2, commits or archive. 18 existing other worktrees accounted for below (7 stale missing registrations are outside these 18). This is an integration triage, not certification that every untracked research byte is public-safe. Never bulk-copy old UI or publish retained raw research as part of synchronization.

| # | Worktree | Disposition / evidence |
|---|---|---|
| 1 | case-normalization | **Adopt docs/evidence after review**: dirty COMMERCIAL_RIGHTS_PUBLICATION_HANDOFF.md and DATA_COLLECTION_MASTER_GUIDE.md clarify per-use factual display vs copied expression, no blanket license/no blanket exclusion, source-scoped registry still mandatory. Preserve reports/commercial-rights-r2-audit-20260928.md and reports/individual-case-reaudit-20260928-steve-hanov.md plus runtime audit JSON privately; dated evidence, not current authorization. HEAD ancestor, no unique commits. |
| 2 | catalog-release-page-read | **Selective adoption, no full checkout copy**: unique catalog-page.ts/catalog-facets.ts with tests; server-side filtering/paging, virtualization, local-review routes, payload-bounds and approval helpers. Full dirty bundle spans 38 tracked files and many new files, intertwined with earlier public structured payload design and old UI. Preserve approved UI and current rights gates; use paging/filter helpers and associated tests as the coherent adoption boundary. Reject stale release manifest and old UI wholesale. local-review is operator functionality, not public catalog content. |
| 3 | existing-integration | **Mixed incorporated / docs adoption**: 3 dirty files byte-identical main (dossier-projection, financial-projection test, ingest test); most structured ingest/text normalization intent superseded by newer main. Keep COLLECTION_OS_V3_INTEGRATION.md and reconcile collection docs/generate-collection-prompt with primary's newer working copies rather than overwrite. Reject old inspector/grid UI. |
| 4 | make-money-latest-main-audit | **Adopt coherent repair groups**: typed-ingest.ts + schema + coverage.ts + ingest.ts + typed API and tests/2 coverage repair fixtures; latest-first Foundation search v2 cursor with exact continuation retry/excluded IDs in businesses route/tests; useFoundationPaging.ts + FoundationSearchContinuation.tsx/tests. These are useful missing coverage/search behavior, not cosmetics. Do not copy old TerminalShell or whole hook; merge into accepted UI/search lifecycle. |
| 5 | make-money-local-integrated | **Equivalent / obsolete**: unique merge2302c735 + WIP39992770 preserve old work. R2 restore-check/bookmark-storage unchanged against main; registry/newsletter/submission functions survive in newer main. Remaining old UI/filter/Synthesis deltas would regress current server filter and design. Reject old whole-index and mass curation scripts; preserve snapshot rather than replay. |
| 6 | make-money-local-wip | **Same WIP39992770 as #5**, duplicate preserved history. No dirty/untracked state. Equivalent features; reject obsolete old UI/data rewrite. |
| 7 | make-money-public-contract | **Adopt source-specific contract logic with tests**: data/foundation-public-observation-contracts.json, publication-rights.ts/test, typed-ingest.e2e.test, real-starwood-apollo-2026-09-26-research-bundle-v1.json fixture. Exact typed subject/entity/evidence association and SEC fact-only policy, including distinction Apollo-managed funds vs parent. No blanket rights relaxation; preserve current publicDisplay. |
| 8 | make-money-publish-marketplace | **Unique substantial feature, preserve/adopt as coherent unit**: migrations/d1/0011_marketplace_listings.sql; src/shared/marketplace-listing.ts; src/lib/marketplace/listing-store.ts; API listings routes/tests; src/app/marketplace/**; ListingEditor.tsx; user/me listing mapping; builder/navigation/docs integration. Auth Firebase UID and rate-limit present. Do not copy old partners/banner UI. Listing capability is not purchase tracking/payouts; do not imply those exist or apply production migration as mere file sync. |
| 9 | make-money-release | **Incorporated ancestor23848310**, clean, no unique commit or untracked file. Obsolete checkout. |
|10| mm-current-main-ui-verify | **Adopt small label fix; preserve collection tooling/evidence**: generic revenue label changes 年間売上→売上 with test (annual_revenue remains annual), demonstrably absent in base main. Unique scripts/gemini-*.mjs, scripts/openai-*.mjs and tests implement retained stages, identity/source binding, costs, admission guards. Gemini script explicitly blocks Google Search-grounded persistent-database acquisition; do NOT remove this guard. Stage receipts for PANW/Limbach and Fever-Tree remain provenance; Fever-Tree not publication approved, --enrich/ is accidental CLI artifact directory, not a canonical data source. Do not bulk-publicize raw reports or rerun paid commands during sync. |
|11| mm-e2e-a424-20260924 | **Obsolete / isolated QA-only**: old financial projection changes superseded; next.config.ts adds LOCAL_E2E_MEMORY_R2 skip of remote setup and scripts/local-spott-e2e.tmp.ts temporary harness. Preserve snapshot, do not adopt config bypass into main as product change. |
|12| mm-pipeline-delivery-20260924 | **Mostly superseded public projection; retain tests/evidence**: earlier public-projection.ts sanitizer removes typed raw JSON from lists/details; main now has public-observation allowlist, publication-rights and publicDisplay architecture. Do not replace newer rights boundary with older sanitizer. e2e/spott-candidate-display.spec.ts, verify-foundation-b1-display.mjs, spott-downstream-control.test.ts are useful historical regression candidates; inspect against current contract before adoption. |
|13| mm-public-display-verify | **Adopt regression intent, fix import**: only dirty typed-ingest.e2e.test adds publicDisplay exact ownership41.5/58.5, source and actual EvidenceStream render proof. Uses forbidden internal feature import; route through public feature API before adoption. No runtime source change. |
|14| pr53-review-fix | **Equivalent / superseded**: unique commits6bcee241/29d848f8 not patch-identical git cherry, but main already has 60s timeout; loading state separation should be preserved in current paging implementation. No dirty files. Do not replace whole hook/TerminalShell from ancestor. |
|15| public-observation-ui | **Superseded**: earlier raw typed payload passthrough/renderer source and business-reader-public-display.test. Main has bounded publicPayload plus publicDisplay, allowing only public fields. Older full-payload contract must not be restored. Tests may be retained as historical evidence but no runtime adoption. |
|16| ui-observation-main-verify | **Adopt/coalesce lifecycle fixes**: foundation-search-lifecycle.ts/test, foundation-approval.ts, foundation-catalog-merge.ts, detail-request additions, new-arrivals regression. Avoid stale query/cursor response replacing new-query state; approval IDs parsed/batched and collection tags removed only for approved IDs. Merge against #4 Foundation paging; do not copy competing useFoundationCatalog versions wholesale. |
|17| verify-typed-ui-da645 | **Equivalent safety work / reject regression**: 45 unique commit history, but public-observation.ts is byte-identical main, bounded allowlist intent incorporated. Comparing final HEAD to main shows removal of newer publicDisplay from API/renderer/schema, not a needed safety addition. Preserve current richer explicitly allowed publicDisplay; do not merge branch wholesale. |
|18| project/Make-Money/.worktrees/main-consolidation | **Mostly incorporated**: four unique commits (scheduled date preservation155602f8, coverage paging6f18b5b5, reconciliation846a6d05/cc6e2e41). financial-integrity.ts byte-identical main. Old pagination/UI superseded by current catalog work. Compare scheduled-r2-handoff date-only/leap-date hunk and tests selectively; old full file would regress later new-arrivals work. Clean, no untracked. |

## Highest-priority exact files to port

1. mm-current-main-ui-verify/src/lib/foundation/text-cleaner.ts and .test.ts: 1-line period-neutral revenue fix.
2. make-money-public-contract/src/lib/foundation/publication-rights.ts plus tests + data/foundation-public-observation-contracts.json: exact evidence/subject binding (keep registry policy constraints).
3. make-money-latest-main-audit typed-ingest/coverage/schema/fixtures group: retain actual coverage rather than mark complete by omission; businesses route continuation retry fixes.
4. ui-observation-main-verify/src/platform/hooks/{foundation-search-lifecycle,foundation-catalog-merge,foundation-approval}.ts and lifecycle test; coalesce with latest-main-audit/useFoundationPaging.ts.
5. marketplace coherent module/migration listed above, if retaining this real prior functionality in final unified tree. Never restore old partners UI merely to gain its link.
6. case-normalization docs and collection provenance reports, with dated scope retained.

## Ongoing/shared-work observation

lsof cwd snapshot found processes in primary Make-Money and ui-trust-redesign (PIDs6628/6699), none with cwd in these18. This is NOT proof the18 are unused: Codex tools run from primary while editing absolute paths; worktree owner chats/active threads must be checked by lead. The many recent dirty contracts/search/provider files are plausible concurrent work. Do not archive/remove based solely on absence of cwd.

## Retention exclusions

No secrets printed/read. No large raw backup/publication approval inferred. Generated release artifacts, old catalog data and staged research need lineage/rights review; explicit rejection here means do not integrate into active runtime, not delete unrecovered evidence. Inspection covered all18 statuses/unique histories and functional groups, not a full security certification or line-by-line review of every provider script.

## Foundation最終採否

# Foundation integration disposition
Target: ui-integration checkout, main baseline 2bbe3018. No commits/push/server/R2 operations.

## Adopted
- latest-main-audit: latest-first /api/businesses search; bounded v2 cursor carries excluded IDs; exact continuation failure returns retryable503 rather than dropping or advancing archive state. Existing route regressions included.
- latest-main-audit: explicit collection_coverage typed schema/validation/preservation and source-artifact compatibility reports; legacy typed input without coverage retains unassessed semantics. Two factual coverage repair fixtures included. No missing-value fabrication.
- latest-main-audit: Foundation paging extraction, explicit search continuation/retry with held results and preserved cursors. Retained approved TerminalShell layout, detail fetching Promise contract, curated catalog auto-paging, 60sec request timeout.
- ui-observation-main-verify: committed-query lifecycle (A→B→A before debounce does not invalidate A); stale query rows hidden; retry guard rechecked after backoff. Only live retry helper retained; duplicate unused helper abstraction and its nonproduction tests excluded.
- public-contract: exact source policy + subject + evidence binding; Apollo fund/affiliate vs parent distinction; malformed/duplicate association fails closed. Current publicDisplay path remains. Fixture and32 tests included.
- catalog-release-page-read: exact contiguous page-progress validator integrated into useCuratedCatalog, with6 regressions. Reject skipped cursor, premature terminal, empty nonterminal, invalid generation. Preserved current pageSize10 and current public summary contract; removed source's incompatible publishedTotal requirement.

## Equivalent / intentionally not adopted
- catalog-release server filtering already exists on main /api/catalog using matchesCatalogQuery/parseCatalogFilters and stable catalog generation. No route overwrite.
- catalog-release CATALOG_PAGE_SIZE100 superseded by current response-bounded pages of10. No size regression.
- catalog-facets needs release-generator/schema changes and full-catalog regenerated manifest; not necessary for search paging correctness, and generator is another owner's scope. Retain source snapshot; no orphan unused facet helper.
- catalog-release local-review operator routes/panels: optional separate feature requiring auth/API audit; not necessary for accepted public UI. Not adopted.
- catalog-release old structured payload bounds/renderer and old virtualized grid: incompatible/superseded by current publicDisplay/rights/compact UI; rejected whole replacements.
- ui-observation foundation-approval and foundation-catalog-merge are extractions of existing production behavior (validated IDs, chunks, approved-only tag removal and merge semantics). Existing implementation retained; no duplicate modules.
- ui-observation broad hook/TerminalShell replacement rejected; source intent merged into current hooks/UI instead.
- Old release manifests, entities-index, pipeline/generator, marketplace and provider scripts untouched by this owner.

## Verification
- vitest5 suites: businesses route, typed ingest, typed ingest e2e, Foundation paging helper, continuation component:97 passed.
- subsequent vitest4 suites: catalog-page, paging helper, continuation component, publication-rights:67 passed. Overlaps previous run; not167 distinct tests.
- final live retry helper node:test:3 passed (initial13 included10 unintegrated helper tests, intentionally removed).
- No browser/liveR2 proof claimed. Parent owns integrated end-to-end verification.

## 収集補助ツール最終採否

# Collector tool disposition

Adopted 12 files / 6 pure helper modules + tests, unchanged from prior local work:
- gemini-bundle-contract.mjs
- gemini-bundle-contract.test.mjs
- gemini-run-options.mjs
- gemini-run-options.test.mjs
- gemini-source-input.mjs
- gemini-source-input.test.mjs
- gemini-stage-store.mjs
- gemini-stage-store.test.mjs
- openai-record-links.mjs
- openai-record-links.test.mjs
- openai-source-policy-binding.mjs
- openai-source-policy-binding.test.mjs

27 node:test tests passed. Tests use temp files/local fixtures and callbacks, no network or paid API, no key use or R2 access. No package.json changes required. No automated run hook added.

Excluded (preserve in backup; no deletion):
- gemini-compile-retained.mjs
- gemini-enrichment-prompt.mjs
- gemini-enrichment-prompt.test.mjs
- gemini-extract-sources.mjs
- gemini-grounding-bundle.mjs
- gemini-grounding-bundle.test.mjs
- gemini-provider-admission.test.mjs
- gemini-research-manual.mjs
- gemini-research-preservation.mjs
- gemini-research-preservation.test.mjs
- gemini-schema-probe.mjs
- gemini-source-redirects.mjs
- gemini-source-redirects.test.mjs
- gemini-validate-retained.mjs
- openai-assemble-bundle.mjs
- openai-collect.mjs
- openai-cost-ledger.mjs
- openai-cost-ledger.test.mjs
- openai-extract-records.mjs
- openai-research-batch.mjs
- openai-research-stage.mjs
- openai-research-stage.test.mjs
- openai-retained-reports.mjs
- openai-retained-reports.test.mjs

Reasons: active CLI/provider modules have external FOUNDATION_REPO schema/worker dependencies and unverified fixed model/cost assumptions. Gemini grounding entrypoints intentionally reject provider admission, reference pilot-specific historical terms-review paths, and should not be presented as working collection. Grounding compilation/preservation helpers are coupled to that blocked workflow. OpenAI assemble bundle carries historical pilot-specific truncation warning; importing as general production tooling would be misleading. Retained report/cost helpers depend on excluded research-stage module. This audit does not adjudicate current provider terms or licenses, and does not run any collector. Retained standalone helpers audit references, preserve request identity, validate source policy inputs and bind only existing pinned source policies; none authorize collection or publication.
