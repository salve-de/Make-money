import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { INSTITUTIONAL_ENTITIES } from '@/platform/data/mockLedgerData';
import { EvidenceStream } from './EvidenceStream';
import { EvidenceDeckSection } from './EvidenceDeckSection';
import { SourcesSection } from './SourcesSection';
import { mergeInspectorObservations, observationSourceHeading } from './UniversalIntelligenceStream';

const base = () => structuredClone(INSTITUTIONAL_ENTITIES[0]);
describe('all public case records remain reachable', () => {
  it('combines both observation fields without inventing verification for text', () => {
    const entity = base();
    entity.observationsStream = [{ text: '構造化記録', sourceUrl: 'https://example.com/report', observedAt: '2025-01-01' }];
    entity.observations = ['補足の固有内容', '構造化記録', '補足の固有内容'];
    const records = mergeInspectorObservations(entity);
    expect(records).toHaveLength(2);
    expect(records[1].originType).toBeUndefined();
    expect(records[1].verificationStatus).toBeUndefined();
    const html = renderToStaticMarkup(<EvidenceStream entity={entity} currency="JPY" isHazardMode={false} />);
    expect(html).toContain('構造化記録');
    expect(html).toContain('補足の固有内容');
    expect(html).toContain('https://example.com/report');
    expect(html).not.toContain('確定観測');
    expect(html).not.toContain('検証完了');
  });
  it('accepts historical text objects without copying private payloads', () => {
    const rows = mergeInspectorObservations({ observations: [{ text: '旧形式の本文', sourceUrl: 'https://example.com/public', payload: { private: 'SECRET' }, rawMetadata: 'SECRET' }] });
    expect(rows[0].text).toBe('旧形式の本文');
    expect(rows[0].sourceUrl).toBe('https://example.com/public');
    expect(JSON.stringify(rows)).not.toContain('SECRET');
    expect(rows[0].verificationStatus).toBeUndefined();
  });
  it('does not render credential-bearing source URLs', () => {
    const entity = base(); entity.url = 'https://user:SECRET@example.com'; entity.evidenceCards = [];
    entity.pnl.sourceDoc = 'https://user:SECRET@example.com/report';
    entity.observationsStream = [{ text: '記録', sourceUrl: 'https://user:SECRET@example.com/source' }];
    const html = renderToStaticMarkup(<SourcesSection entity={entity} isHazardMode={false} />);
    expect(html).not.toContain('SECRET');
    expect(html).not.toContain('user:');
  });
  it('renders exposure, moats, temporal, coverage attempts and one timeline', () => {
    const entity = base();
    entity.exposureAudit = { guerrillaTraction: '初期獲得記録', platformGlitch: '活用記録', pivotSnapshot: '転換記録', hiddenStackCost: '費用記録' };
    entity.dynamicMoats = { parasiteHost: { hostName: '基盤名', detail: '活用の詳細' } };
    entity.temporal = { foundedYear: 2020, initialTractionPeriod: '初動期', dataSnapshotPeriod: '観測期', viabilityStatus: 'UNKNOWN', viabilityLabel: '評価', eraContext: '時代背景', currentViabilityAnalysis: '現在の分析' };
    entity.timelineEvents = [{ eventType: '創業', occurredAt: '2020', description: '一度だけの出来事' }, { eventType: '創業', occurredAt: '2020', description: '一度だけの出来事' }];
    entity.coverageAudit = [{ dimension: '調査項目', status: 'attempted_unavailable', note: '長い調査メモ', attempts: ['探索先の記録'] }];
    const html = renderToStaticMarkup(<EvidenceStream entity={entity} currency="JPY" isHazardMode={false} />);
    for (const value of ['初期獲得記録', '活用記録', '転換記録', '費用記録', '活用の詳細', '時代背景', '現在の分析']) expect(html).toContain(value);
    expect(html).not.toContain('探索先の記録');
    expect(html.split('一度だけの出来事')).toHaveLength(2);
    expect(html).not.toContain('<details');
  });
  it('keeps records with and without URL at the same visible level', () => {
    const entity = base();
    entity.evidenceCards = [
      { id: 'a', type: 'SMOKING_GUN', title: 'URLあり記録', punchline: '本文A', sourceNote: 'https://example.com', evidenceStatus: 'REPORTED' },
      { id: 'b', type: 'SMOKING_GUN', title: '資料名のみ記録', punchline: '本文B', sourceNote: '紙の資料', evidenceStatus: 'REPORTED' },
    ];
    const html = renderToStaticMarkup(<EvidenceDeckSection entity={entity} isHazardMode={false} hasEvidenceCards />);
    expect(html).toContain('URLあり記録'); expect(html).toContain('資料名のみ記録');
    expect(html).not.toContain('補足記録 (');
  });
  it('keeps source documents, period and public observation URLs without exposing raw metadata', () => {
    const entity = base(); entity.url = ''; entity.evidenceCards = [];
    entity.pnl.sourceDoc = '有価証券報告書 12ページ'; entity.pnl.dataSnapshotPeriod = '2025年度';
    entity.observationsStream = [{ text: '公開記録', sourceUrl: 'https://example.com/source', publicDisplay: { title: '公開表示', subject: '対象', facts: [], sourceLabel: '公表資料', sourceUrls: ['https://example.com/second'] } }];
    Object.assign(entity.observationsStream[0], { payload: { secret: 'DO_NOT_RENDER' } });
    const html = renderToStaticMarkup(<SourcesSection entity={entity} isHazardMode={false} />);
    expect(html).toContain('有価証券報告書 12ページ'); expect(html).toContain('2025年度');
    expect(html).toContain('https://example.com/source'); expect(html).toContain('https://example.com/second');
    expect(html).not.toContain('DO_NOT_RENDER'); expect(html).not.toContain('<details');
  });
  it('lists re-audit sources with publisher, dates, display tier and self-report label, without duplicate plain links', () => {
    const entity = base(); entity.url = 'https://foo.com'; entity.evidenceCards = [];
    entity.reaudit = { sources: [
      { url: 'https://foo.com', publisher: 'Foo 公式サイト', checkedAt: '2026-09-29', displayTier: 'automatic', claimStatus: 'PRICING_CONFIRMED' },
      { url: 'https://www.indiehackers.com/product/foo', publisher: 'Indie Hackers', publicationDate: '2021-04-01', checkedAt: '2026-09-29', displayTier: 'facts_only', claimStatus: 'FOUNDER_SELF_REPORT_RECORDED', rawStoredPrivately: true },
    ] };
    const html = renderToStaticMarkup(<SourcesSection entity={entity} isHazardMode={false} />);
    expect(html).toContain('data-testid="audited-sources"');
    expect(html).toContain('Indie Hackers'); expect(html).toContain('掲載 2021-04-01'); expect(html).toContain('確認 2026-09-29');
    expect(html).not.toContain('事実のみ・出典表示必須'); expect(html).not.toContain('出典表示で掲載可'); expect(html).toContain('本人申告（独立確認なし）');
    expect(html).not.toContain('>公式サイト<'); expect(html).not.toContain('rawStoredPrivately');
  });
});

