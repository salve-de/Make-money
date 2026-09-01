import test from 'node:test';
import assert from 'node:assert/strict';
import { demands, opportunities } from '../src/data.js';
import {
  escapeHTML,
  filterOpportunities,
  gapStrength,
  matchesQuery,
  opportunityScore,
  parseHash,
  portfolioStats,
  recommendForPreferences,
  searchAcross,
  sortOpportunities
} from '../src/core.js';

test('opportunity scores remain within the public 0-100 range', () => {
  for (const opportunity of opportunities) {
    const score = opportunityScore(opportunity);
    assert.ok(score >= 0 && score <= 100, `${opportunity.id}: ${score}`);
  }
});

test('query matching works across Japanese title, tags, and reasons', () => {
  const target = opportunities.find((item) => item.id === 'op-ai-reception-vertical');
  assert.equal(matchesQuery(target, '電話 予約'), true);
  assert.equal(matchesQuery(target, 'Shopify'), false);
});

test('filters and sorting do not mutate the source array', () => {
  const originalFirst = opportunities[0].id;
  const filtered = filterOpportunities(opportunities, { category: 'data-intelligence', soloOnly: true });
  const sorted = sortOpportunities(filtered, 'momentum');
  assert.ok(sorted.length > 0);
  assert.equal(opportunities[0].id, originalFirst);
  assert.ok(sorted.every((item) => item.category === 'data-intelligence'));
});

test('preference recommendation boosts matching categories', () => {
  const recommended = recommendForPreferences(opportunities, {
    categories: ['regulation'],
    solo: true,
    lowBudget: true,
    japan: true
  });
  assert.equal(recommended[0].category, 'regulation');
});

test('gap strength uses demand, pay intent, pain, and service scarcity', () => {
  const demand = demands[0];
  assert.ok(gapStrength(demand, 0) > gapStrength(demand, 5));
});

test('portfolio stats use only saved ids', () => {
  const ids = opportunities.slice(0, 3).map((item) => item.id);
  const stats = portfolioStats(ids, opportunities);
  assert.equal(stats.count, 3);
  assert.ok(stats.averageScore > 0);
});

test('global search ranks title matches', () => {
  const results = searchAcross('制度', { opportunities, services: [], signals: [], demands });
  assert.ok(results.length > 0);
  assert.equal(results[0].type, 'opportunity');
});

test('hash routes parse detail ids', () => {
  assert.deepEqual(parseHash('#/opportunity/op-test'), { page: 'opportunity', id: 'op-test' });
  assert.deepEqual(parseHash('#/demand/demand-user-%E4%BA%88%E7%B4%84%E6%9E%A0'), {
    page: 'demand',
    id: 'demand-user-予約枠'
  });
  assert.deepEqual(parseHash(''), { page: 'discover', id: null });
});

test('escapeHTML removes executable markup', () => {
  assert.equal(escapeHTML('<script>1</script>'), '&lt;script&gt;1&lt;/script&gt;');
});
