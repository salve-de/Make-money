import fs from 'node:fs';

const changed = [];
function edit(file, transform) {
  const source = fs.readFileSync(file, 'utf8');
  const next = transform(source);
  if (next !== source) { fs.writeFileSync(file, next); changed.push(file); }
}
for (const file of ['e2e/company-inspector.spec.ts', 'e2e/navigation.spec.ts']) {
  edit(file, source => {
    if (!source.includes("from './inspector-actions'")) source = "import { openNotes, selectCompany } from './inspector-actions';\n" + source;
    return source.replaceAll("await page.getByRole('button', { name: 'メモ', exact: true }).click();", 'await openNotes(page);')
      .replaceAll('await page.getByTitle(/考察メモ/).click();', 'await openNotes(page);')
      .replaceAll("await page.getByTitle('次銘柄', { exact: true }).click();", "await selectCompany(page, 'Photo AI');")
      .replaceAll("await page.getByTitle('前銘柄', { exact: true }).click();", "await selectCompany(page, 'キーエンス (KEYENCE)');")
      .replaceAll("{ name: /財務P&L/ }", "{ name: /現金の解剖室/ }")
      .replaceAll("{ name: '財務P&L 未確認' }", "{ name: /現金の解剖室/ }")
      .replaceAll('#section-financial', '#section-cash-anatomy')
      .replaceAll('財務データは未確認', '財務データ未確認')
      .replaceAll("'営業利益 (税引前)'", "'純手残り (営業利益)'")
      .replaceAll("{ name: /儲けのウラ側|特異物証/ }", "{ name: /動かぬ証拠 4大急所/ }")
      .replace("  await expect(page.getByText('保存済み観測を表示', { exact: true })).toBeVisible();", "  await page.getByRole('button', { name: '【証拠】検証エビデンス', exact: true }).click();\n  await expect(page.getByText('保存済み観測を表示', { exact: true })).toBeVisible();")
      .replace("  await expect(page.locator('#section-cash-anatomy')).toContainText('POST-MORTEM');", "  await expect(page.locator('aside')).toContainText('赤字出血');");
  });
}
edit('e2e/audit-regressions.spec.ts', source => source
  .replace("  await expect(page.getByRole('button', { name: '財務台帳', exact: true })).toBeVisible();\n  await expect(page.getByRole('button', { name: 'Playbook', exact: true })).toBeVisible();", "  await expect(page.getByRole('button', { name: '【本丸】資本主義の裏帳簿', exact: true })).toBeVisible();\n  const response = await page.request.get('/api/company-analysis?entity_id=ent_photoai');\n  expect([401, 403]).toContain(response.status());")
  .replaceAll("{ name: '財務P&L 未確認' }", "{ name: /現金の解剖室/ }")
  .replaceAll('#section-financial', '#section-cash-anatomy')
  .replaceAll('財務データは未確認', '財務データ未確認'));

edit('src/features/company-inspector/ui/CashAnatomySection.tsx', source => {
  if (source.includes("import { IncompleteCashSummary }")) return source;
  source = source.replace("import React, { useEffect, useRef, useState } from 'react';", "import React, { useEffect, useRef, useState } from 'react';\nimport { IncompleteCashSummary } from './IncompleteCashSummary';")
    .replace("  const [viewMode, setViewMode] = useState<CashViewMode>(defaultMode);", "  const [viewMode, setViewMode] = useState<CashViewMode>(defaultMode);\n  const incompleteInputs = Boolean(entity.pnl.isOperatingProfitUnconfirmed || entity.pnl.isCostBreakdownUnconfirmed);")
    .replace("    if (!el || viewMode === 'TABLE') return;", "    if (!el || viewMode === 'TABLE' || isFinancialUnavailable || incompleteInputs) return;")
    .replace("      resizeObserver.disconnect();", "      resizeObserver.disconnect();\n      myChart?.dispose();\n      if (chartInstance.current === myChart) chartInstance.current = null;")
    .replace('actualProfitPct, formatMoney]);', 'actualProfitPct, formatMoney, isFinancialUnavailable, incompleteInputs]);')
    .replace('  return (\n    <section', '  if (incompleteInputs) return <IncompleteCashSummary entity={entity} formatMoney={formatMoney} />;\n\n  return (\n    <section');
  if (!source.includes('if (incompleteInputs) return')) throw new Error('Cash guard insertion failed');
  return source;
});

const controls = JSON.parse(fs.readFileSync('data/entities-index.json', 'utf8')).filter(entity => ['ent_keyence', 'ent_photoai'].includes(entity.id)).map(({ id, pnl }) => ({ id, pnl }));
console.log('PR20_FINANCIAL_CONTROLS=' + JSON.stringify(controls));
console.log('PR20_PATCHED_FILES=' + JSON.stringify(changed));
