import fs from 'node:fs';

const INPUT = process.env.MM_INPUT_FILE ?? 'data/incoming/batch_indie_hackers_mixed_official_financial_signals_1000.json';
const OUTPUT = process.env.MM_OUTPUT_FILE ?? 'data/incoming/batch_indie_hackers_mixed_official_financial_signal_review_1000.json';

const rows = JSON.parse(fs.readFileSync(INPUT, 'utf8'));
const money = '(?:\\$|€|£|¥)\\s?\\d[\\d,.]*\\s?(?:k|m|million|thousand)?';
const directRevenueMetric = new RegExp(`(?:\\b(?:MRR|ARR)\\b|${money}[^.]{0,100}\\b(?:revenue|sales|paid out|income)\\b|\\b(?:revenue|sales|paid out|income)\\b[^.]{0,100}${money})`, 'i');
const directProfitMetric = new RegExp(`(?:${money}[^.]{0,100}\\b(?:profit|profitability|margin)\\b|\\b(?:profit|profitability|margin)\\b[^.]{0,100}${money})`, 'i');
const financialLanguage = /\\b(?:MRR|ARR|revenue|sales|profit|profitable|profitability|margin|paid out|income)\\b|売上|年商|利益|粗利|収益/i;
const pricingLanguage = /\\bpricing\\b|\\bplans?\\b|per\\s+month|monthly|annual|\\$|€|£|¥|価格/i;

const classify = (row) => {
  const text = Array.isArray(row.signals) ? row.signals.join(' ') : '';
  const reachable = row.reachable === true || row.status === 200;
  const quantifiedRevenueSignal = directRevenueMetric.test(text);
  const quantifiedProfitSignal = directProfitMetric.test(text);
  let evidenceTier = 'NO_FINANCIAL_SIGNAL';
  if (!reachable) evidenceTier = 'UNREACHABLE';
  else if (quantifiedProfitSignal) evidenceTier = 'QUANTIFIED_PROFIT_LANGUAGE_REVIEW';
  else if (quantifiedRevenueSignal) evidenceTier = 'QUANTIFIED_REVENUE_LANGUAGE_REVIEW';
  else if (financialLanguage.test(text)) evidenceTier = 'FINANCIAL_LANGUAGE_REVIEW';
  else if (pricingLanguage.test(text)) evidenceTier = 'PRICING_ONLY';

  return {
    id: row.id,
    name: row.name,
    requestedUrl: row.requestedUrl,
    finalUrl: row.finalUrl ?? null,
    status: row.status,
    reachable,
    financialSignalObserved: row.financialSignalObserved === true,
    evidenceTier,
    quantifiedProfitSignal,
    quantifiedRevenueSignal,
    manualReviewRequired: quantifiedProfitSignal || quantifiedRevenueSignal,
    checkedAt: row.checkedAt,
  };
};

const review = rows.map(classify);
fs.writeFileSync(OUTPUT, `${JSON.stringify(review, null, 2)}\n`, 'utf8');

const counts = Object.fromEntries([...new Set(review.map((r) => r.evidenceTier))].map((tier) => [tier, review.filter((r) => r.evidenceTier === tier).length]));
console.log(JSON.stringify({ input: INPUT, output: OUTPUT, count: review.length, counts, quantifiedProfit: review.filter((r) => r.quantifiedProfitSignal).length, quantifiedRevenue: review.filter((r) => r.quantifiedRevenueSignal).length }, null, 2));
