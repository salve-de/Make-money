import type { FinancialEntity } from '../../src/platform/types/terminal';

const FORBIDDEN_REPLACEMENTS: [RegExp, string][] = [
  [/サバンナ\s*OS/gi, '人間の本能・心理の急所'],
  [/略奪転用方程式/gi, 'ビジネスモデル設計図'],
  [/カニバリズム障壁/gi, '大企業のジレンマ（自社競合の壁）'],
  [/身も蓋もない真実/gi, '飾らない現場の実態'],
  [/特異物証/gi, '一次証拠ログ'],
  [/地雷検死/gi, '失敗・撤退の検証'],
  [/検死開示/gi, '撤退要因の分析'],
  [/ホスティング関所/gi, 'インフラ提供基盤'],
  [/決済関所/gi, '決済代行プラットフォーム'],
];

const HAZARD_TAG = /破綻|倒産|粉飾|不正|清算|枯渇|崩壊|撤退|レシーバーシップ/i;

function sanitizeString(value: string): string {
  let result = value;
  for (const [pattern, replacement] of FORBIDDEN_REPLACEMENTS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

function sanitizeObject<T>(value: T): T {
  if (typeof value === 'string') return sanitizeString(value) as T;
  if (Array.isArray(value)) return value.map((item) => sanitizeObject(item)) as T;
  if (value !== null && typeof value === 'object') {
    const next: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value)) next[key] = sanitizeObject(child);
    return next as T;
  }
  return value;
}

/**
 * Normalize collected research before the strict ingest gates run.
 *
 * This function deliberately does not invent missing business facts. Unknown
 * tools, evidence, margins, customer-acquisition tactics, opportunity judgments,
 * or narrative fields stay unknown so downstream validation can reject or retain
 * an honestly incomplete dossier instead of persisting a sector template as fact.
 */
export function autoEnrichEntityBeforeIngest(entity: FinancialEntity): FinancialEntity {
  const cloned = sanitizeObject(JSON.parse(JSON.stringify(entity)) as FinancialEntity);

  const tags = Array.isArray(cloned.tags) ? [...new Set(cloned.tags)] : [];
  if (!tags.includes('収集事例')) tags.unshift('収集事例');

  const isHazard = cloned.pnl?.financialStatus === 'POST_MORTEM'
    || tags.some((tag) => HAZARD_TAG.test(tag))
    || (Array.isArray(cloned.evidenceCards)
      && cloned.evidenceCards.some((card) => card?.type === 'FATAL_BLEED'));

  if (isHazard) {
    if (cloned.pnl) cloned.pnl.financialStatus = 'POST_MORTEM';
    if (!tags.includes('失敗・撤退の検証')) tags.push('失敗・撤退の検証');
  }

  cloned.tags = tags;
  return cloned;
}
