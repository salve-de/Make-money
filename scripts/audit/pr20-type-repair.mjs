// Temporary, idempotent repair executed in the isolated GitHub runner.
// No source data, deployed environment, credentials or schema is modified.
import fs from 'node:fs';
import path from 'node:path';

if (process.argv[2]) process.chdir(process.argv[2]);
const changed = [];
function edit(file, transform) {
  if (!fs.existsSync(file)) return;
  const before = fs.readFileSync(file, 'utf8');
  const after = transform(before);
  if (before !== after) { fs.writeFileSync(file, after); changed.push(file); }
}
function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== content) {
    fs.writeFileSync(file, content); changed.push(file);
  }
}
function addImport(source, line) {
  if (source.includes(line)) return source;
  return source.startsWith("'use client';")
    ? source.replace("'use client';", "'use client';\n\n" + line)
    : line + '\n' + source;
}

// Correct the newly introduced radar imports without touching markup.
for (const file of ['RadarLandmineDetail.tsx', 'RadarOpportunityDetail.tsx']) {
  edit('src/platform/components/radar/' + file, source => source
    .replace(/\bMarketRadarLandmine\b/g, 'MarketRadarLandmineItem')
    .replace(/\bMarketRadarTrend\b/g, 'MarketRadarTrendItem'));
}

// UI-only compatibility readers retain existing fallback order. They do NOT add
// imaginary fields to FinancialEntity or change the authoritative JSON schema.
write('src/features/company-inspector/model/legacy-fields.ts', `/** Read optional historical UI fields without weakening the canonical entity contract. */
function readField(value: unknown, key: string): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value) || !Object.hasOwn(value, key)) return undefined;
  return Reflect.get(value, key);
}
export function legacyText(value: unknown, key: string): string | undefined {
  const field = readField(value, key);
  return typeof field === 'string' ? field : undefined;
}
export function legacyNumber(value: unknown, key: string): number | undefined {
  const field = readField(value, key);
  return typeof field === 'number' && Number.isFinite(field) ? field : undefined;
}
`);
write('src/features/company-inspector/model/legacy-fields.test.ts', `import { describe, expect, it } from 'vitest';
import { legacyText, legacyNumber } from './legacy-fields';
describe('historical inspector field compatibility', () => {
  it('preserves historical strings and numbers', () => {
    expect(legacyText({ moat: 'legacy moat' }, 'moat')).toBe('legacy moat');
    expect(legacyNumber({ teamSize: 3 }, 'teamSize')).toBe(3);
  });
  it('does not turn missing or malformed data into facts', () => {
    expect(legacyText({}, 'moat')).toBeUndefined();
    expect(legacyText({ moat: 4 }, 'moat')).toBeUndefined();
    expect(legacyNumber({ teamSize: NaN }, 'teamSize')).toBeUndefined();
    expect(legacyText(null, 'moat')).toBeUndefined();
    expect(legacyText(Object.create({ moat: 'inherited' }), 'moat')).toBeUndefined();
  });
});
`);
const replacements = [
  [/entity\.essence\?\.monetizationWay\b/g, "legacyText(entity.essence, 'monetizationWay')"],
  [/entity\.strategy\?\.moat\b/g, "legacyText(entity.strategy, 'moat')"],
  [/entity\.strategy\.moat\b/g, "legacyText(entity.strategy, 'moat')"],
  [/entity\.pnl\?\.originType\b/g, "legacyText(entity.pnl, 'originType')"],
  [/entity\.pnl\.originType\b/g, "legacyText(entity.pnl, 'originType')"],
  [/entity\.websiteUrl\b/g, "legacyText(entity, 'websiteUrl')"],
  [/entity\.executiveSummary\b/g, "legacyText(entity, 'executiveSummary')"],
  [/entity\.monetizationWay\b/g, "legacyText(entity, 'monetizationWay')"],
  [/entity\.coreMoatDescription\b/g, "legacyText(entity, 'coreMoatDescription')"],
  [/entity\.teamSize\b/g, "legacyNumber(entity, 'teamSize')"],
];
const uiDir = 'src/features/company-inspector/ui';
for (const file of fs.readdirSync(uiDir).filter(name => name.endsWith('.tsx'))) {
  edit(path.join(uiDir, file), source => {
    let next = source;
    for (const [pattern, replacement] of replacements) next = next.replace(pattern, replacement);
    if (next !== source) {
      const names = ['legacyText', 'legacyNumber'].filter(name => next.includes(name + '('));
      next = addImport(next, "import { " + names.join(', ') + " } from '../model/legacy-fields';");
    }
    return next;
  });
}
edit(uiDir + '/ShareModal.tsx', source => source.replace("'@/types/financial-entity'", "'@/shared/terminal'"));

// Sankey does not define a layout property. Keep all rendering values intact.
for (const file of ['CashAnatomySection.tsx', 'SankeyCashFlowDiagram.tsx']) {
  edit(uiDir + '/' + file, source => source.replace(/^\s*layout: ['"]none['"],?\s*\n/gm, '\n'));
}
// Graph nodes legitimately carry custom tooltip descriptions. Type the extension
// at the data boundary rather than suppressing checks on the chart option.
edit(uiDir + '/FlywheelEngineDiagram.tsx', source => {
  if (source.includes('function describedGraphNodes(')) return source;
  source = source.replace('            data: [', '            data: describedGraphNodes([')
    .replace('            ],\n            links:', '            ]),\n            links:');
  return source.replace('function cleanNodeTitle(', `function describedGraphNodes(
  nodes: Array<NonNullable<echarts.GraphSeriesOption['data']>[number] & { desc?: string }>,
): NonNullable<echarts.GraphSeriesOption['data']> {
  return nodes;
}

function cleanNodeTitle(`);
});

// Financial evidence status belongs to pnl, not a second root-level copy.
edit('scripts/pipeline/auto-enrich-entity.ts', source => source
  .replace("cloned.financialStatus === 'POST_MORTEM'", "cloned.pnl?.financialStatus === 'POST_MORTEM'")
  .replace("    cloned.financialStatus = 'POST_MORTEM';\n", ''));
edit('src/tests/density-invariants.test.ts', source => {
  if (!source.includes('estimatedAnnualNetProfit:')) source = source.replace(/    pnl: \{\n/g,
    '    pnl: {\n      operatingExpenses: { serverAndApi: 0, advertising: 0, subcontracting: 0, toolsAndSaaS: 0, other: 0 },\n      estimatedAnnualNetProfit: 0,\n      isNetProfitUnconfirmed: true,\n');
  return source.replace("moatType: 'NETWORK_EFFECTS'", "moatType: 'NETWORK_EFFECT'")
    .replace("moatType: 'NONE'", "moatType: 'UNKNOWN'")
    .replace("assert.strictEqual(enriched.financialStatus, 'POST_MORTEM', 'Hazard entity must have POST_MORTEM status');", "assert.strictEqual(enriched.pnl.financialStatus, 'POST_MORTEM', 'Hazard entity must have canonical POST_MORTEM status');")
    .replace("assert.ok(enriched.strategy.incumbentDilemma.startsWith", "assert.ok(enriched.strategy.incumbentDilemma, 'incumbentDilemma must exist');\n  assert.ok(enriched.strategy.incumbentDilemma.startsWith");
});
console.log('PR20_TYPE_REPAIR_FILES=' + JSON.stringify(changed));
