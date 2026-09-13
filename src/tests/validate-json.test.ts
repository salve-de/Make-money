import { expect, it } from 'vitest';
import { compileParser } from '@/shared/validate-json';

const parseRecord = compileParser<{ id: string; note?: string; values: number[] }>(
  {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    required: ['id', 'values'],
    properties: {
      id: { type: 'string' },
      note: { type: 'string' },
      values: { type: 'array', items: { type: 'number' } },
    },
  },
  'test record',
);

it('validates JSON-shaped records without mutating the original value', () => {
  const value = { id: 'one', note: undefined, values: [1, 2] };
  expect(parseRecord(value)).toBe(value);
  expect(value.note).toBeUndefined();
});

it('rejects non-finite numbers that cannot cross a JSON boundary', () => {
  expect(() => parseRecord({ id: 'nan', values: [Number.NaN] })).toThrow('Invalid test record');
  expect(() => parseRecord({ id: 'infinity', values: [Number.POSITIVE_INFINITY] })).toThrow('Invalid test record');
});

it('reports schema failures without including the rejected payload', () => {
  expect(() => parseRecord({ id: 42, values: [] })).toThrow('Invalid test record');
  let message = '';
  try {
    parseRecord({ id: 'bad', values: ['private-secret'] } as never);
  } catch (error) {
    message = String(error);
  }
  expect(message).toContain('Invalid test record');
  expect(message).not.toContain('private-secret');
});