describe('investigation notes headings and duplicates', () => {
  const entity = () => { const e = structuredClone(INSTITUTIONAL_ENTITIES[0]); e.url = 'https://www.example.com'; return e; };
  it('headings come from where the fact came from, not the ingest category', () => {
    expect(observationSourceHeading('https://example.com/pricing', 'https://www.example.com')).toBe('公式サイト');
    expect(observationSourceHeading('https://www.indiehackers.com/product/x', 'https://example.com')).toBe('Indie Hackers');
    expect(observationSourceHeading('https://www.other.org/a', 'https://example.com')).toBe('other.org');
    expect(observationSourceHeading(undefined, 'https://example.com')).toBeNull();
  });
  it('does not repeat structured notes as supplements, and drops empty or duplicate bodies', () => {
    const e = entity();
    e.observationsStream = [{ text: '料金は月$19。対象は個人の創業者', category: 'FOUNDER_HACK', sourceUrl: 'https://example.com/pricing' }, { text: '' , sourceUrl: 'https://example.com' }, { text: '同じ本文。' }, { text: '同じ本文' }];
    e.observations = ['公式サイト: 料金は月$19', 'Indie Hackers 掲載ページ: 別の事実です'];
    const html = renderToStaticMarkup(<EvidenceStream entity={e} currency="JPY" isHazardMode={false} />);
    expect(html).not.toContain('補足記録');
    expect(html).not.toContain('創業期の泥臭い工夫');
    expect(html).toContain('公式サイト');
    expect(html).toContain('Indie Hackers 掲載ページ');
    expect(html).toContain('別の事実です');
    expect(html.split('同じ本文').length).toBe(2);
    expect(html).toContain('3件');
  });
});
