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
it('bounds untrusted strategy payloads and closes object shapes', () => {
  expect(() => parseStrategyRequest({ action: 'CHAT', messages: [{ role: 'user', content: 'ok', extra: true }] })).toThrow();
  expect(() => parseStrategyRequest({ action: 'CHAT', messages: Array.from({ length: 51 }, () => ({ role: 'user', content: 'ok' })) })).toThrow();
  expect(() => parseStrategyRequest({ action: 'CHAT', messages: [{ role: 'user', content: 'x'.repeat(8001) }] })).toThrow();
});
