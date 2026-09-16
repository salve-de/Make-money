#!/usr/bin/env node

import fs from 'node:fs';

const file = 'data/incoming/batch_indie_hackers_verified_1000_20260916.json';
const USD_JPY = 150;
const batch = JSON.parse(fs.readFileSync(file, 'utf8'));
if (!Array.isArray(batch) || batch.length !== 1000) throw new Error(`Expected 1000 records, got ${batch?.length}`);

for (const entity of batch) {
  const label = String(entity.pnl?.revenueLabel ?? '');
  const match = label.match(/US\$([\d,]+)/i);
  const usd = match ? Number(match[1].replaceAll(',', '')) : 0;
  if (!Number.isFinite(usd) || usd <= 0) throw new Error(`Missing reported USD revenue for ${entity.name}`);
  entity.pnl.monthlyRevenue = Math.round(usd * USD_JPY);
  entity.pnl.financialStatus = 'REPORTED';
  entity.pnl.currency = 'JPY';
  entity.pnl.usdJpyRate = USD_JPY;
  entity.pnl.estimationLogic = `Indie Hackers表示の月間US$${usd.toLocaleString('en-US')}に文書定義の1 USD=¥${USD_JPY}を掛けて報告月商を保持。原価・経費・利益は根拠がないため未確認。`;
  entity.pnl.isRevenueUnconfirmed = true;
  entity.pnl.isOperatingProfitUnconfirmed = true;
  entity.pnl.isMarginUnconfirmed = true;
  entity.pnl.isGrossProfitUnconfirmed = true;
  entity.pnl.isGrossMarginUnconfirmed = true;
  entity.pnl.isCogsUnconfirmed = true;
  entity.pnl.isCostsUnconfirmed = true;
  entity.pnl.isNetProfitUnconfirmed = true;
}

fs.writeFileSync(file, `${JSON.stringify(batch, null, 2)}\n`, 'utf8');
console.log(`retained reported monthly revenue for ${batch.length} records; USD x ${USD_JPY} JPY`);
