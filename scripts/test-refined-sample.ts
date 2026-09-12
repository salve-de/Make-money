import { REFINED_STATISTICAL_SAMPLE_ENTITIES } from './refined-sample-entities';
import { normalizeFinancialEntity } from '../src/shared/financial-integrity';
import { reconcileFinancialEntity } from '../src/platform/data/financial-reconciliation';

async function main() {
  console.log('=== Validating 5 Refined Sample Entities ===');
  let passed = 0;

  for (const entity of REFINED_STATISTICAL_SAMPLE_ENTITIES) {
    console.log(`\nValidating [${entity.ticker}] ${entity.name} (${entity.id})...`);

    // 1. Check Required Attributes
    const required = ['id', 'ticker', 'name', 'tagline', 'sector', 'scale', 'founder', 'country', 'url'];
    for (const req of required) {
      if (!entity[req as keyof typeof entity]) {
        throw new Error(`Missing required attribute: ${req}`);
      }
    }

    // 2. Check P&L
    if (!entity.pnl || typeof entity.pnl.monthlyRevenue !== 'number' || entity.pnl.monthlyRevenue <= 0) {
      throw new Error(`Invalid P&L monthlyRevenue: ${entity.pnl?.monthlyRevenue}`);
    }
    if (typeof entity.pnl.grossMargin !== 'number' || typeof entity.pnl.operatingMargin !== 'number') {
      throw new Error(`Invalid margins in P&L`);
    }

    // 3. Check Evidence Cards (Must have >= 2, and LOOT_BLUEPRINT must exist)
    const cards = entity.evidenceCards || [];
    if (cards.length < 2) {
      throw new Error(`Must have at least 2 evidenceCards, found: ${cards.length}`);
    }
    const loot = cards.find(c => c.type === 'LOOT_BLUEPRINT');
    if (!loot || !loot.details || loot.details.length < 3 || !loot.codeSnippet) {
      throw new Error(`Invalid LOOT_BLUEPRINT card`);
    }

    // 4. Check Strategy & Temporal
    if (!entity.strategy?.blindspot || !entity.strategy?.moatType || !entity.strategy?.actionPlaybook) {
      throw new Error(`Invalid strategy fields`);
    }
    if (!entity.temporal?.foundedYear || !entity.temporal?.viabilityStatus) {
      throw new Error(`Invalid temporal fields`);
    }

    // 5. Test financial normalization & reconciliation pipeline
    const reconciled = reconcileFinancialEntity(entity);
    const normalized = normalizeFinancialEntity(reconciled);

    if (!normalized.id || !normalized.pnl) {
      throw new Error(`Normalization failed`);
    }

    console.log(`  ✓ Passed Keyence Gold Schema validation!`);
    console.log(`  - Revenue: ¥${normalized.pnl.monthlyRevenue.toLocaleString()} | Gross Margin: ${normalized.pnl.grossMargin}% | Operating Margin: ${normalized.pnl.operatingMargin}%`);
    console.log(`  - Evidence Cards: ${normalized.evidenceCards?.length} cards (including LOOT_BLUEPRINT)`);
    console.log(`  - Tagline: ${normalized.tagline.slice(0, 50)}...`);
    passed++;
  }

  console.log(`\n========================================`);
  console.log(`ALL ${passed}/${REFINED_STATISTICAL_SAMPLE_ENTITIES.length} ENTITIES FULLY VALIDATED!`);
  console.log(`========================================`);
}

main().catch(err => {
  console.error('Validation failed:', err);
  process.exit(1);
});
