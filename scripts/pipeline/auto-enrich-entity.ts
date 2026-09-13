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
  [/決済関所/gi, '決済代行プラットフォーム']
];

function sanitizeString(str: string): string {
  if (!str) return '';
  let res = str;
  for (const [pattern, rep] of FORBIDDEN_REPLACEMENTS) {
    res = res.replace(pattern, rep);
  }
  return res;
}

function sanitizeObject<T>(obj: T): T {
  if (typeof obj === 'string') {
    return sanitizeString(obj) as unknown as T;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item)) as unknown as T;
  }
  if (obj !== null && typeof obj === 'object') {
    const res: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(obj)) {
      res[key] = sanitizeObject(val);
    }
    return res as unknown as T;
  }
  return obj;
}

/**
 * 収集したエンティティのサニタイズ（禁止造語パージ）およびメタデータ正規化関数。
 * 【絶対原則】存在しないFact、架空のEvidence Card、定型テンプレートの捏造を永久禁止する。
 * 取れたファクトのみをありのまま通し、未確認の項目はnull/空のまま保持する。
 */
export function autoEnrichEntityBeforeIngest(ent: FinancialEntity): FinancialEntity {
  const cloned: FinancialEntity = JSON.parse(JSON.stringify(ent));

  // 1. タグの正規化
  if (!cloned.tags) {
    cloned.tags = ['収集事例'];
  } else if (!cloned.tags.includes('収集事例')) {
    cloned.tags.unshift('収集事例');
  }

  // 2. 全体の禁止造語サニタイズ（社内スラングの完全パージ）
  const sanitized = sanitizeObject(cloned);

  return sanitized;
}
