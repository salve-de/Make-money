import { expect, it } from 'vitest';
import { parseStrategyRequest, parseSynthesizedIdeas } from './strategy-schema';
it('validates request shape before using arrays or calling external AI', () => {
  expect(parseStrategyRequest({ action: 'SYNTHESIZE', selectedEntityIds: [], notes: {} }).action).toBe('SYNTHESIZE');
  expect(() => parseStrategyRequest({ action: 'CHAT', messages: 'bad' })).toThrow();
  expect(() => parseStrategyRequest({ action: 'UNKNOWN' })).toThrow();
});
it('rejects incomplete AI ideas before persistence or rendering', () => {
  expect(() => parseSynthesizedIdeas([{ title: 'missing nested data', projectedMonthlyProfitJpy: '10000' }])).toThrow();
  expect(parseSynthesizedIdeas([])).toEqual([]);
});
