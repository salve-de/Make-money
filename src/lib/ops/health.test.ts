import { describe, expect, it, vi } from 'vitest';
import { runHealthChecks, sanitizeVersion } from './health';

const base = { expectedCatalogCount: 20, version: '1.2.3', releaseHash: 'ab'.repeat(32), now: () => new Date('2026-10-06T00:00:00Z') };

describe('runHealthChecks', () => {
  it('両方通れば ok', async () => {
    const report = await runHealthChecks({ ...base, pingDatabase: async () => [{ ok: 1 }], readCatalogCount: async () => 20 });
    expect(report).toEqual({ status: 'ok', version: '1.2.3', release: 'abababababab', time: '2026-10-06T00:00:00.000Z', checks: { database: 'ok', catalog: 'ok' } });
  });

  it('D1 が失敗したら down。エラー文は応答に出さない', async () => {
    const report = await runHealthChecks({
      ...base,
      pingDatabase: async () => { throw new Error('secret-token abc at db 07affd4c'); },
      readCatalogCount: async () => 20,
    });
    expect(report.status).toBe('down');
    expect(report.checks).toEqual({ database: 'ng', catalog: 'ok' });
    expect(JSON.stringify(report)).not.toMatch(/secret|07affd4c/);
  });

  it('カタログの件数が公開版の記録と違えば ng', async () => {
    const report = await runHealthChecks({ ...base, pingDatabase: async () => [], readCatalogCount: async () => 19 });
    expect(report.checks.catalog).toBe('ng');
    expect(report.status).toBe('down');
  });

  it('カタログが読めなければ ng', async () => {
    const report = await runHealthChecks({ ...base, pingDatabase: async () => [], readCatalogCount: async () => { throw new Error('boom'); } });
    expect(report.checks.catalog).toBe('ng');
  });

  it('応答が上限を超えたら ng で打ち切る', async () => {
    vi.useFakeTimers();
    try {
      const pending = runHealthChecks({ ...base, timeoutMs: 50, pingDatabase: () => new Promise(() => {}), readCatalogCount: async () => 20 });
      await vi.advanceTimersByTimeAsync(60);
      const report = await pending;
      expect(report.checks).toEqual({ database: 'ng', catalog: 'ok' });
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('release', () => {
  it('公開版の識別子が64桁の16進でなければ unknown', async () => {
    const report = await runHealthChecks({ ...base, releaseHash: 'not-a-hash', pingDatabase: async () => [], readCatalogCount: async () => 20 });
    expect(report.release).toBe('unknown');
  });
});

describe('sanitizeVersion', () => {
  it('安全な短い文字列だけ通し、それ以外は unknown', () => {
    expect(sanitizeVersion('abc123-1.0')).toBe('abc123-1.0');
    expect(sanitizeVersion(undefined)).toBe('unknown');
    expect(sanitizeVersion('')).toBe('unknown');
    expect(sanitizeVersion('<script>')).toBe('unknown');
    expect(sanitizeVersion('x'.repeat(41))).toBe('unknown');
  });
});
