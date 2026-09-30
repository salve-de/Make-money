import { reportedAnnualReport, revenueTextInputOf, sourceKindLabel } from '@/shared/display-text';
import type { FinancialEntity } from '@/shared/terminal';

const HTTP_URL = /https?:\/\/\S+/i;

/**
 * 出典のある事実を1つでも持つか。公開版に入れるかどうかの判定に使う。
 * 出典のある事実 = 次のどれか。
 *  - 出典URLつきの観察
 *  - SEC・EDINET・有価証券報告書に基づく数値
 *  - 出典URLつきで本文のある証拠カード
 */
export function hasSourcedFact(entity: FinancialEntity): boolean {
  const hasSourcedObservation = (entity.observationsStream || []).some((observation) =>
    HTTP_URL.test(observation.sourceUrl || '')
    || (observation.publicDisplay?.sourceUrls || []).some((url) => HTTP_URL.test(url)));
  if (hasSourcedObservation) return true;

  const hasSourcedCard = (entity.evidenceCards || []).some((card) =>
    HTTP_URL.test(card.sourceNote || '')
    && Boolean(
      card.punchline?.trim()
      || (card.details || []).some((detail) => detail.trim())
      || (card.metrics?.length ?? 0) > 0,
    ));
  if (hasSourcedCard) return true;

  const pnl = entity.pnl;
  const disclosed = sourceKindLabel({ text: pnl.sourceDoc }) === '開示資料';
  if (disclosed) {
    const hasNumber = reportedAnnualReport(revenueTextInputOf(entity)) !== null
      || !pnl.isRevenueUnconfirmed
      || !pnl.isOperatingProfitUnconfirmed;
    if (hasNumber) return true;
  }
  return false;
}
