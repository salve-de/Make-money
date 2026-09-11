# Company Inspector responsibility audit

Baseline: 02fb23e, CompanyInspectorPane.tsx 1,794 lines. No fetch or persistence is owned by the pane; TerminalShell owns API loading and note storage. Preserve classes, ordering, section IDs, tags, PRO gating and callbacks.

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
