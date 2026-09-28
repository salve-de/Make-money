import { expect, it } from 'vitest';
import { assertAuditSnapshotBoundary } from '@/shared/financial-entity-schema';
import type { FinancialEntity } from '@/platform/types/terminal';
import { autoEnrichEntityBeforeIngest } from '../../../scripts/pipeline/auto-enrich-entity';

it('preserves original source metadata while sanitizing active display copy', () => {
  const input = {
    id: 'ent_history_test', name: 'Test', tags: [],
    tagline: 'サバンナOS',
    sourceMetadata: { original: 'サバンナOS', nested: [{ text: '略奪転用方程式' }] },
    reaudit: { legacyDisplaySnapshot: { priorDescription: 'サバンナOS', priorPnl: { monthlyRevenue: 1200000 } } },
  };
  const before = structuredClone(input);
  const output = autoEnrichEntityBeforeIngest(input as unknown as FinancialEntity) as unknown as typeof input;
  expect(output.sourceMetadata).toEqual(before.sourceMetadata);
  expect(output.tagline).toBe('人間の本能・心理の急所');
  expect(input).toEqual(before);
  expect(output.sourceMetadata).not.toBe(input.sourceMetadata);
  expect(output.reaudit.legacyDisplaySnapshot).toEqual(before.reaudit.legacyDisplaySnapshot);
  expect(output.reaudit.legacyDisplaySnapshot).not.toBe(input.reaudit.legacyDisplaySnapshot);
});

it('does not add source metadata when the input has none', () => {
  const output = autoEnrichEntityBeforeIngest({ id: 'ent_test', name: 'Test', tags: [] } as unknown as FinancialEntity);
  expect(output).not.toHaveProperty('sourceMetadata');
});

it('accepts typed opaque snapshots only inside reaudit', () => {
  const reaudit = { legacyDisplaySnapshot: { priorDescription: 'original' } } satisfies NonNullable<FinancialEntity['reaudit']>;
  expect(() => assertAuditSnapshotBoundary({ reaudit })).not.toThrow();
  expect(() => assertAuditSnapshotBoundary({ sourceMetadata: { legacyDisplaySnapshot: 'original source value' } })).not.toThrow();
});

it.each([null, [], 'text', 42])('rejects malformed audit snapshot %j', (legacyDisplaySnapshot) => {
  expect(() => assertAuditSnapshotBoundary({ reaudit: { legacyDisplaySnapshot } })).toThrow('audit snapshot boundary');
});

it.each([
  { legacyDisplaySnapshot: {} },
  { evidenceCards: [{ legacyDisplaySnapshot: {} }] },
  { other: { reaudit: { legacyDisplaySnapshot: {} } } },
])('rejects misplaced snapshots', (input) => {
  expect(() => assertAuditSnapshotBoundary(input)).toThrow('audit snapshot boundary');
});
