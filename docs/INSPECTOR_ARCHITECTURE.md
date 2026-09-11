# Company Inspector responsibility audit

Baseline: 02fb23e, CompanyInspectorPane.tsx 1,793 lines. No fetch or persistence is owned by the pane; TerminalShell owns API loading and note storage. Preserve classes, ordering, section IDs, tags, PRO gating and callbacks.

| Responsibility | Destination | Dependency/state |
| --- | --- | --- |
| Scroll reset, Escape, section deep link | CompanyInspectorPane | local ref/scroll state and parent callbacks |
| Money formatting, waterfall, hazard/status, card presence | model/inspector-model | pure FinancialEntity input |
| Header, identity, temporal badge and section navigation | ui/CompanyHeader | explicit props |
| Related reports and market links | ui/RelatedResearch | existing catalog data, callbacks |
| Variable evidence cards | dynamic-sections | typed card-kind registry, shared renderer |
| Business identity fallback | ui/BusinessSections | entity, hazard and card presence |
| Financial P&L and operations | ui/FinancialSection | pure calculated model |
| Tool stack / hazard defense | ui/ToolsSection | existing affiliate config |
| Traction / acquisition and PRO analysis | ui/PlaybookSections | entity and entitlement callback |
| Evidence timeline and observations | ui/EvidenceStream | existing universal stream |
| Analyst notes | ui/AnalystNotes | parent-controlled note and save callback |

No new fixed-section registry. Temporal information stays in the header and existing stream; no new timeline behavior is invented. Extract JSX at existing responsibility boundaries, not arbitrary line limits. Shared contracts have no runtime dependency on features. Existing legacy modules migrate only where necessary for this feature.

## Mechanical enforcement and validation

`pnpm lint` checks actual TypeScript-resolved imports (aliases, relative paths, exports, import type queries and literal dynamic imports). Feature outsiders may use only index.ts; shared cannot depend on feature/platform/app; runtime cycles fail. Computed dynamic imports are rejected because their target cannot be verified. Type-only edges still obey boundaries but are excluded from runtime cycle detection. Negative graph tests cover bypass attempts.

Consumer schemas are generated from strict TypeScript contracts with pinned ts-json-schema-generator. AJV rejects malformed nested fields, non-finite numbers, invalid enum values and missing required data without coercion or defaults. Unknown extra fields remain intact for forward compatibility. `pnpm schemas:check` detects stale generated schemas. These are consumer-only validation artifacts, not new Foundation schemas or persisted serving views.

Boundary coverage: businesses API output, browser Foundation page/detail input, local entity JSON on API and Playbook, legacy entity projector, strategy request and AI synthesized output before DB writes. Existing Foundation ingest validation remains in place. Live R2 source acquisition and paid/authenticated flows are not exercised by credential-free CI. Invalid local entity lists use the existing fallback; invalid fetched records do not enter inspector state.

The tests protect existing formatting and evidence-status behavior; they do not independently verify the historical financial claims or hardcoded exchange rate in the legacy dataset/model. No new business numbers are introduced by this refactor.

## Integration boundary

Work started at 02fb23e on feat/dynamic-evidence-registry-architecture, with 163 existing commits ahead and 7 behind live GitHub main (verified before PR creation). This change is isolated on codex/maintainable-inspector and reviewed against that starting branch. The pre-existing commits are not implicitly authorized for main integration. main Ruleset enforcement and PR adoption are separate evidence.

## Verification snapshot (2026-09-11)

- Local `pnpm lint`: passed, 0 errors / 140 pre-existing warnings remain. Architecture graph and negative probes pass.
- `pnpm typecheck`: passed, including generated-schema consistency.
- `pnpm test`: 19 Vitest tests and 10 existing Foundation tests passed.
- `pnpm build` and `pnpm test:e2e`: passed against final regenerated schemas, 4 browser/API smoke tests, no page errors.
- GitHub push/PR was rejected by automatic approval review. The changed-code secret-pattern scan found no matches and no data/.env/key changes, but explicit public-upload approval is still required.
- No PR was created, no GitHub CI run is claimed, and main Ruleset remains unapplied until the workflow can be published and verified. The prepared main rule requires all five GitHub Actions checks, up-to-date PRs, no direct push, and no bypass actors.
- No production deployment, R2/DB writes, main merge, branch deletion or recurring automation was performed. Local test server is owned and stopped by Playwright.

## Follow-up regression repair (2026-09-11)

The completion audit found two retained legacy defects that the original four smoke tests did not cover: typing j/k navigated away from a note, and malformed local note JSON crashed the application. Plain J/K navigation and its hints have now been removed from both inspector implementations. Note records are schema-validated individually; valid records survive alongside invalid ones. On the next edit, the exact malformed original is backed up in same-origin localStorage before replacement; failed backup never overwrites the original.

