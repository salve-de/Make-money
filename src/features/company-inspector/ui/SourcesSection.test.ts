import { describe, expect, it } from 'vitest';
import { auditedSources, mergeAuditedSources, readableSourceNote, secFilingLabels } from './SourcesSection';

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
      articleEstimate: false,
      unreachable: false,
    });
  });

  it('treats missing tiers as unregistered and drops non-http urls', () => {
    const sources = auditedSources({ sources: [{ url: 'https://foo.com', claimStatus: 'UNREACHABLE' }, { url: 'javascript:alert(1)' }, null] });
    expect(sources).toHaveLength(1);
    expect(sources[0]).toMatchObject({ tierLabel: null, unreachable: true, selfReported: false, publisher: null });
  });

  it('returns nothing when the record has no re-audit block', () => {
    expect(auditedSources(undefined)).toEqual([]);
  });

  it('labels article estimates separately from self-reported figures', () => {
    const [source] = auditedSources({ sources: [{ url: 'https://ebizfacts.com/x', claimStatus: 'REPORTED_ESTIMATE_BY_ARTICLE' }] });
    expect(source.articleEstimate).toBe(true);
    expect(source.selfReported).toBe(false);
  });
});

describe('reader-facing source lines', () => {
  it('merges repeated pages of the same publisher and site into one row', () => {
    const sources = auditedSources({ sources: ['/', '/about', '/pricing'].map((path) => ({ url: `https://www.skool.com${path}`, publisher: 'skool.com（公式）', checkedAt: '2026-09-29' })) });
    expect(mergeAuditedSources(sources)).toHaveLength(1);
  });
  it('writes SEC filings as form, fiscal year and filing date instead of CIK and accession', () => {
    expect(secFilingLabels({ sources: [{ url: 'https://www.sec.gov/x', form: '10-K', accessionNumber: '0001813756-23-000016', cik: '0001813756', periodCovered: 'FY2022 2022-01-01〜2022-12-31', publicationDate: '2023-03-29' }] }))
      .toEqual(['SEC 10-K（FY2022、提出 2023-03-29）']);
    expect(readableSourceNote('SEC EDGAR CIK 0001813756 / 10-K accession 0001813756-23-000016', new Set())).toBe('');
  });
  it('drops English internal memos, bare URLs and covered publisher names', () => {
    expect(readableSourceNote('official website https://readonlyrest.com/', new Set())).toBe('');
    expect(readableSourceNote('https://www.sec.gov/Archives/x', new Set())).toBe('');
    expect(readableSourceNote('U.S. SEC / https://www.sec.gov/x / 2026-09-30確認', new Set(['U.S. SEC']))).toBe('');
    expect(readableSourceNote('有価証券報告書 12ページ', new Set())).toBe('有価証券報告書 12ページ');
  });
});
