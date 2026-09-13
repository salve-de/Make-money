import { readFileSync } from 'fs';
import { resolve } from 'path';

const indexPath = resolve(process.cwd(), 'data/entities-index.json');
const entities = JSON.parse(readFileSync(indexPath, 'utf8'));

console.log(`[check-ingest-quality] Auditing semantic and domain integrity for ${entities.length} entities...`);

let errors = [];

// 1. Check Offline entities for misplaced SaaS payment tools
const OFFLINE_RETAIL_KEYWORDS = ['スーパー', 'ロピア', 'オーケー', '丸亀', 'スシロー', 'きんぐ', 'ワークマン', '業務スーパー'];
for (const ent of entities) {
  const isOfflineStore = OFFLINE_RETAIL_KEYWORDS.some(kw => ent.name.includes(kw));
  if (isOfflineStore) {
    const hasStripe = ent.operations?.toolStack?.some(t => t.name.toLowerCase().includes('stripe'));
    if (hasStripe) {
      errors.push(`[RULE VIOLATION: Misplaced SaaS Tool] Offline retail entity "${ent.name}" has Stripe Billing in toolStack.`);
    }
  }
}

// 2. Check executionChecklist duplication (Entropy Guard)
const checklists = entities.map(e => JSON.stringify(e.lootBlueprint?.executionChecklist || []));
const uniqueChecklists = new Set(checklists);
const checklistDiversity = uniqueChecklists.size / entities.length;
if (entities.length > 50 && checklistDiversity < 0.02) {
  errors.push(`[RULE VIOLATION: Hardcoded Template Checklist] executionChecklist diversity is too low: only ${uniqueChecklists.size} unique patterns across ${entities.length} entities.`);
}

// 3. Check tollGateSetup duplication
const tollGates = entities.map(e => e.lootBlueprint?.tollGateSetup || '');
const uniqueTollGates = new Set(tollGates);
const tollGateDiversity = uniqueTollGates.size / entities.length;
if (entities.length > 50 && tollGateDiversity < 0.1) {
  errors.push(`[RULE VIOLATION: Hardcoded Template TollGate] tollGateSetup diversity is too low: only ${uniqueTollGates.size} unique patterns across ${entities.length} entities.`);
}

// 4. Check internal jargon eradication (サバンナOS, 略奪転用, カニバリズム障壁, 身も蓋もない真実)
const FORBIDDEN_JARGON = ['サバンナOS', 'サバンナ OS', '略奪転用方程式', '略奪転用', 'カニバリズム障壁', '身も蓋もない真実', '特異物証'];
for (const ent of entities) {
  const jsonStr = JSON.stringify(ent);
  for (const jargon of FORBIDDEN_JARGON) {
    if (jsonStr.includes(jargon)) {
      errors.push(`[RULE VIOLATION: Forbidden Jargon Found] Entity "${ent.name}" contains internal jargon "${jargon}".`);
    }
  }
}

// 5. Check evidenceCards title diversity
const cardTitles = entities.flatMap(e => (e.evidenceCards || []).map(c => c.title));
if (cardTitles.length > 0) {
  const uniqueCardTitles = new Set(cardTitles);
  const cardTitleDiversity = uniqueCardTitles.size / cardTitles.length;
  if (cardTitleDiversity < 0.2) {
    errors.push(`[RULE VIOLATION: Duplicate Evidence Card Titles] Evidence card title diversity is too low: only ${uniqueCardTitles.size} unique titles out of ${cardTitles.length} cards.`);
  }
}

// 6. Check Offline entities for misplaced subscription or SaaS terminology
const SUBSCRIPTION_TERMS = ['年払いサブスク', '月額サブスク', 'SaaS', 'API直結'];
for (const ent of entities) {
  const isOfflineStore = OFFLINE_RETAIL_KEYWORDS.some(kw => ent.name.includes(kw));
  if (isOfflineStore) {
    const jsonStr = JSON.stringify(ent);
    for (const term of SUBSCRIPTION_TERMS) {
      if (jsonStr.includes(term)) {
        errors.push(`[RULE VIOLATION: Misplaced SaaS Term in Offline Store] Offline store "${ent.name}" contains SaaS term "${term}".`);
      }
    }
  }
}

// 7. Check arithmetic precision
for (const ent of entities) {
  const p = ent.pnl;
  if (!p) continue;
  if (p.monthlyRevenue - p.cogs !== p.grossProfit) {
    errors.push(`[ARITHMETIC ERROR] ${ent.name}: monthlyRevenue (${p.monthlyRevenue}) - cogs (${p.cogs}) !== grossProfit (${p.grossProfit})`);
  }
  const opexSum = Object.values(p.operatingExpenses || {}).reduce((a, b) => (typeof b === 'number' ? a + b : a), 0);
  if (p.grossProfit - opexSum !== p.operatingProfit) {
    errors.push(`[ARITHMETIC ERROR] ${ent.name}: grossProfit (${p.grossProfit}) - opexSum (${opexSum}) !== operatingProfit (${p.operatingProfit})`);
  }
}

if (errors.length > 0) {
  console.error(`\n❌ [check-ingest-quality] FAILED with ${errors.length} quality violations:`);
  errors.slice(0, 10).forEach(err => console.error(`  - ${err}`));
  if (errors.length > 10) console.error(`  ...and ${errors.length - 10} more`);
  process.exit(1);
}

console.log(`✓ [check-ingest-quality] PASSED: All ${entities.length} entities satisfy domain consistency, tool accuracy, arithmetic precision, and template diversity.\n`);
