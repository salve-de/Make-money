import { describe, expect, it } from 'vitest';
import { MARKET_ANOMALIES } from '../../data/marketAnomaliesData';
import { selectTrendResults } from './trend-results';

describe('trend search, selection and summary', () => {
  it('clears detail and summary when no results match', () => {
    const result = selectTrendResults(MARKET_ANOMALIES, 'nonexistent-audit-query-8492', MARKET_ANOMALIES[0].id);
    expect(result.filteredAnomalies).toEqual([]);
    expect(result.activeAnomaly).toBeUndefined();
    expect(result.avgMargin).toBeNull();
    expect(result.hotCount).toBe(0);
    expect(result.latestUpdatedAt).toBeNull();
  });
  it('uses the matching record instead of a stale selection, and computes its metrics', () => {
    const target = MARKET_ANOMALIES[1];
    const result = selectTrendResults(MARKET_ANOMALIES, ` ${target.title} `, MARKET_ANOMALIES[0].id);
    expect(result.filteredAnomalies).toEqual([target]);
    expect(result.activeAnomaly).toEqual(target);
    expect(result.avgMargin).toBe(target.netMarginPercent.toFixed(1));
    expect(result.hotCount).toBe(Number(target.isHot));
    expect(result.latestUpdatedAt).toBe(target.updatedAt);
  });
  it('keeps a visible selection and restores all rows after clearing search', () => {
    const result = selectTrendResults(MARKET_ANOMALIES, ' ', MARKET_ANOMALIES[1].id);
    expect(result.filteredAnomalies).toHaveLength(MARKET_ANOMALIES.length);
    expect(result.activeAnomaly?.id).toBe(MARKET_ANOMALIES[1].id);
  });
});