Verification after repair: `pnpm lint` (0 errors, 140 existing warnings), `pnpm typecheck` including schema consistency, 30 Vitest + 10 Foundation tests, `pnpm build`, and all 9 Playwright tests passed. The added browser cases exercise typing, no-focus key presses, reload, malformed JSON/null/arrays, retention of a valid note alongside a bad note, and recovery-backup readback. Computed require calls are also rejected by the boundary checker. These local results do not prove GitHub rules are active; remote completion remains a separate gate.


## Expanded regression audit (2026-09-11)

The follow-up fixes protect actual data and user operations beyond the initial smoke:

- Foundation monthly/annual revenue parsing handles MRR/ARR, JPY, grouped amounts, leading observation years, long scale names, explicit zero, losses, non-finite inputs, unsupported currencies and ambiguous ranges. The legacy USD/JPY 150 conversion remains an estimate, not a live exchange rate.
- Revenue alone no longer manufactures 85% gross margin, 65% operating profit, costs or annual net profit. Compatible supported observations supply financial values; otherwise availability flags keep numeric contract placeholders from being displayed as observations. The chart is suppressed without known cost breakdown.
- Evidence text is retained instead of being replaced with invented English fallback descriptions or a fixed $10M amount. Unrelated observations no longer satisfy every scoring dimension.
- Browser view-history JSON is decoded before use, salvaging valid IDs with bounded deduplication. User interest averages include zero/losses and exclude unknown values; empty histories no longer fabricate preferences or margins.
- Newsletter, submissions and bookmarks validate request bodies and optional fields before persistence. Missing DB returns 503 rather than a fabricated successful save. Membership lookup also returns 503 on storage failure instead of silently reporting a free subscription. Invalid ingest JSON returns 400 before ingestion.
- Plain Node production reads use only an existing Cloudflare runtime context; they do not implicitly start a Wrangler development proxy. Node credentials and actual worker bindings retain their own paths.
- Finder search and ledger/signals navigation are wired to visible behavior. POST_MORTEM evidence retains its status badge.

API route tests use real handlers and request/response objects with mocked DB/auth/ingest providers. Browser tests use isolated contexts and include malformed storage, note association, search/filter, Playbook tabs and links, Finder routes and financial sheet, plus revenue-only Foundation responses through the real UI adapter. These do not perform real writes, purchases or authentication.

Remaining scope boundaries: legacy Foundation viability/headcount/growth/default narratives and static dataset claims are not independently fact-verified by this suite. The architecture transition does not certify all historical content, all browsers or all external provider integrations. GitHub Actions execution and required-check enforcement still require publication and live readback; local checks do not establish main protection.

### Final local verification for this follow-up

All commands completed successfully on the final source tree on 2026-09-11:

| Check | Result |
| --- | --- |
| `pnpm lint` | 0 errors, 138 existing warnings; boundary/cycle checks passed |
| `pnpm typecheck` | strict TypeScript, route types, schema drift checks passed |
| `pnpm test` | 148 Vitest tests plus 10 Foundation tests, zero failures/skips |
| `pnpm build` | production compilation, typechecking and page generation passed |
| `pnpm test:e2e` | 18 Chromium tests passed in 51.5 seconds |
| `git diff --check` | passed |

Final browser run no longer emitted the Workers hung/canceled request errors. The local Node server instead reported R2_NOT_CONFIGURED immediately and used its existing fallback; this verifies the absence-of-configuration path, not live R2 availability. Compared with the earlier 1.4-minute browser run, no tests were removed or skipped.

Live GitHub readback still showed main `aa4e64cfb82add1366ad6c0a7185ddb755b6c1e9` with `protected: false`. Local architecture commits and these uncommitted follow-up changes have not been published. The prior automated approval review denied public push/PR publication without explicit public-upload consent. Required Status Checks and GitHub CI execution remain incomplete.

### Main protection enabled (2026-09-11, subsequent live update)

The earlier unprotected readback above is superseded. Ruleset `22892592` (`main-quality-gates`) was created under the explicit Phase 5 instruction and read back from GitHub with `enforcement: active`, scope `refs/heads/main`, and no bypass actors. The main branch API now returns `protected: true`; its commit remains `aa4e64cfb82add1366ad6c0a7185ddb755b6c1e9`.

The rules require a pull request, resolved review threads, and up-to-date GitHub Actions checks named `lint`, `typecheck`, `unit test`, `build`, and `E2E smoke` (integration 15368). Branch deletion and non-fast-forward pushes are prohibited. Approval count is zero to avoid imposing an extra human-review bottleneck. No code was uploaded and no branch was merged by this operation.

The full local test command was rerun successfully: 148 Vitest plus 10 Foundation tests. Public push/PR consent remains pending from the earlier automated approval rejection. Until the workflow is published and all required checks run, PRs lacking those checks remain blocked by design. Configuration readback proves the active rules; an actual failing/passing PR exercise and remote CI completion are still pending.
