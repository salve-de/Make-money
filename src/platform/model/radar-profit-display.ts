import type { MarketRadarTrendItem } from '@/platform/data/marketRadarData';

export type RadarProfitStatus = 'ESTIMATED' | 'UNKNOWN';

export interface RadarProfitDisplay {
  value: string;
  status: RadarProfitStatus;
  label: string;
  badge: 'EST' | 'UNKNOWN';
  basis: string;
}

/**
 * The current radar dataset stores scenario/model ranges, not a provenance-bound
 * observed cash metric. Until a source-backed status is added to the source data,
 * fail closed: any populated player profit is an estimate, never an actual result.
 */
export function projectRadarPlayerProfit(trend: MarketRadarTrendItem): RadarProfitDisplay {
  const value = trend.gapAndProof.provenPlayer.monthlyProfit?.trim();
  if (!value || /未確認|unknown/i.test(value)) {
    return {
      value: '未確認',
      status: 'UNKNOWN',
      label: '月利',
      badge: 'UNKNOWN',
      basis: '実着金・会計実績を裏付ける一次資料は未確認。',
    };
  }

  return {
    value,
    status: 'ESTIMATED',
    label: '月利推計',
    badge: 'EST',
    basis: 'RADARのモデル推計。実着金・会計実績を裏付ける一次資料はこのデータ契約では未確認。',
  };
}
