import type { FinancialEntity } from '@/shared/terminal';

export function entityDescription(entity: FinancialEntity): string {
  const candidates = [entity.essence?.whatItDoes, entity.tagline];
  return candidates.find((text) => text?.trim() && text.trim() !== '金額・費用の裏付けは未確認。')?.trim() || '';
}
