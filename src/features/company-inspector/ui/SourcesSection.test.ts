import { describe, expect, it } from 'vitest';
import { auditedSources } from './SourcesSection';

describe('auditedSources', () => {
  it('reads publisher, dates, display tier and self-report flag from re-audit sources', () => {
    const [source] = auditedSources({
      sources: [{
        url: 'https://www.indiehackers.com/product/foo',
        publisher: 'Indie Hackers',
        publicationDate: '2021-04-01',
        checkedAt: '2026-09-29',
        claimStatus: 'FOUNDER_SELF_REPORT_RECORDED',
        displayTier: 'facts_only',
      }],
    });
    expect(source).toEqual({
      url: 'https://www.indiehackers.com/product/foo',
      publisher: 'Indie Hackers',
      publicationDate: '2021-04-01',
      checkedAt: '2026-09-29',
      tierLabel: '事実のみ・出典表示必須',
      selfReported: true,
      unreachable: false,
    });
  });

  it('treats missing tiers as unregistered and drops non-http urls', () => {
    const sources = auditedSources({ sources: [{ url: 'https://foo.com', claimStatus: 'UNREACHABLE' }, { url: 'javascript:alert(1)' }, null] });
    expect(sources).toHaveLength(1);
    expect(sources[0]).toMatchObject({ tierLabel: '権利未登録・事実のみ', unreachable: true, selfReported: false, publisher: null });
  });

  it('returns nothing when the record has no re-audit block', () => {
    expect(auditedSources(undefined)).toEqual([]);
  });
});
