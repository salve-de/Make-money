import { expect, it } from 'vitest';
import { assertEvidenceOnlyEntityHistory } from './immutable-entity-history';
import { createHash } from 'node:crypto';
import { materializeScheduledR2Handoff, persistEntityEvidenceHistory } from '../../../r2-writer/worker';

const existing = { entity_id: 'ent_example', canonical_name: 'Example', entity_type: 'company', domain: 'example.com', evidence_ids: ['ev_old'] };
it('allows only evidence linkage history without changing the immutable entity', () => {
  const before = JSON.stringify(existing);
  expect(() => assertEvidenceOnlyEntityHistory(existing, { ...existing, evidence_ids: ['ev_new'] })).not.toThrow();
  expect(JSON.stringify(existing)).toBe(before);
});
it('rejects identity and business fact changes, including added fields', () => {
  for (const patch of [{ entity_id: 'ent_other' }, { canonical_name: 'Other' }, { domain: 'other.com' }, { status: 'closed' }]) {
    expect(() => assertEvidenceOnlyEntityHistory(existing, { ...existing, ...patch })).toThrow();
  }
});
it('rejects missing or malformed evidence links', () => {
  for (const evidence_ids of [[], null, ['bad'], [1]]) {
    expect(() => assertEvidenceOnlyEntityHistory(existing, { ...existing, evidence_ids })).toThrow();
  }
});

it('appends only bundle and Journal, retains the exact immutable seed, and retries idempotently', async () => {
  const { bundle } = await materializeScheduledR2Handoff({ queue: { run_id: 'run_history_test', finished_at: '2026-09-21T00:00:00Z',
    recorded_items: [{ name: 'Example', state: 'VALIDATED_FOR_R2_HANDOFF', Evidence: 'ev_1234567890abcdef12345678' }] },
    source_runs: [{ source_attempts: [{ url: 'https://example.com/report', result: 'success', evidence_ids_if_any: ['ev_1234567890abcdef12345678'] }] }] });
  const incoming = (bundle.entities as Record<string, unknown>[])[0];
  const seed: Record<string, unknown> = { ...incoming, evidence_ids: ['ev_aaaaaaaaaaaaaaaaaaaaaaaa'] };
  const body = new TextEncoder().encode(JSON.stringify(seed) + '\n');
  const key = `datasets/ds.business.entities.core/v1/entities/${seed.entity_id}.json`;
  const values = new Map<string, Uint8Array>([[key, body]]);
  let puts = 0;
  const bucket = { head: async () => null,
    get: async (k: string) => values.has(k) ? { arrayBuffer: async () => values.get(k)!.slice().buffer } : null,
    put: async (k: string, b: Uint8Array) => { if (values.has(k)) return null; puts++; values.set(k, b); return { arrayBuffer: async () => b.slice().buffer }; } };
  const env = { FOUNDATION_R2_LAKE: bucket, FOUNDATION_R2_RAW: bucket, FOUNDATION_R2_PUBLIC: bucket, FOUNDATION_R2_RESTRICTED: bucket };
  const preservedCores = [{ entityId: String(seed.entity_id), sha256: createHash('sha256').update(body).digest('hex') }];
  await expect(persistEntityEvidenceHistory({ bundle, preservedCores: [{ ...preservedCores[0], sha256: '0'.repeat(64) }] }, env)).rejects.toThrow('hash mismatch');
  expect(puts).toBe(0);
  const result = await persistEntityEvidenceHistory({ bundle, preservedCores }, env);
  expect(result.readback_verified).toBe(result.planned);
  expect(result.objects.every(o => ['research_bundle', 'journal_entry'].includes(String(o.role)))).toBe(true);
  expect(values.get(key)).toEqual(body);
  expect((await persistEntityEvidenceHistory({ bundle, preservedCores }, env)).created).toBe(0);
  const before = puts;
  await expect(persistEntityEvidenceHistory({ bundle: { ...bundle, entities: [{ ...incoming, canonical_name: 'Different' }] }, preservedCores }, env)).rejects.toThrow('protected field');
  expect(puts).toBe(before);
});
