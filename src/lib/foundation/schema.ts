import type { FoundationBusinessCase, FoundationValuePage } from './business-reader';
import businessCaseSchema from './schemas/business-case.json';
import valuePageSchema from './schemas/value-page.json';
import { compileParser } from '@/shared/validate-json';

export const parseFoundationBusinessCase = compileParser<FoundationBusinessCase>(businessCaseSchema, 'Foundation detail');
export const parseFoundationValuePage = compileParser<FoundationValuePage>(valuePageSchema, 'Foundation page');

function envelope(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid businesses response');
  return input as Record<string, unknown>;
}
export function parseFoundationPageResponse(input: unknown): FoundationValuePage | null {
  const value = envelope(input);
  if (value.source !== 'foundation_lake') return null;
  return parseFoundationValuePage(value);
}
export function parseFoundationDetailResponse(input: unknown): FoundationBusinessCase | null {
  const value = envelope(input);
  if (value.source !== 'foundation_lake') return null;
  return parseFoundationBusinessCase(value.data);
}
