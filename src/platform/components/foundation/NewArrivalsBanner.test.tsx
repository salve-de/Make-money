import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { FinancialEntity } from '@/shared/terminal';
import type { NewArrivalsRelease } from '@/lib/foundation/new-arrivals';
import { NewArrivalsBanner, newArrivalHighlights } from './NewArrivalsBanner';

const release: NewArrivalsRelease = {
  releaseId: 'r1', releaseAt: '2026-09-29T00:00:00.000Z', label: '2026.09.29 09:00 JST', count: 3,
  entityIds: ['ent_a', 'ent_b', 'ent_c'], contributionCount: 1,
};

function entity(id: string, pnl: Partial<FinancialEntity['pnl']>, tags: string[] = []): FinancialEntity {
  return { id, name: id.toUpperCase(), sector: 'SAAS', tags, pnl: { monthlyRevenue: 0, isRevenueUnconfirmed: true, financialStatus: 'REPORTED', ...pnl } } as unknown as FinancialEntity;
}

describe('new arrival highlights', () => {
  const entities = [
    entity('ent_a', { monthlyRevenue: 3_000_000, isRevenueUnconfirmed: false }),
    entity('ent_b', {}, ['撤退']),
    entity('ent_c', { monthlyRevenue: 9_000_000, isRevenueUnconfirmed: false }),
    entity('ent_old', { monthlyRevenue: 99_000_000, isRevenueUnconfirmed: false }),
  ];

  it('picks a failure first, then new cases with recorded revenue by amount', () => {
    const summary = newArrivalHighlights(release, entities);
    expect(summary.highlights.map((item) => item.id)).toEqual(['ent_b', 'ent_c', 'ent_a']);
    expect(summary.revenueCount).toBe(2);
    expect(summary.failureCount).toBe(1);
  });

  it('does not show counts until every new case is loaded', () => {
    const summary = newArrivalHighlights(release, entities.slice(0, 2));
    expect(summary.revenueCount).toBeNull();
    expect(summary.failureCount).toBeNull();
  });

  it('shows one compact link with the breakdown on hover, and nothing when there is no release', () => {
    const html = renderToStaticMarkup(createElement(NewArrivalsBanner, { release, entities, onOpen: vi.fn() }));
    expect(html).toContain('3件追加');
    expect(html).toContain('売上の記録あり 2件');
    expect(html).toContain('失敗・撤退 1件');
    expect(renderToStaticMarkup(createElement(NewArrivalsBanner, { release: null, onOpen: vi.fn() }))).toBe('');
  });
});
