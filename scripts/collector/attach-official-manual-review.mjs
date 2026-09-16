import fs from 'node:fs';

const reviewPath = process.env.MM_REVIEW_FILE ?? 'data/incoming/official_financial_signal_manual_review_20260916.json';
const batchPaths = (process.env.MM_BATCH_FILES ?? [
  'data/incoming/batch_new_1000_final_primary_mubs_20260916.json',
  'data/incoming/batch_final100_subset_of_new1000_20260916.json',
].join(',')).split(',').filter(Boolean);
const review = JSON.parse(fs.readFileSync(reviewPath, 'utf8'));
const byId = new Map(review.rows.map((row) => [row.id, row]));
const summaries = [];

for (const batchPath of batchPaths) {
  const batch = JSON.parse(fs.readFileSync(batchPath, 'utf8'));
  let attached = 0;
  const next = batch.map((entity) => {
    const row = byId.get(entity.id);
    if (!row) return entity;
    attached += 1;
    const existingCards = Array.isArray(entity.evidenceCards) ? entity.evidenceCards : [];
    const cardId = `${entity.id}-official-reported-profit-review`;
    const cards = row.profitEvidenceDisposition === 'REPORTED_PRIMARY_NOT_INDEPENDENTLY_AUDITED' && !existingCards.some((card) => card.id === cardId)
      ? [...existingCards, {
        id: cardId,
        type: 'FINANCIAL_SIGNAL_REVIEW',
        title: '本人サイトの利益報告（独立監査なし）',
        badge: '本人報告・未監査',
        evidenceStatus: 'REPORTED',
        punchline: '本人サイトに利益の定量表現があるが、対象期間・会計資料・決済記録の独立確認は未実施。',
        details: [...row.observedSignals.map((signal, index) => `本人サイト本文の観測${index + 1}: ${signal}`), row.reason, 'このカードは本人報告の存在を示すだけで、verifiedな利益値やP&Lへの反映を意味しない。'],
        sourceNote: `本人サイト財務表現の手動監査, ${row.checkedAt}: ${row.finalUrl ?? row.requestedUrl}`,
        sourceUrl: row.finalUrl ?? row.requestedUrl,
        sourceClass: 'PRIMARY_SOURCE_CANDIDATE',
        evidenceLocator: { type: 'html', status: row.status },
        metrics: [],
      }]
      : existingCards;
    return { ...entity, evidenceCards: cards, sourceMetadata: { ...entity.sourceMetadata, officialFinancialManualReview: row } };
  });
  fs.writeFileSync(batchPath, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
  summaries.push({ batchPath, count: next.length, attached });
}

console.log(JSON.stringify({ reviewPath, summaries }, null, 2));
