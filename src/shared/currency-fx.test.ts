import { describe, it, expect } from 'vitest';
import {
  normalizeCurrencyCode,
  extractYearFromContext,
  getHistoricalFxRate,
  convertForeignToJpy
} from './currency-fx';

describe('100年耐久 為替レートエンジン (currency-fx)', () => {
  it('通貨コードを安全に正規化できる', () => {
    expect(normalizeCurrencyCode('$')).toBe('USD');
    expect(normalizeCurrencyCode('USD')).toBe('USD');
    expect(normalizeCurrencyCode('¥')).toBe('JPY');
    expect(normalizeCurrencyCode('円')).toBe('JPY');
    expect(normalizeCurrencyCode('€')).toBe('EUR');
    expect(normalizeCurrencyCode('£')).toBe('GBP');
    expect(normalizeCurrencyCode('invalid')).toBe(null);
  });

  it('コンテキスト文字列から年次を正確に抽出できる', () => {
    expect(extractYearFromContext('2024年 ARR $2.5M')).toBe(2024);
    expect(extractYearFromContext('2023-11 破産申請')).toBe(2023);
    expect(extractYearFromContext('創業2015年')).toBe(2015);
    expect(extractYearFromContext('年代指定なし')).toBe(null);
  });

  it('ヒストリカル為替レートを正確に引ける', () => {
    // 2024年のUSD
    const rate2024 = getHistoricalFxRate('USD', '2024年');
    expect(rate2024.currency).toBe('USD');
    expect(rate2024.baseYear).toBe(2024);
    expect(rate2024.rate).toBe(151.8);
    expect(rate2024.isHistorical).toBe(true);

    // 2020年のUSD
    const rate2020 = getHistoricalFxRate('USD', '2020年');
    expect(rate2020.rate).toBe(106.8);

    // 2023年のEUR
    const rateEur2023 = getHistoricalFxRate('EUR', '2023年');
    expect(rateEur2023.rate).toBe(152.0);

    // JPYは常に1.0
    const rateJpy = getHistoricalFxRate('JPY');
    expect(rateJpy.rate).toBe(1.0);
  });

  it('外貨から円換算が正確に行われる', () => {
    // 2024年の $10,000
    const res = convertForeignToJpy(10000, 'USD', '2024年');
    expect(res.monthlyJpy).toBe(1518000); // 10,000 * 151.8
    expect(res.fxResult.formula).toContain('2024年平均実勢レート');
  });

  it('100年先（未来の年）でもフォールバックしてクラッシュしない', () => {
    const futureRes = getHistoricalFxRate('USD', '2099年');
    expect(futureRes.rate).toBeGreaterThan(0);
    expect(futureRes.currency).toBe('USD');
  });
});
