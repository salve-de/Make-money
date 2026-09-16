import fs from 'node:fs';

const reviewPath = process.env.MM_REVIEW_FILE ?? 'data/incoming/batch_ebizfacts_profiles_official_financial_signal_review_1000.json';
const signalsPath = process.env.MM_SIGNALS_FILE ?? 'data/incoming/batch_ebizfacts_profiles_official_financial_signals_1000_20260916.json';
const outputPath = process.env.MM_OUTPUT_FILE ?? 'data/incoming/official_financial_signal_manual_review_20260916.json';
const reviews = JSON.parse(fs.readFileSync(reviewPath, 'utf8'));
const signals = JSON.parse(fs.readFileSync(signalsPath, 'utf8'));
const signalsById = new Map(signals.map((row) => [row.id, row]));

const decisions = {
  ent_ebizfacts_nateliasonaiagentfelix177kbusiness_d074e026c8a8: {
    outcome: 'UNRELATED_SITE_CONTENT', profitEvidenceDisposition: 'EXCLUDE', sourceRole: 'official_site_unrelated_program', reason: '公式URLで検出された利益文言はFounders Schoolの生徒保証であり、対象AI事業の実績ではない。',
  },
  ent_ebizfacts_davidbresslerformulabot28myearformulabotgold_24187f0621fd: {
    outcome: 'UNRELATED_PRODUCT_DEMO_CONTENT', profitEvidenceDisposition: 'EXCLUDE', sourceRole: 'official_site_demo_content', reason: '公式URLの利益額はBetterAnalystのデモ表・サンプルデータ内の文言で、対象事業の実績ではない。',
  },
  ent_ebizfacts_angelrodriguezyachtrentalarbitrage30kmonth_eb7d684d0563: {
    outcome: 'THIRD_PARTY_ESTIMATE', profitEvidenceDisposition: 'EXCLUDE_FROM_VERIFIED_PROFIT', sourceRole: 'third_party_estimate', reason: '本文自身が正確な利益は公開されていないと記載し、14,000–22,000ドルを推計している。',
  },
  ent_ebizfacts_nateliasonkegelapp1kmonthpassiveincomenoupda_3967ed9692bf: {
    outcome: 'UNRELATED_SITE_CONTENT', profitEvidenceDisposition: 'EXCLUDE', sourceRole: 'official_site_unrelated_program', reason: '公式URLで検出された利益文言はFounders Schoolの生徒保証であり、対象アプリの実績ではない。',
  },
  ent_ebizfacts_nathanbarry38millionconvertkitpatience_d742fc007d7c: {
    outcome: 'DIRECT_FOUNDER_DISCLOSURE_REPORTED', profitEvidenceDisposition: 'REPORTED_PRIMARY_NOT_INDEPENDENTLY_AUDITED', sourceRole: 'founder_site_disclosure', reason: '本人サイトの事業概要に年間利益を明記しているが、独立監査・対象期間の完全一致は未確認。',
  },
  ent_ebizfacts_davidbresslerformulabot20kmonthaisideproject_82b172314307: {
    outcome: 'UNRELATED_PRODUCT_DEMO_CONTENT', profitEvidenceDisposition: 'EXCLUDE', sourceRole: 'official_site_demo_content', reason: '公式URLの利益額はBetterAnalystのデモ表・サンプルデータ内の文言で、対象AI事業の実績ではない。',
  },
  ent_ebizfacts_jamieifincreasingnichesites40kmonth_ba962a559d61: {
    outcome: 'DIRECT_FOUNDER_DISCLOSURE_REPORTED', profitEvidenceDisposition: 'REPORTED_PRIMARY_NOT_INDEPENDENTLY_AUDITED', sourceRole: 'founder_site_disclosure', reason: '本人サイトがSEO・アフィリエイトでの累計利益を報告しているが、対象記事の月次実績・独立監査は未確認。',
  },
};

const rows = reviews.filter((row) => row.quantifiedProfitSignal === true).map((row) => {
  const decision = decisions[row.id];
  if (!decision) throw new Error(`Missing manual decision for ${row.id}`);
  const signal = signalsById.get(row.id);
  return {
    id: row.id,
    name: row.name,
    requestedUrl: row.requestedUrl,
    finalUrl: row.finalUrl,
    checkedAt: row.checkedAt,
    evidenceTier: row.evidenceTier,
    status: row.status,
    ...decision,
    observedSignals: signal?.signals ?? [],
    rightsStatus: 'metadata_only',
    financialValuesUpdated: false,
  };
});

const report = {
  schemaVersion: 'official-financial-signal-manual-review.v1',
  generatedAt: '2026-09-16',
  interpretation: '公式ページの機械検出を、対象事業との同一性・推計性・本人報告性で手動分類した。REPORTED_PRIMARYは利益の独立監査・期間完全一致を意味しない。',
  count: rows.length,
  excludedFromVerifiedProfit: rows.filter((row) => row.profitEvidenceDisposition === 'EXCLUDE' || row.profitEvidenceDisposition === 'EXCLUDE_FROM_VERIFIED_PROFIT').length,
  reportedPrimaryNotIndependentlyAudited: rows.filter((row) => row.profitEvidenceDisposition === 'REPORTED_PRIMARY_NOT_INDEPENDENTLY_AUDITED').length,
  rows,
};
fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ outputPath, count: report.count, excludedFromVerifiedProfit: report.excludedFromVerifiedProfit, reportedPrimaryNotIndependentlyAudited: report.reportedPrimaryNotIndependentlyAudited }, null, 2));
