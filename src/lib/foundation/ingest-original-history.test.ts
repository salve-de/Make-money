import { expect, it } from 'vitest';
import type { FinancialEntity } from '@/platform/types/terminal';
import { autoEnrichEntityBeforeIngest } from '../../../scripts/pipeline/auto-enrich-entity';

it('preserves original source metadata while sanitizing active display copy', () => {
  const input = {
    id: 'ent_history_test', name: 'Test', tags: [],
    tagline: 'サバンナOS',
    sourceMetadata: { original: 'サバンナOS', nested: [{ text: '略奪転用方程式' }] },
  };
  const before = structuredClone(input);
  const output = autoEnrichEntityBeforeIngest(input as unknown as FinancialEntity) as unknown as typeof input;
  expect(output.sourceMetadata).toEqual(before.sourceMetadata);
  expect(output.tagline).toBe('人間の本能・心理の急所');
  expect(input).toEqual(before);
  expect(output.sourceMetadata).not.toBe(input.sourceMetadata);
});

it('does not add source metadata when the input has none', () => {
  const output = autoEnrichEntityBeforeIngest({ id: 'ent_test', name: 'Test', tags: [] } as unknown as FinancialEntity);
  expect(output).not.toHaveProperty('sourceMetadata');
});
