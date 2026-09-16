import fs from 'node:fs';

const inputPath = process.env.MM_INPUT_FILE ?? 'data/incoming/batch_new_1000_final_primary_mubs_20260916.json';
const outputPath = process.env.MM_OUTPUT_FILE ?? inputPath;
const reportPath = process.env.MM_REPORT_FILE ?? 'data/incoming/reported_metric_period_reclassification_new1000_20260916.json';
const batch = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

const sanitizeUnicode = (value) => {
  const text = String(value ?? '');
  let output = '';
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = text.charCodeAt(index + 1);
      if (next >= 0xdc00 && next <= 0xdfff) { output += text[index] + text[index + 1]; index += 1; }
      else output += '\ufffd';
    } else if (code >= 0xdc00 && code <= 0xdfff) output += '\ufffd';
    else output += text[index];
  }
  return output;
};
const safeJson = (value) => JSON.stringify(value, (_key, item) => typeof item === 'string' ? sanitizeUnicode(item) : item, 2);

const metricVariants = (metric) => {
  const original = String(metric.original ?? '').trim();
  const amount = Number(metric.amount);
  const currency = metric.currency === 'USD' ? '$' : metric.currency === 'GBP' ? '£' : metric.currency === 'EUR' ? '€' : metric.currency === 'JPY' ? '[¥￥]' : '';
  const values = new Set([original]);
  if (currency && Number.isFinite(amount)) {
    values.add(`${currency}${Number.isInteger(amount) ? amount.toLocaleString('en-US') : amount}`);
    if (amount >= 1000 && amount < 1_000_000) values.add(`${currency}${(amount / 1000).toLocaleString('en-US', { maximumFractionDigits: 2 })}k`);
    if (amount >= 1_000_000) values.add(`${currency}${(amount / 1_000_000).toLocaleString('en-US', { maximumFractionDigits: 2 })}m`);
  }
  return [...values].filter(Boolean).sort((a, b) => b.length - a.length);
};

function localContext(metric) {
  const context = String(metric.context ?? '').replace(/\s+/g, ' ').trim();
  const lower = context.toLowerCase();
  for (const variant of metricVariants(metric)) {
    const index = lower.indexOf(variant.toLowerCase());
    if (index < 0) continue;
    return context.slice(Math.max(0, index - 70), Math.min(context.length, index + variant.length + 90));
  }
  return context.slice(0, 180);
}

const monthlyPeriod = /\b(?:monthly|per\s+month|a\s+month|each\s+month|this\s+month|last\s+month|mrr)\b|\/\s*month\b/i;
const annualPeriod = /\b(?:annual(?:ly)?|yearly|per\s+year|a\s+year|last\s+year|full\s+year|in\s+20(?:24|25|26)|during\s+20(?:24|25|26))\b/i;
const shortPeriod = /\b(?:in\s+\d+\s+(?:days?|weeks?|months?)|over\s+\d+\s+months?|first\s+month|month\s+one|since\s+launch|lifetime|total\s+revenue|best\s+month)\b/i;
const profitTerm = /\b(?:profit|profits|net\s+income|net\s+profit|gross\s+profit|operating\s+profit|take.?home|earnings)\b/i;
const revenueTerm = /\b(?:revenue|sales|turnover|income|earned|earning|mrr|arr)\b/i;
const speculativeProfit = /\b(?:doesn['’]t\s+say\s+what\s+kind\s+of\s+profit|typical\s+margins?|probably\s+(?:pulled|made|earned|has)|likely\s+(?:pulled|made|earned|has)|estimated\s+profit|could\s+(?:make|earn|be)\s+.*profit)\b/i;

function distanceToTerm(text, pattern) {
  const lower = text.toLowerCase();
  const index = lower.search(pattern);
  return index < 0 ? Number.POSITIVE_INFINITY : index;
}

function classify(metric) {
  const context = localContext(metric);
  const monthly = monthlyPeriod.test(context);
  const annual = annualPeriod.test(context);
  const short = shortPeriod.test(context);
  const profit = profitTerm.test(context);
  const revenue = revenueTerm.test(context);
  if (profit && speculativeProfit.test(context)) return { unit: 'REPORTED_MONEY_SIGNAL', reason: 'SPECULATIVE_OR_DISCLAIMED_PROFIT', context };
  if (short && !monthly && !annual) return { unit: profit ? 'TOTAL_OR_BEST_PERIOD' : revenue ? 'TOTAL_OR_BEST_PERIOD' : 'REPORTED_MONEY_SIGNAL', reason: 'EXPLICIT_SHORT_OR_TOTAL_PERIOD', context };
  if (!profit && !revenue) return { unit: 'REPORTED_MONEY_SIGNAL', reason: 'NO_DIRECT_REVENUE_OR_PROFIT_TERM', context };
  if (monthly && annual) {
    const monthDistance = Math.min(distanceToTerm(context, /monthly|per\s+month|a\s+month|each\s+month|mrr|\/\s*month/i));
    const annualDistance = Math.min(distanceToTerm(context, /annual|yearly|per\s+year|a\s+year|last\s+year|full\s+year|in\s+20(?:24|25|26)/i));
    if (monthDistance === annualDistance) return { unit: 'REPORTED_MONEY_SIGNAL', reason: 'AMBIGUOUS_MONTH_AND_YEAR_PERIOD', context };
    if (annualDistance < monthDistance) return { unit: profit ? 'ANNUAL_PROFIT' : 'ANNUAL_REVENUE', reason: 'NEAREST_EXPLICIT_ANNUAL_PERIOD', context };
  }
  if (monthly) return { unit: profit ? 'MONTHLY_PROFIT' : 'MONTHLY_REVENUE', reason: 'EXPLICIT_MONTHLY_PERIOD', context };
  if (annual) return { unit: profit ? 'ANNUAL_PROFIT' : 'ANNUAL_REVENUE', reason: 'EXPLICIT_ANNUAL_PERIOD', context };
  return { unit: 'REPORTED_MONEY_SIGNAL', reason: 'NO_EXPLICIT_MONTH_OR_YEAR_PERIOD', context };
}

const changes = [];
let articleMetrics = 0;
for (const entity of batch) {
  const metrics = entity.reportedMetrics ?? [];
  const nextMetrics = metrics.map((metric) => {
    if (metric.source !== 'article') return metric;
    articleMetrics += 1;
    const result = classify(metric);
    if (result.unit !== metric.unit) changes.push({ id: entity.id, name: entity.name, original: metric.original, previousUnit: metric.unit, nextUnit: result.unit, reason: result.reason, context: result.context });
    return { ...metric, unit: result.unit };
  });
  entity.reportedMetrics = nextMetrics;
}
fs.writeFileSync(outputPath, `${safeJson(batch)}\n`, 'utf8');
const report = { schemaVersion: 'reported-metric-period-reclassification.v1', input: inputPath, output: outputPath, count: batch.length, articleMetrics, changed: changes.length, changes };
fs.writeFileSync(reportPath, `${safeJson(report)}\n`, 'utf8');
console.log(JSON.stringify({ outputPath, reportPath, count: batch.length, articleMetrics, changed: changes.length, nextUnits: changes.reduce((out, item) => { out[item.nextUnit] = (out[item.nextUnit] ?? 0) + 1; return out; }, {}) }, null, 2));
