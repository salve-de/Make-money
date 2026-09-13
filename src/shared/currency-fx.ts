// 100年耐久 為替レートエンジン (Centennial FX Engine)
// 過去の事実データ（過年度）は当時の実勢レートで永久固定し、多通貨（USD, EUR, GBP等）を自動換算。

export type SupportedCurrency = 'JPY' | 'USD' | 'EUR' | 'GBP' | 'AUD' | 'CAD' | 'SGD' | 'CNY' | 'KRW';

export interface FxRateResult {
  rate: number;
  currency: SupportedCurrency;
  baseYear: number;
  isHistorical: boolean;
  formula: string;
}

// 日本銀行・IMF統計に基づく年次平均実勢為替レート（対円: JPY）
// 過去のファクトは固定（イミュータブル）、過年度の財務実態を正確に再現する
const HISTORICAL_FX_RATES: Record<number, Partial<Record<SupportedCurrency, number>>> = {
  2026: { USD: 155.0, EUR: 168.0, GBP: 198.0, AUD: 102.0, CAD: 114.0, SGD: 118.0, CNY: 21.5, KRW: 0.115 },
  2025: { USD: 153.5, EUR: 165.0, GBP: 194.0, AUD: 100.0, CAD: 112.0, SGD: 116.0, CNY: 21.2, KRW: 0.112 },
  2024: { USD: 151.8, EUR: 164.2, GBP: 193.5, AUD: 99.5, CAD: 111.2, SGD: 115.0, CNY: 21.0, KRW: 0.111 },
  2023: { USD: 140.5, EUR: 152.0, GBP: 175.0, AUD: 93.3, CAD: 104.2, SGD: 104.7, CNY: 19.9, KRW: 0.108 },
  2022: { USD: 131.5, EUR: 138.0, GBP: 162.0, AUD: 91.2, CAD: 101.0, SGD: 95.3,  CNY: 19.5, KRW: 0.102 },
  2021: { USD: 109.8, EUR: 129.8, GBP: 151.0, AUD: 82.5, CAD: 87.5,  SGD: 81.8,  CNY: 17.0, KRW: 0.096 },
  2020: { USD: 106.8, EUR: 121.8, GBP: 137.0, AUD: 73.6, CAD: 79.6,  SGD: 77.4,  CNY: 15.5, KRW: 0.090 },
  2019: { USD: 109.0, EUR: 122.0, GBP: 139.2, AUD: 75.8, CAD: 82.2,  SGD: 80.0,  CNY: 15.8, KRW: 0.093 },
  2018: { USD: 110.4, EUR: 130.4, GBP: 147.3, AUD: 82.5, CAD: 85.2,  SGD: 81.9,  CNY: 16.7, KRW: 0.100 },
  2017: { USD: 112.1, EUR: 126.7, GBP: 144.1, AUD: 86.0, CAD: 86.4,  SGD: 81.2,  CNY: 16.6, KRW: 0.099 },
  2016: { USD: 108.8, EUR: 120.3, GBP: 147.4, AUD: 81.0, CAD: 82.2,  SGD: 78.7,  CNY: 16.4, KRW: 0.094 },
  2015: { USD: 121.0, EUR: 134.3, GBP: 185.0, AUD: 90.9, CAD: 94.7,  SGD: 88.0,  CNY: 19.3, KRW: 0.107 },
  2014: { USD: 105.8, EUR: 140.4, GBP: 174.4, AUD: 95.3, CAD: 95.8,  SGD: 83.5,  CNY: 17.2, KRW: 0.101 },
  2013: { USD: 97.6,  EUR: 129.7, GBP: 152.6, AUD: 94.3, CAD: 94.8,  SGD: 78.0,  CNY: 15.9, KRW: 0.089 },
  2012: { USD: 79.8,  EUR: 102.5, GBP: 126.5, AUD: 82.6, CAD: 79.9,  SGD: 63.9,  CNY: 12.6, KRW: 0.071 },
  2011: { USD: 79.8,  EUR: 111.0, GBP: 127.8, AUD: 82.4, CAD: 80.7,  SGD: 63.4,  CNY: 12.3, KRW: 0.072 },
  2010: { USD: 87.8,  EUR: 116.2, GBP: 135.8, AUD: 80.7, CAD: 85.3,  SGD: 64.4,  CNY: 13.0, KRW: 0.076 },
  2005: { USD: 110.2, EUR: 136.9, GBP: 200.5, AUD: 84.1, CAD: 90.9,  SGD: 66.2,  CNY: 13.4, KRW: 0.108 },
  2000: { USD: 107.8, EUR: 99.5,  GBP: 163.4, AUD: 62.7, CAD: 72.6,  SGD: 62.5,  CNY: 13.0, KRW: 0.095 }
};

