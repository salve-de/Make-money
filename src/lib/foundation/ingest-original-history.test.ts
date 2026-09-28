import { expect, it } from 'vitest';
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
