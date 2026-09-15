import fs from 'node:fs';
const file = 'src/features/company-inspector/ui/CashAnatomySection.tsx';
const before = fs.readFileSync(file, 'utf8');
const after = before.replace('entity.pnl.isCostBreakdownUnconfirmed', 'entity.pnl.isCostsUnconfirmed');
if (!after.includes('entity.pnl.isCostsUnconfirmed')) throw new Error('Expected canonical cost provenance flag not found');
if (before !== after) fs.writeFileSync(file, after);
console.log('Canonical financial provenance flag repaired; no data or markup changes.');
