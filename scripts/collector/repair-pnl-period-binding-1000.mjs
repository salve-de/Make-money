import fs from 'node:fs';

const inputPath = process.env.MM_INPUT_FILE ?? 'data/incoming/batch_new_1000_final_primary_mubs_20260916.json';
const outputPath = process.env.MM_OUTPUT_FILE ?? inputPath;
const reportPath = process.env.MM_REPORT_FILE ?? 'data/incoming/pnl_period_binding_repair_new1000_20260916.json';
const batch = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

const explicitMonthly = /\b(?:monthly|per\s+month|a\s+month|each\s+month|this\s+month|last\s+month|mrr)\b|\/\s*month\b/i;
const explicitAnnual = /\b(?:annual(?:ly)?|yearly|per\s+year|a\s+year|this\s+year|last\s+year|full\s+year|in\s+20(?:24|25|26)|during\s+20(?:24|25|26))\b/i;
const rateForCurrency = { USD: 150, GBP: 190, JPY: 1 };

let changed = 0;
let retained = 0;
const changes = [];
for (const entity of batch) {
  const previous = Number(entity.pnl?.monthlyRevenue ?? 0);
  const profileCandidates = (entity.reportedMetrics ?? []).filter((metric) => (
    metric.source === 'profile-card'
    && metric.unit === 'MONTHLY_REVENUE'
    && Number.isFinite(metric.jpyAmount)
    && metric.jpyAmount > 0
    && explicitMonthly.test(String(metric.context ?? ''))
    && !explicitAnnual.test(String(metric.context ?? ''))
  ));
  const primaryCandidates = (entity.reportedMetrics ?? []).filter((metric) => (
    entity.pnl?.sourceClass === 'PRIMARY_AUTHOR_INTERVIEW'
    && metric.unit === 'MONTHLY_REVENUE'
    && Number.isFinite(metric.jpyAmount)
    && metric.jpyAmount > 0
    && String(metric.source ?? '') === String(entity.pnl?.sourceDoc ?? '')
  ));
  const unique = [...new Map([...profileCandidates, ...primaryCandidates].map((metric) => [metric.jpyAmount, metric])).values()];
  const chosen = unique.length === 1 ? unique[0] : null;
  if (chosen) retained += 1;
  const next = chosen?.jpyAmount ?? 0;
  if (previous !== next) {
    changed += 1;
    changes.push({ id: entity.id, name: entity.name, previousMonthlyRevenueJpy: previous, nextMonthlyRevenueJpy: next, reason: chosen ? 'EXPLICIT_PROFILE_CARD_MONTHLY_REVENUE' : 'NO_UNAMBIGUOUS_EXPLICIT_PROFILE_CARD_MONTHLY_REVENUE', metric: chosen ? { original: chosen.original, amount: chosen.amount, currency: chosen.currency, jpyAmount: chosen.jpyAmount, unit: chosen.unit, source: chosen.source, context: chosen.context } : null });
  }
  if (!entity.pnl) continue;
  entity.pnl = {
    ...entity.pnl,
    monthlyRevenue: next,
    grossProfit: next - Number(entity.pnl.cogs ?? 0),
    grossMargin: next > 0 ? ((next - Number(entity.pnl.cogs ?? 0)) / next) * 100 : 0,
    estimationLogic: chosen
      ? `${chosen.currency}報告月商 ${chosen.amount.toLocaleString('en-US')} に ${rateForCurrency[chosen.currency] ?? '未確認'}円を掛けた報告値 ${chosen.jpyAmount.toLocaleString('ja-JP')}円。${chosen.source === 'profile-card' ? 'プロフィールカードに月次売上が明記されている。' : '一次著者インタビューのsourceDoc一致値。'}利益・原価・経費は未確認。`
      : '月次売上として一意に結び付くプロフィールカードの明示根拠がないため、P&L月商へは投入しない。reportedMetricsと原文証拠は保持し、利益・原価・経費は未確認。',
  };
  entity.sourceMetadata = {
    ...(entity.sourceMetadata ?? {}),
    pnlPeriodAudit: {
      status: chosen ? 'EXPLICIT_PROFILE_CARD_MONTHLY_REVENUE' : 'NO_UNAMBIGUOUS_EXPLICIT_PROFILE_CARD_MONTHLY_REVENUE',
      previousMonthlyRevenueJpy: previous,
      boundMonthlyRevenueJpy: next,
      evidence: chosen ? { original: chosen.original, amount: chosen.amount, currency: chosen.currency, jpyAmount: chosen.jpyAmount, unit: chosen.unit, source: chosen.source, context: chosen.context } : null,
      rule: 'プロフィールカードのMONTHLY_REVENUEかつ月次語が明示され年次語が同一コンテキストにない場合、またはPRIMARY_AUTHOR_INTERVIEWのsourceDoc一致MONTHLY_REVENUEだけをP&L月商へ結合。',
    },
  };
}
fs.writeFileSync(outputPath, `${JSON.stringify(batch, null, 2)}\n`, 'utf8');
const report = { schemaVersion: 'pnl-period-binding-repair.v1', input: inputPath, output: outputPath, count: batch.length, retainedExplicitProfileMonthly: retained, changed, removedFromPnl: changes.filter((item) => item.previousMonthlyRevenueJpy > 0 && item.nextMonthlyRevenueJpy === 0).length, changes };
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(report, null, 2));
