# Company Inspector responsibility audit

Baseline: 02fb23e, CompanyInspectorPane.tsx 1,793 lines. No fetch or persistence is owned by the pane; TerminalShell owns API loading and note storage. Preserve classes, ordering, section IDs, tags, PRO gating and callbacks.

| Responsibility | Destination | Dependency/state |
| --- | --- | --- |
| Scroll reset, Escape/J/K, section deep link | CompanyInspectorPane | local ref/scroll state and parent callbacks |
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
