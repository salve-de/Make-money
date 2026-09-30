import { describe, expect, it } from 'vitest';
import sample from '../../../data/fixtures/reader-case.sample.json';
import { ReaderCaseSchema } from '@/shared/reader-case';

describe('reader-case.sample.json', () => {
  for (const [id, value] of Object.entries(sample)) {
    it(`${id} passes ReaderCaseSchema`, () => {
      const r = ReaderCaseSchema.safeParse(value);
      expect(r.success, r.success ? '' : JSON.stringify(r.error.issues)).toBe(true);
    });
  }
});
