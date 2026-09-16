import fs from 'node:fs';

const ENTITIES = process.env.MM_ENTITIES_FILE ?? 'data/incoming/batch_indie_hackers_mixed_enriched_1000_20260916.json';
const SIGNALS = process.env.MM_SIGNALS_FILE ?? 'data/incoming/batch_indie_hackers_mixed_official_financial_signals_1000.json';
const REVIEW = process.env.MM_REVIEW_FILE ?? 'data/incoming/batch_indie_hackers_mixed_official_financial_signal_review_1000.json';
const OUTPUT = process.env.MM_OUTPUT_FILE ?? 'data/incoming/batch_indie_hackers_mixed_financial_reviewed_1000_20260916.json';

const entities = JSON.parse(fs.readFileSync(ENTITIES, 'utf8'));
const signalRows = JSON.parse(fs.readFileSync(SIGNALS, 'utf8'));
const reviewRows = JSON.parse(fs.readFileSync(REVIEW, 'utf8'));
const byId = new Map(signalRows.map((row) => [row.id, row]));
const reviewById = new Map(reviewRows.map((row) => [row.id, row]));

const clip = (value, max = 900) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
const output = entities.map((entity) => {
  const r = reviewById.get(entity.id);
  const s = byId.get(entity.id);
  if (!r?.manualReviewRequired || !s) return entity;
  const snippets = Array.isArray(s.signals) ? s.signals.filter(Boolean).slice(0, 3).map((x) => clip(x)) : [];
  const cardId = `${entity.id}-official-financial-signal-review`;
  const existing = Array.isArray(entity.evidenceCards) ? entity.evidenceCards : [];
  if (existing.some((card) => card.id === cardId)) return entity;
  const card = {
    id: cardId,
    type: 'FINANCIAL_SIGNAL_REVIEW',
    title: '公式ページで観測された財務関連表現（要手動確認）',
    badge: r.evidenceTier,
    evidenceStatus: 'REPORTED',
    punchline: '公式ページの取得本文に財務関連表現を観測したが、事業者自身の実績・期間・利益を独立確認していない。',
    details: [
      `公式URLの取得状態: HTTP ${s.status}; 最終URL: ${s.finalUrl ?? s.requestedUrl ?? '未確認'}`,
      `分類: ${r.evidenceTier}; 利益定量表現候補: ${r.quantifiedProfitSignal ? 'あり' : 'なし'}; 売上定量表現候補: ${r.quantifiedRevenueSignal ? 'あり' : 'なし'}`,
      ...snippets.map((snippet) => `取得本文の抜粋（原文観測・独立確認未済）: ${snippet}`),
      '顧客事例・第三者実績・料金表・デモデータの可能性を排除できないため、P&L、利益、現在の自立性には反映しない。',
    ],
    sourceNote: `公式URLの取得監査, ${s.checkedAt ?? '確認日未確認'}: ${s.finalUrl ?? s.requestedUrl ?? '未確認'}`,
    sourceUrl: s.finalUrl ?? s.requestedUrl ?? entity.url,
    sourceClass: 'PRIMARY_SOURCE_CANDIDATE',
    metrics: [],
    evidenceLocator: { type: 'html', status: s.status, bodySha256: s.bodySha256 ?? null },
  };
  return { ...entity, evidenceCards: [...existing, card] };
});

fs.writeFileSync(OUTPUT, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ inputEntities: entities.length, output: OUTPUT, attached: output.filter((entity) => entity.evidenceCards?.some((card) => card.type === 'FINANCIAL_SIGNAL_REVIEW')).length, pAndLChanged: false }, null, 2));
