import type { FinancialEntity } from '@/shared/terminal';
import { formatManYenValue, yenParts } from '@/platform/utils/moneyDisplay';

export type ConfirmTone = 'muted' | 'dim' | 'accent';

export function isRevenueUnknown(entity: FinancialEntity): boolean {
  return entity.pnl.isRevenueUnconfirmed === true || entity.pnl.financialStatus === 'UNAVAILABLE';
}

/** 確認 列の文字。一次資料=確認、公表値=報告値、売上不明=未確認、推定/ピーク=アクセント。 */
export function confirmStatus(entity: FinancialEntity): { label: string; tone: ConfirmTone } {
  if (isRevenueUnknown(entity)) return { label: '未確認', tone: 'dim' };
  if (entity.pnl.dataSnapshotPeriod?.includes('ピーク')) return { label: 'ピーク', tone: 'accent' };
  switch (entity.pnl.financialStatus) {
    case 'ESTIMATED': return { label: '推定', tone: 'accent' };
    case 'VERIFIED':
    case 'POST_MORTEM':
      return { label: '確認', tone: 'muted' };
    // 本人・媒体が公表した数値（第三者の裏付けは未登録）。一覧の取得結果では区分が省かれることがある。
    default: return { label: '報告値', tone: 'muted' };
  }
}

export const CONFIRM_TONE_CLASS: Record<ConfirmTone, string> = {
  muted: 'text-term-muted',
  dim: 'text-term-dim',
  accent: 'text-term-accent',
};

export function teamSizeText(entity: FinancialEntity): string | null {
  const teamSize = entity.operations?.teamSize;
  if (entity.operations?.isTeamSizeUnconfirmed || teamSize == null) return null;
  return teamSize.toLocaleString('ja-JP');
}

/** 月商の数値と単位。未確認は null。JPY は万円、USD は従来どおりドル表記。 */
export function monthlyRevenueParts(entity: FinancialEntity, currency: 'JPY' | 'USD'): { value: string; unit: string } | null {
  if (isRevenueUnknown(entity)) return null;
  const yen = entity.pnl.monthlyRevenue;
  if (currency === 'USD') {
    const usd = Math.round(yen / 150);
    if (usd >= 1_000_000) return { value: `$${(usd / 1_000_000).toFixed(1)}M`, unit: '' };
    if (usd >= 1000) return { value: `$${(usd / 1000).toFixed(0)}k`, unit: '' };
    return { value: `$${usd}`, unit: '' };
  }
  return { value: formatManYenValue(yen), unit: '万円' };
}

export { yenParts };

/** 一覧の概要は、月商列と重なる先頭の【月商150万円】のような見出しを外して出す（データは変えない）。 */
export function listDescription(text: string | null | undefined): string {
  return (text ?? '').replace(/^\s*【[^】]{1,40}】\s*/, '');
}
