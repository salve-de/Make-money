import fs from 'node:fs';

const batchPath = process.env.MM_BATCH_FILE ?? 'data/incoming/batch_new_1000_final_primary_mubs_20260916.json';
const capturePath = process.env.MM_CAPTURE_AUDIT_FILE ?? 'data/incoming/raw_snapshots_new1000_20260916.audit.json';
const outputPath = process.env.MM_OUTPUT_FILE ?? 'data/incoming/pnl_period_consistency_audit_new1000_20260916.json';
const batch = JSON.parse(fs.readFileSync(batchPath, 'utf8'));
const captureAudit = JSON.parse(fs.readFileSync(capturePath, 'utf8'));
const captures = new Map((captureAudit.results ?? []).map((item) => [item.entityId, item]));

const strip = (body) => String(body ?? '')
  .replace(/<article\b[\s\S]*?<\/article>/i, (article) => article)
  .replace(/read\s+this\s+next|related\s*:|<footer\b[\s\S]*/i, '')
  .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<br\s*\/?>|<\/(?:p|div|li|h[1-6]|blockquote|tr)>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&#x27;|&#39;|&apos;/gi, "'")
  .replace(/&quot;/gi, '"')
  .replace(/&#8217;|&#x2019;/gi, "'")
  .replace(/&#8211;|&#x2013;/gi, '-')
  .replace(/&#8220;|&#x201c;/gi, '"')
  .replace(/&#8221;|&#x201d;/gi, '"')
  .replace(/\s+/g, ' ')
  .trim()
  .toLowerCase();

const metricVariants = (metric) => {
  const original = String(metric.original ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
  const amount = Number(metric.amount);
  const symbol = metric.currency === 'USD' ? '\\$' : metric.currency === 'GBP' ? '£' : metric.currency === 'EUR' ? '€' : metric.currency === 'JPY' ? '[¥￥]' : '';
  const values = new Set([original]);
  if (Number.isFinite(amount) && symbol) {
    values.add(`${symbol}${Number.isInteger(amount) ? amount.toLocaleString('en-US') : amount}`);
    if (amount >= 1000 && amount < 1_000_000) values.add(`${symbol}${(amount / 1000).toLocaleString('en-US', { maximumFractionDigits: 2 })}k`);
    if (amount >= 1_000_000) values.add(`${symbol}${(amount / 1_000_000).toLocaleString('en-US', { maximumFractionDigits: 2 })}m`);
  }
  return [...values].map((value) => value.replace(/\\\$/g, '$')).filter((value) => value.length > 1);
};

const periodTerms = {
  monthly: /\b(?:monthly|per\s+month|a\s+month|each\s+month|this\s+month|last\s+month|mrr)\b|\/\s*month\b/i,
  annual: /\b(?:annual(?:ly)?|yearly|per\s+year|a\s+year|this\s+year|last\s+year|full\s+year|in\s+20(?:24|25|26)|during\s+20(?:24|25|26)|20(?:24|25|26)\s+(?:revenue|sales|profit))\b/i,
};
const valueTerms = /\b(?:revenue|sales|turnover|income|earned|earning|profit|profits|margin|mrr|arr)\b/i;
const speculative = /\b(?:doesn['’]t\s+say|don['’]t\s+know|probably|likely|typical\s+margins?|could\s+be|might|estimate(?:d)?|assuming|guess(?:ed)?)\b/i;

function occurrences(text, variants) {
  const out = [];
  for (const variant of variants) {
    let position = text.indexOf(variant);
    while (position >= 0) {
      const start = Math.max(0, position - 90);
      const end = Math.min(text.length, position + variant.length + 90);
      out.push({ variant, position, context: text.slice(start, end) });
      position = text.indexOf(variant, position + 1);
    }
  }
  return out;
}

function directPeriods(text, metric) {
  return occurrences(text, metricVariants(metric)).map((item) => {
    const monthly = periodTerms.monthly.test(item.context);
    const annual = periodTerms.annual.test(item.context);
    return {
      variant: item.variant,
      monthly,
      annual,
      valueContext: valueTerms.test(item.context),
      speculative: speculative.test(item.context),
      context: item.context,
    };
  });
}

const rows = [];
for (const entity of batch) {
  const capture = captures.get(entity.id);
  const text = capture?.localPath && fs.existsSync(capture.localPath) ? strip(fs.readFileSync(capture.localPath, 'utf8')) : '';
  const metrics = (entity.reportedMetrics ?? []).filter((metric) => /^(MONTHLY|ANNUAL)_(REVENUE|PROFIT)$/.test(String(metric.unit)));
  const metricAudits = metrics.map((metric) => {
    const evidence = directPeriods(text, metric);
    const directMonthly = evidence.some((item) => item.monthly && item.valueContext && !item.speculative);
    const directAnnual = evidence.some((item) => item.annual && item.valueContext && !item.speculative);
    const expectedPeriod = directMonthly && !directAnnual ? 'MONTHLY' : directAnnual && !directMonthly ? 'ANNUAL' : directMonthly && directAnnual ? 'AMBIGUOUS' : 'UNKNOWN';
    const unitPeriod = String(metric.unit).startsWith('MONTHLY') ? 'MONTHLY' : 'ANNUAL';
    return { original: metric.original, unit: metric.unit, source: metric.source, expectedPeriod, unitMatchesExpectedPeriod: expectedPeriod === 'UNKNOWN' || expectedPeriod === 'AMBIGUOUS' || expectedPeriod === unitPeriod, evidence: evidence.slice(0, 4) };
  });
  const monthlyRevenue = Number(entity.pnl?.monthlyRevenue ?? 0);
  const boundRevenue = (entity.reportedMetrics ?? []).filter((metric) => metric.jpyAmount === monthlyRevenue && metric.unit === 'MONTHLY_REVENUE');
  const pnlEvidence = boundRevenue.flatMap((metric) => directPeriods(text, metric));
  const directMonthlyRevenue = monthlyRevenue <= 0 || pnlEvidence.some((item) => item.monthly && item.valueContext && !item.speculative);
  const directAnnualRevenue = monthlyRevenue > 0 && pnlEvidence.some((item) => item.annual && item.valueContext && !item.speculative);
  rows.push({ id: entity.id, name: entity.name, rawCaptured: Boolean(text), pnlMonthlyRevenueJpy: monthlyRevenue, monthlyRevenueMetricCount: boundRevenue.length, directMonthlyRevenue, directAnnualRevenue, metricAudits });
}

const report = {
  schemaVersion: 'pnl-period-consistency-audit.v1',
  input: batchPath,
  captureAudit: capturePath,
  interpretation: '原文スナップショットの金額近傍に明示された期間語だけを使う機械監査。UNKNOWN/AMBIGUOUSは補正せず、利益・売上の独立監査とはみなさない。',
  count: rows.length,
  rawCaptured: rows.filter((row) => row.rawCaptured).length,
  metricPeriodMismatches: rows.reduce((sum, row) => sum + row.metricAudits.filter((metric) => !metric.unitMatchesExpectedPeriod).length, 0),
  pnlMonthlyRevenueWithoutDirectMonthlyEvidence: rows.filter((row) => row.pnlMonthlyRevenueJpy > 0 && !row.directMonthlyRevenue).length,
  pnlMonthlyRevenueWithDirectAnnualEvidence: rows.filter((row) => row.directAnnualRevenue).length,
  rows,
};
fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ outputPath, count: report.count, rawCaptured: report.rawCaptured, metricPeriodMismatches: report.metricPeriodMismatches, pnlMonthlyRevenueWithoutDirectMonthlyEvidence: report.pnlMonthlyRevenueWithoutDirectMonthlyEvidence, pnlMonthlyRevenueWithDirectAnnualEvidence: report.pnlMonthlyRevenueWithDirectAnnualEvidence }, null, 2));
