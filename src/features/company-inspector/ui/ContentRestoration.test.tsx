import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { INSTITUTIONAL_ENTITIES } from '@/platform/data/mockLedgerData';
import { SourcesSection } from './SourcesSection';
import { ExecutiveIntuitiveSummary } from './ExecutiveIntuitiveSummary';

describe('case content remains accessible in compact layouts', () => {
  it('renders the business headline, lead and substantive analysis alongside metrics', () => {
    const entity = structuredClone(INSTITUTIONAL_ENTITIES[0]);
    entity.tagline = '事業固有の短い要約';
    entity.strategy.secretInsight = '固有の収益構造の説明';
    entity.strategy.blindspot = '具体的な競争上の着眼点';
    const html = renderToStaticMarkup(<ExecutiveIntuitiveSummary entity={entity} isHazardMode={false} formatMoney={String} />);
    expect(html).toContain(entity.tagline);
    expect(html).toContain(entity.strategy.secretInsight);
    expect(html).toContain(entity.strategy.blindspot);
  });

  it('preserves source titles without requiring a URL', () => {
    const entity = structuredClone(INSTITUTIONAL_ENTITIES[0]);
    entity.url = '';
    entity.evidenceCards = [{ id: 'source', type: 'SMOKING_GUN', title: '資料', evidenceStatus: 'REPORTED', punchline: '記録', sourceNote: '2025年 決算説明資料 12ページ' }];
    expect(renderToStaticMarkup(<SourcesSection entity={entity} isHazardMode={false} />)).toContain('2025年 決算説明資料 12ページ');
  });
});