// 基準アンカーレート（年代不明または未来のデフォルト）
const DEFAULT_ANCHOR_RATES: Record<SupportedCurrency, number> = {
  JPY: 1.0,
  USD: 155.0,
  EUR: 168.0,
  GBP: 198.0,
  AUD: 102.0,
  CAD: 114.0,
  SGD: 118.0,
  CNY: 21.5,
  KRW: 0.115
};

export function normalizeCurrencyCode(raw?: string | null): SupportedCurrency | null {
  if (!raw) return null;
  const s = raw.trim().toUpperCase();
  if (['JPY', '円', '¥'].includes(s) || /円|¥/i.test(s)) return 'JPY';
  if (['USD', '$', 'US$'].includes(s) || /\$|USD/i.test(s)) return 'USD';
  if (['EUR', '€'].includes(s) || /€|EUR/i.test(s)) return 'EUR';
  if (['GBP', '£'].includes(s) || /£|GBP/i.test(s)) return 'GBP';
  if (['AUD', 'A$'].includes(s)) return 'AUD';
  if (['CAD', 'C$'].includes(s)) return 'CAD';
  if (['SGD', 'S$'].includes(s)) return 'SGD';
  if (['CNY', 'RMB', '元'].includes(s)) return 'CNY';
  if (['KRW', '₩', 'ウォン'].includes(s)) return 'KRW';
  return null;
}

export function extractYearFromContext(text?: string | null): number | null {
  if (!text) return null;
  const match = text.match(/\b(19\d{2}|20\d{2})\b/);
  if (match) {
    const year = parseInt(match[1], 10);
    if (year >= 1990 && year <= 2100) return year;
  }
  return null;
}

/**
 * 100年耐久 為替レート取得
 * @param currency 通貨コード（USD, EUR等）
 * @param periodContext 観測時期（例: '2024年 ARR', '2023-11'）または年
 */
export function getHistoricalFxRate(
  currency: string,
  periodContext?: string | number | null
): FxRateResult {
  const normCur = normalizeCurrencyCode(currency) || 'USD';
  if (normCur === 'JPY') {
    return {
      rate: 1.0,
      currency: 'JPY',
      baseYear: new Date().getFullYear(),
      isHistorical: false,
      formula: '1 JPY = ¥1.0'
    };
  }

  const targetYear = typeof periodContext === 'number'
    ? periodContext
    : extractYearFromContext(periodContext) || 2024;

  // 1. 完全一致年を探索
  if (HISTORICAL_FX_RATES[targetYear]?.[normCur]) {
    const rate = HISTORICAL_FX_RATES[targetYear]![normCur]!;
    return {
      rate,
      currency: normCur,
      baseYear: targetYear,
      isHistorical: true,
      formula: `1 ${normCur} = ¥${rate.toFixed(1)} (${targetYear}年平均実勢レート)`
    };
  }

  // 2. 最も近い過去の年次を探索
  const years = Object.keys(HISTORICAL_FX_RATES)
    .map(Number)
    .sort((a, b) => Math.abs(a - targetYear) - Math.abs(b - targetYear));

  for (const y of years) {
    if (HISTORICAL_FX_RATES[y]?.[normCur]) {
      const rate = HISTORICAL_FX_RATES[y]![normCur]!;
      return {
        rate,
        currency: normCur,
        baseYear: y,
        isHistorical: true,
        formula: `1 ${normCur} = ¥${rate.toFixed(1)} (${y}年基準実勢レート)`
      };
    }
  }

  // 3. デフォルトアンカー
  const defaultRate = DEFAULT_ANCHOR_RATES[normCur] || 155.0;
  return {
    rate: defaultRate,
    currency: normCur,
    baseYear: 2026,
    isHistorical: false,
    formula: `1 ${normCur} = ¥${defaultRate.toFixed(1)} (最新基準アンカー)`
  };
}

/**
 * 外貨から日本円（月商）への自動調停
 */
export function convertForeignToJpy(
  amount: number,
  currency: string,
  periodContext?: string | null
): { monthlyJpy: number; fxResult: FxRateResult } {
  const fxResult = getHistoricalFxRate(currency, periodContext);
  const monthlyJpy = Math.round(amount * fxResult.rate);
  return {
    monthlyJpy,
    fxResult
  };
}
