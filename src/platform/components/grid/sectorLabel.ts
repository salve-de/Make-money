import type { FinancialEntity } from '@/shared/terminal';
import { SECTOR_LABELS } from '@/shared/ui-strings';

/** SEC の標準産業分類（SEC_SIC）が根拠の時だけ業種名を返す。キーワードからの推測・分類未確認は null（画面に出さない）。 */
export function sectorLabel(entity: Pick<FinancialEntity, 'sector' | 'sectorBasis'>): string | null {
  if (entity.sectorBasis?.source !== 'SEC_SIC' || entity.sector === 'UNKNOWN') return null;
  return SECTOR_LABELS[entity.sector] ?? null;
}
