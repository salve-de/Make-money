import { describe, expect, it } from 'vitest';
import { resolveRadarProofEntityId } from './radar-proof-link';

const ids = [
  'ent_photoai',
  'ent_betteruptime_bb05846361a4c3e961c7',
  'ent_midjourney_123456',
];

describe('radar proof entity resolution', () => {
  it('keeps an exact ledger ID unchanged', () => {
    expect(resolveRadarProofEntityId('ent_photoai', ids)).toBe('ent_photoai');
  });

  it('maps known stale short IDs to the one real ledger record', () => {
    expect(resolveRadarProofEntityId('ent_betterstack', ids)).toBe('ent_betteruptime_bb05846361a4c3e961c7');
    expect(resolveRadarProofEntityId('ent_midjourney', ids)).toBe('ent_midjourney_123456');
  });

  it('fails closed for unknown, missing, or ambiguous IDs', () => {
    expect(resolveRadarProofEntityId('ent_missing', ids)).toBeNull();
    expect(resolveRadarProofEntityId('ent_better', ids)).toBeNull();
    expect(resolveRadarProofEntityId('ent_midjourney', [...ids, 'ent_midjourney_654321'])).toBeNull();
  });
});
