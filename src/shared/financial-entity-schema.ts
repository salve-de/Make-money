import type { FinancialEntity } from './terminal';
import schema from './schemas/financial-entity.json';
import { compileParser } from './validate-json';

export const parseFinancialEntity = compileParser<FinancialEntity>(schema, 'FinancialEntity');
export function parseFinancialEntities(input: unknown): FinancialEntity[] {
  if (!Array.isArray(input)) throw new Error('Invalid FinancialEntity list');
  return input.map(parseFinancialEntity);
}
