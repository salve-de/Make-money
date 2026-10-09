import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseFlows, checkFlows } from './lib';
import type { CasePage } from '../../src/shared/case-page';

const base: CasePage = {
  listLine: 'x', overview: '年22ドル（約3,300円）で使える。', secrets: [{ head: 'a', body: '' }], did: ['d'], setbacks: [], pricing: ['p'],
  timeline: [{ when: '2020年', what: 't' }], sources: [{ no: 1, label: 'l', url: 'https://example.com/' }], notes: [],
};

test('お金の流れの行を読む', () => {
  assert.deepEqual(parseFlows(['- 利用者 → Pinboard：年22ドル（約3,300円）']), [{ from: '利用者', to: 'Pinboard', label: '年22ドル（約3,300円）' }]);
});
test('本文にある金額は通る', () => {
  assert.equal(checkFlows({ ...base, flows: parseFlows(['- 利用者 → Pinboard：年22ドル（約3,300円）']) }).length, 0);
});
test('本文に無い金額と、形の違う行は落とす', () => {
  const v = checkFlows({ ...base, flows: parseFlows(['- 利用者 → Pinboard：年99ドル', '- 矢印の無い行']) });
  assert.deepEqual(v.map((x) => x.rule).sort(), ['flow-amount', 'flow-format']);
});

test('お金の流れの章にも、作る側の断り（本文に無い）をかける', async () => {
  const { checkMakerMemo } = await import('./lib');
  const md = '## お金の流れ\n- 会員 → 会社：手数料の率は本文に無い\n';
  assert.ok(checkMakerMemo(md).some((x) => x.rule === 'maker-memo' && x.where === 'お金の流れ'));
});
