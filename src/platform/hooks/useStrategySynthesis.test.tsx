import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { INSTITUTIONAL_ENTITIES } from '../data/mockLedgerData';
import { useStrategySynthesis } from './useStrategySynthesis';

vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ token: null }) }));

// 事業検討の材料は「保存した事例」と「利用者が開いた事例」だけ。選んでいない事例を代わりに入れない。
function probe(bookmarkedIds: string[], initialContextEntityId: string | null) {
  function Probe() {
    const synthesis = useStrategySynthesis({
      allEntities: INSTITUTIONAL_ENTITIES,
      bookmarkedIds: new Set(bookmarkedIds),
      notes: {},
      currency: 'JPY',
      initialContextEntityId,
    });
    return createElement('pre', null, JSON.stringify({
      saved: synthesis.savedEntities.map((entity) => entity.id),
      active: synthesis.activeEntity?.id ?? null,
      selected: [...synthesis.selectedEntityIds],
    }));
  }
  const html = renderToStaticMarkup(createElement(Probe));
  return JSON.parse(html.replace(/^<pre>|<\/pre>$/g, '').replaceAll('&quot;', '"')) as { saved: string[]; active: string | null; selected: string[] };
}

it('starts empty for a visitor who has neither saved nor opened a case', () => {
  expect(probe([], null)).toEqual({ saved: [], active: null, selected: [] });
});

it('uses the opened case as the only material when nothing is saved', () => {
  const opened = INSTITUTIONAL_ENTITIES[1].id;
  expect(probe([], opened)).toEqual({ saved: [opened], active: opened, selected: [opened] });
});

it('keeps saved cases and the opened case, and never adds others', () => {
  const [saved, opened] = [INSTITUTIONAL_ENTITIES[2].id, INSTITUTIONAL_ENTITIES[3].id];
  const result = probe([saved], opened);
  expect(new Set(result.saved)).toEqual(new Set([saved, opened]));
  expect(result.active).toBe(opened);
  expect(result.saved).not.toContain(INSTITUTIONAL_ENTITIES[0].id);
});
