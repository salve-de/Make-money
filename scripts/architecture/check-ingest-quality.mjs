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

// 4. Check arithmetic precision
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

// 5. Check Content Completeness & Thickness (No thin garbage allowed)
const FORBIDDEN_JARGON = ['サバンナOS', 'サバンナ OS', '略奪転用方程式', 'カニバリズム障壁', '身も蓋もない真実', '特異物証', '地雷検死', '検死開示', 'ホスティング関所', '決済関所'];

for (const ent of entities) {
  // A. essence (min 40/30/30 chars)
  if (!ent.essence || !ent.essence.whatItDoes || !ent.essence.targetCustomer || !ent.essence.painRelief) {
    errors.push(`[RULE VIOLATION: Missing Essence] ${ent.name} is missing essence object or required fields.`);
  } else {
    if (ent.essence.whatItDoes.length < 40) errors.push(`[RULE VIOLATION: Thin Essence] ${ent.name} whatItDoes is too short (< 40 chars).`);
    if (ent.essence.targetCustomer.length < 30) errors.push(`[RULE VIOLATION: Thin Essence] ${ent.name} targetCustomer is too short (< 30 chars).`);
    if (ent.essence.painRelief.length < 30) errors.push(`[RULE VIOLATION: Thin Essence] ${ent.name} painRelief is too short (< 30 chars).`);
  }

  // B. evidenceCards (min 2 cards, each min 3 details with min 20 chars)
  if (!ent.evidenceCards || ent.evidenceCards.length < 2) {
    errors.push(`[RULE VIOLATION: Insufficient Cards] ${ent.name} has only ${ent.evidenceCards?.length || 0} evidence cards (min 2 required).`);
  } else {
    ent.evidenceCards.forEach((c, idx) => {
      if (!c.punchline || c.punchline.length < 20) {
        errors.push(`[RULE VIOLATION: Thin Card Punchline] ${ent.name} card #${idx + 1} punchline is too short (< 20 chars).`);
      }
      if (!c.details || c.details.length < 3) {
        errors.push(`[RULE VIOLATION: Thin Card Details] ${ent.name} card #${idx + 1} has only ${c.details?.length || 0} details (min 3 required).`);
      }
    });
  }

  // C. strategy (blindspot, moatDescription, initialTraction >= 3, actionPlaybook >= 3)
  if (!ent.strategy?.blindspot || !ent.strategy?.moatDescription) {
    errors.push(`[RULE VIOLATION: Missing Strategy Core] ${ent.name} is missing blindspot or moatDescription.`);
  }
  if (!ent.strategy?.initialTraction || ent.strategy.initialTraction.length < 3) {
    errors.push(`[RULE VIOLATION: Thin Initial Traction] ${ent.name} initialTraction count < 3.`);
  }
  if (!ent.strategy?.actionPlaybook || ent.strategy.actionPlaybook.length < 3) {
    errors.push(`[RULE VIOLATION: Thin Action Playbook] ${ent.name} actionPlaybook count < 3.`);
  }

  // D. observations & observationsStream (min 4 items)
  if (!ent.observations || ent.observations.length < 4) {
    errors.push(`[RULE VIOLATION: Thin Observations] ${ent.name} observations count is ${ent.observations?.length || 0} (min 4 required).`);
  }
  if (!ent.observationsStream || ent.observationsStream.length < 4) {
    errors.push(`[RULE VIOLATION: Thin ObservationsStream] ${ent.name} observationsStream count is ${ent.observationsStream?.length || 0} (min 4 required).`);
  }

  // E. Forbidden Jargon Guard
  const entStr = JSON.stringify(ent);
  for (const j of FORBIDDEN_JARGON) {
    if (entStr.includes(j)) {
      errors.push(`[RULE VIOLATION: Forbidden Jargon '${j}'] ${ent.name} contains forbidden internal buzzword.`);
    }
  }
}

if (errors.length > 0) {
  console.error(`\n❌ [check-ingest-quality] FAILED with ${errors.length} quality violations:`);
  errors.slice(0, 10).forEach(err => console.error(`  - ${err}`));
  if (errors.length > 10) console.error(`  ...and ${errors.length - 10} more`);
  process.exit(1);
}

console.log(`✓ [check-ingest-quality] PASSED: All ${entities.length} entities satisfy domain consistency, tool accuracy, arithmetic precision, content completeness (min 4 obs, min 2 cards x 3 details, min 3 steps), and zero jargon.\n`);

