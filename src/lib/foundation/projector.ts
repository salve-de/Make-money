import type { FinancialEntity } from '@/shared/terminal';
import { parseFinancialEntity } from '@/shared/financial-entity-schema';

/** Only complete consumer records pass; raw bundles never acquire invented facts. */
export function projectBundleToFinancialEntity(input: unknown): FinancialEntity | null {
  try { return parseFinancialEntity(input); }
  catch { return null; }
}
