import { describe, expect, it } from 'vitest';
import { prepareUnstoredMoneySignalDefaults } from './money-signal-null-defaults';
import { persistBundle } from '../../../r2-writer/worker';

const signal = { money_signal_id: 'ms_1234567890abcdef12345678', amount: '>18000000',
  currency: 'USD', evidence_ids: ['ev_1234567890abcdef12345678'], verification_status: 'UNVERIFIED' };
const fixture = (row: Record<string, unknown> = signal) => ({ schema_version: 'research-bundle.v1',
  run_id: 'run_null_defaults', retrieved_at: '2026-09-21T00:00:00.000Z',
  money_signals: [row], quality: { schema_validation: 'PASS' }, observations: [{ text: 'preserve' }] });

describe('unpersisted MoneySignal null defaults', () => {
  it('adds only two absent fields without mutating the source or values/evidence', async () => {
    const input = fixture(); const before = JSON.stringify(input);
    const result = await prepareUnstoredMoneySignalDefaults(input, async key => {
      expect(key).toBe('datasets/ds.business.research-bundles.derived/v1/2026/09/21/run_null_defaults.json');
      return null;
    });
    expect(result.status).toBe('PREPARED_UNSTORED_BUNDLE');
    if (result.status !== 'PREPARED_UNSTORED_BUNDLE') throw Error('Unexpected existing bundle');
    expect(result.bundle).toEqual({ ...input, money_signals: [{ ...signal, unit: null, amount_label: null }] });
    expect(JSON.stringify(input)).toBe(before);
    expect(result.changes).toEqual([{ money_signal_id: signal.money_signal_id, fields: ['unit', 'amount_label'] }]);
  });
  it('never parses or regenerates a saved bundle, including different/invalid stored bytes', async () => {
    const input = fixture(); const before = JSON.stringify(input);
    for (const stored of [new TextEncoder().encode('immutable old bytes'), new Uint8Array()]) {
      const result = await prepareUnstoredMoneySignalDefaults(input, async () => stored);
      expect(result.status).toBe('EXISTING_BUNDLE_UNCHANGED');
      expect('bundle' in result).toBe(false);
      expect(result).toHaveProperty('stored', stored);
    }
    expect(JSON.stringify(input)).toBe(before);
  });
  it('propagates read errors rather than treating them as absent', async () => {
    await expect(prepareUnstoredMoneySignalDefaults(fixture(), async () => { throw Error('R2 unavailable'); }))
      .rejects.toThrow('R2 unavailable');
  });
  it('preserves actual text, empty strings, null and unrelated missing fields', async () => {
    for (const value of ['USD per year', '', null]) {
      const input = fixture({ ...signal, unit: value, amount_label: value });
      const result = await prepareUnstoredMoneySignalDefaults(input, async () => null);
      if (result.status !== 'PREPARED_UNSTORED_BUNDLE') throw Error('Unexpected existing bundle');
      expect(result.bundle).toBe(input);
      expect(result.changes).toEqual([]);
      expect(result.bundle.money_signals).not.toHaveProperty('0.payer_entity_id');
    }
  });
  it('rejects malformed existing field values instead of coercing them', async () => {
    for (const value of [undefined, 0, false, {}, []]) {
      await expect(prepareUnstoredMoneySignalDefaults(fixture({ ...signal, unit: value }), async () => null))
        .rejects.toThrow('do not coerce');
    }
  });
  it('rejects malformed paths and IDs before preparation', async () => {
    await expect(prepareUnstoredMoneySignalDefaults({ ...fixture(), run_id: 'run_../../other' }, async () => null))
      .rejects.toThrow('identity');
    await expect(prepareUnstoredMoneySignalDefaults(fixture({ ...signal, money_signal_id: 'invented' }), async () => null))
      .rejects.toThrow('identity');
  });
  it('keeps the ordinary writer exact-byte conflict checks after preparation', async () => {
    const result = await prepareUnstoredMoneySignalDefaults(fixture(), async () => null);
    if (result.status !== 'PREPARED_UNSTORED_BUNDLE') throw Error('Unexpected existing bundle');
    let puts = 0;
    const altered = new TextEncoder().encode(JSON.stringify({ ...signal, amount: 1, unit: null, amount_label: null }) + '\n');
    const bucket = { head: async () => null, get: async (key: string) => key.includes('money-signals.core')
      ? { arrayBuffer: async () => altered.slice().buffer } : null,
      put: async () => { puts++; return null; } };
    await expect(persistBundle(result.bundle, { FOUNDATION_R2_LAKE: bucket, FOUNDATION_R2_RAW: bucket,
      FOUNDATION_R2_PUBLIC: bucket, FOUNDATION_R2_RESTRICTED: bucket })).rejects.toThrow('R2_OBJECT_CONFLICT');
    expect(puts).toBe(0);
  });
});
