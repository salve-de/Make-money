import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getCloudflareRuntimeEnv } from '@/lib/runtime/cloudflare';
import { decodeCatalogArtifact, parseCatalogSummaryRows, parseDiscoveryRelease, usesCatalogRelease } from './catalog-release';

vi.mock('@/lib/runtime/cloudflare', () => ({ getCloudflareRuntimeEnv: vi.fn() }));
afterEach(() => { vi.unstubAllEnvs(); vi.resetAllMocks(); });

describe('immutable catalog release', () => {
  it('keeps next dev on local JSON even when the emulator has production vars', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.mocked(getCloudflareRuntimeEnv).mockResolvedValue({ ENVIRONMENT: 'production' });
    expect(await usesCatalogRelease()).toBe(false);
    expect(getCloudflareRuntimeEnv).not.toHaveBeenCalled();
  });
  it('uses R2 in the production Worker and local JSON in standalone Node', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.mocked(getCloudflareRuntimeEnv).mockResolvedValue({ ENVIRONMENT: 'production' });
    expect(await usesCatalogRelease()).toBe(true);
    vi.mocked(getCloudflareRuntimeEnv).mockResolvedValue(null);
    expect(await usesCatalogRelease()).toBe(false);
  });
  it('reads only the exact accepted bytes', () => {
    const text = JSON.stringify({ name: 'テスト', value: 123 });
    const hash = createHash('sha256').update(text).digest('hex');
    expect(decodeCatalogArtifact(gzipSync(text), hash)).toEqual({ name: 'テスト', value: 123 });
    expect(() => decodeCatalogArtifact(gzipSync(text.replace('123', '456')), hash)).toThrow('hash mismatch');
  });
  it('rejects corrupt compressed content', () => {
    expect(() => decodeCatalogArtifact(new Uint8Array([1, 2, 3]), 'a'.repeat(64))).toThrow();
  });
  it('keeps the discovery release boundary cheap but fail-closed', () => {
    const item = {
      id: 'case-1', name: 'Case', tagline: '', sector: 'AI', resultLabel: 'MRR', resultValue: '¥1万',
      resultAmountJpy: 10000, startLine: '1人開始', criticalInsight: 'Move', whyMoneyMoved: 'Pain',
      leverage: 'Code', mechanism: { id: 'asset', label: 'Asset' }, mechanismCount: 1,
      currentLabel: 'Current', currentDetail: 'Detail', isCurrent: true, isFailure: false,
      isSolo: true, lowCapital: true, lowWork: false, evidenceCount: 1,
      descriptors: [], related: [], scores: {
        SURPRISE: 1, BIG_CASH: 2, LOW_CAPITAL: 3, SOLO: 4, LOW_WORK: 5, CURRENT: 6, FAILURE: 7,
      },
    };
    const dataset = { sourceCount: 1, visibleCount: 1, cases: [item], mechanisms: [{ id: 'asset', label: 'Asset', count: 1 }], highlights: [item] };
    expect(parseDiscoveryRelease(dataset)).toBe(dataset);
    expect(() => parseDiscoveryRelease({ ...dataset, visibleCount: 2 })).toThrow('Invalid discovery release');
    expect(() => parseDiscoveryRelease({ ...dataset, cases: [{ ...item, id: null }] })).toThrow('Invalid discovery release');
    expect(() => parseDiscoveryRelease({ ...dataset, cases: [{ ...item, descriptors: null }] })).toThrow('Invalid discovery release');
    expect(() => parseDiscoveryRelease({ ...dataset, cases: [{ ...item, descriptors: [{ label: '体制', value: null }] }] })).toThrow('Invalid discovery release');
    expect(() => parseDiscoveryRelease({ ...dataset, cases: [{ ...item, related: [{ id: 'related', name: null, resultValue: '¥1万' }] }] })).toThrow('Invalid discovery release');
    expect(() => parseDiscoveryRelease({ ...dataset, cases: [{ ...item, scores: { ...item.scores, FAILURE: undefined } }] })).toThrow('Invalid discovery release');
    expect(() => parseDiscoveryRelease({ ...dataset, cases: [{ ...item, scores: {
      SURPRISE: 1, BIG_CASH: 2, LOW_CAPITAL: 3, SOLO: 4, LOW_WORK: 5, CURRENT: 6, FAILURE: Number.NaN,
    } }] })).toThrow('Invalid discovery release');
  });

  it('keeps the production summary boundary cheap but fail-closed', () => {
    const row = {
      id: 'ent_example',
      name: 'Example',
      ticker: 'EXAMPLE',
      tagline: 'Example summary',
      sector: 'AI_AUTOMATION',
      scale: 'SOLO',
      founder: 'Example Founder',
      pnl: { operatingMargin: 20 },
      operations: { initialCapitalRequired: 0 },
      strategy: { blindspot: 'Example blindspot', moatType: 'UNKNOWN' },
      tags: [],
    };
    expect(parseCatalogSummaryRows([row], 1)).toEqual([row]);
    expect(() => parseCatalogSummaryRows([{ ...row, id: 'ent_example' }, row], 2)).toThrow('Duplicate');
    expect(() => parseCatalogSummaryRows([{ ...row, operations: {} }], 1)).toThrow('row');
    expect(() => parseCatalogSummaryRows([{ ...row, tags: [1] }], 1)).toThrow('row');
  });
});
