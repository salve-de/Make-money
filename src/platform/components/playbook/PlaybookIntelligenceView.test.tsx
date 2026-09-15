import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { aggregateMacroIntelligence, TOOL_CATEGORIES, type MacroIntelligenceData } from '@/lib/intelligence/macro-aggregator';
import { PlaybookIntelligenceView } from './PlaybookIntelligenceView';

describe('playbook data and rendering contract', () => {
  it('provides all six category records after the server/client JSON boundary', () => {
    const data: MacroIntelligenceData = JSON.parse(JSON.stringify(aggregateMacroIntelligence([])));
    for (const { key } of TOOL_CATEGORIES) {
      expect(data.toolCategoryRadars[key]?.category).toBe(key);
      expect(data.toolCategoryRadars[key]?.tools.length).toBeGreaterThan(0);
      for (const tool of data.toolCategoryRadars[key].tools) {
        expect(tool.historyShares).toHaveLength(data.toolCategoryRadars[key].timeline.length);
      }
    }
  });
  it('renders the default tool radar rather than an error boundary', () => {
    const data = aggregateMacroIntelligence([]);
    const html = renderToStaticMarkup(<PlaybookIntelligenceView data={data} />);
    expect(html).toContain('ツール構成と乗り換えの参考例');
    expect(html).toContain('Cloudflare');
  });
});
