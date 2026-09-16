import fs from 'node:fs';

const batchPaths = (process.env.MM_BATCH_FILES ?? [
  'data/incoming/batch_new_1000_final_primary_mubs_20260916.json',
  'data/incoming/batch_final100_subset_of_new1000_20260916.json',
].join(',')).split(',').filter(Boolean);
const summaries = [];
for (const batchPath of batchPaths) {
  const batch = JSON.parse(fs.readFileSync(batchPath, 'utf8'));
  let changed = 0;
  for (const entity of batch) {
    const pnl = entity.pnl;
    if (!pnl || typeof pnl.monthlyRevenue !== 'number' || typeof pnl.cogs !== 'number') continue;
    const grossProfit = pnl.monthlyRevenue - pnl.cogs;
    const grossMargin = pnl.monthlyRevenue > 0 ? (grossProfit / pnl.monthlyRevenue) * 100 : 0;
    if (pnl.grossProfit !== grossProfit || pnl.grossMargin !== grossMargin) changed += 1;
    entity.pnl = {
      ...pnl,
      grossProfit,
      grossMargin,
      grossProfitDerivation: '機械的整合値: monthlyRevenue - cogs。原価・粗利・粗利率は未確認フラグ付きであり、利益の確定値として解釈してはならない。',
    };
  }
  fs.writeFileSync(batchPath, `${JSON.stringify(batch, null, 2)}\n`, 'utf8');
  summaries.push({ batchPath, count: batch.length, changed });
}
console.log(JSON.stringify({ summaries }, null, 2));
