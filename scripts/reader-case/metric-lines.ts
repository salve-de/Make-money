/**
 * 決まった形の文を機械で metric にする。
 *  - IH の収益欄の定型文（「収益ページは月$10,000…」）
 *  - 年次の報告値の文（「FY2025は売上高23,769百万ドル、営業利益…だった」「2026年3月期の売上高は13,345百万円」）
 * 金額は原文の通貨のまま。12で割らない。円に換算しない。
 */
import type { Measure, PeriodKind } from './unit-map';

export interface MetricHint {
  measure: Measure;
  periodKind: PeriodKind;
  period: string;
  amount: number;
  currency?: string;
  label?: string;
  basis?: string;
  statedAt?: string;
}

const NUM = String.raw`(\d[\d,]*(?:\.\d+)?)`;

function num(s: string): number {
  return Number(s.replace(/,/g, ''));
}

/** 「12兆4796億2000万」のような日本語の桁つき数字を数にする。位置 pos から始まる部分を読む。 */
const COMPOUND = new RegExp(
  String.raw`(?:${NUM}兆)?(?:${NUM}億)?(?:${NUM}千万)?(?:${NUM}百万)?(?:${NUM}万)?(?:${NUM}千)?(?:${NUM})?`,
  'y',
);

const CURRENCIES: [RegExp, string][] = [
  [/^(?:米ドル|ドル|USD|US\$)/, 'USD'],
  [/^(?:円|JPY)/, 'JPY'],
  [/^(?:ユーロ|EUR)/, 'EUR'],
  [/^(?:人民元|元|CNY)/, 'CNY'],
  [/^(?:ポンド|GBP)/, 'GBP'],
  [/^(?:スイスフラン|CHF)/, 'CHF'],
  [/^(?:台湾ドル|TWD)/, 'TWD'],
];

export function readJapaneseAmount(s: string, pos = 0): { amount: number; end: number } | null {
  COMPOUND.lastIndex = pos;
  const m = COMPOUND.exec(s);
  if (!m || m[0].length === 0) return null;
  const parts = [1e12, 1e8, 1e7, 1e6, 1e4, 1e3, 1];
  let total = 0;
  let any = false;
  for (let i = 0; i < parts.length; i++) {
    const g = m[i + 1];
    if (g === undefined) continue;
    any = true;
    total += num(g) * parts[i]!;
  }
  if (!any) return null;
  // 小数の誤差を落とす（24193.683 * 1e6 など）
  return { amount: Math.round(total * 1000) / 1000, end: pos + m[0].length };
}

function readCurrency(s: string): string | undefined {
  for (const [re, c] of CURRENCIES) if (re.test(s)) return c;
  return undefined;
}

/** ---- IH の収益欄 ---- */
export function parseIhRevenue(original: string): MetricHint | null {
  const m = original.match(
    /(月間売上|月次売上|月次の?経常収益|月商|月|年間売上|年次売上|年商|年|累計売上|累計)\s*(?:を)?(?:US)?[$＄]\s?([\d,]+(?:\.\d+)?)\s?([KkMm万]?)/,
  );
  if (!m) return null;
  let amount = num(m[2]!);
  const mult = m[3] === 'K' || m[3] === 'k' ? 1e3 : m[3] === 'M' || m[3] === 'm' ? 1e6 : m[3] === '万' ? 1e4 : 1;
  amount = Math.round(amount * mult * 100) / 100;
  const unit = m[1]!;
  const isYear = /^(?:年間売上|年次売上|年商|年)$/.test(unit);
  const isCum = /^累計/.test(unit);
  const date = original.match(/(\d{4}-\d{2}-\d{2})\s*(?:に最後に更新|最終更新|に更新)/)?.[1];
  return {
    measure: 'REVENUE',
    periodKind: isCum ? 'CUMULATIVE' : isYear ? 'YEAR' : 'MONTH',
    period: isCum ? '累計' : isYear ? '年' : '月',
    amount,
    currency: 'USD',
    ...(date ? { statedAt: date } : {}),
  };
}

/** ---- 年次の報告値の文 ---- */
const PERIOD_RE = /(FY\s?\d{4}|\d{4}年\d{1,2}月期|\d{4}年度|\d{4}-\d{2}会計年度)/;

function canonicalPeriod(p: string): string {
  return p.replace(/^FY\s?/, 'FY');
}

function measureOfSubject(subject: string): { measure: Measure; label?: string; basis?: string } | null {
  const s = subject
    .replace(/^(?:SEC 10-Kの報告値では、?|同年度の|同期の)/, '')
    .replace(PERIOD_RE, '')
    .replace(/^(?:[のは、\s]+)/, '')
    .replace(/^(?:EU-IFRS|連結|継続事業の|継続事業)/, '')
    .replace(/^[のは\s]+/, '')
    .trim();
  if (/^純売上高$/.test(s)) return { measure: 'REVENUE', basis: '純売上高' };
  if (/^(?:売上高|売上収益|純収益|売上|純売上)$/.test(s)) return { measure: 'REVENUE' };
  if (/^営業利益$/.test(s)) return { measure: 'OPERATING_INCOME' };
  if (/^(?:営業損失)$/.test(s)) return { measure: 'OPERATING_INCOME' };
  if (/^(?:当期)?純利益$/.test(s) || /^(?:親会社(?:株主|の所有者)?に帰属する|.*(?:自動車|グループ)?帰属)(?:当期)?(?:純)?利益$/.test(s) || /^税引後利益$/.test(s) || /^親会社株主帰属純利益$/.test(s)) {
    return { measure: 'NET_INCOME' };
  }
  if (/^(?:COGS|売上原価|開示cost of sales)$/i.test(s)) return { measure: 'COST', label: '売上原価' };
  return null;
}

export interface FinancialParse {
  metrics: MetricHint[];
  /** 数値を含む節のうち、metric にできなかった数 */
  unparsedNumeric: number;
  period?: string;
}

export function parseFinancialLine(text: string, inheritPeriod?: string): FinancialParse {
  const metrics: MetricHint[] = [];
  const period0 = text.match(PERIOD_RE)?.[1];
  const period = period0 ? canonicalPeriod(period0) : inheritPeriod;
  let unparsed = 0;
  if (!period) return { metrics, unparsedNumeric: 1 };
  // 「、」で節に分け、各節が「〜は/を + 金額 + 通貨」か調べる
  const clauses = text.split('、');
  for (const raw of clauses) {
    const c = raw.replace(PERIOD_RE, '').replace(/^SEC 10-Kの報告値では[、,]?/, '').trim();
    const m = c.match(/^(.*?)(?:は|が)?\s*([\-−▲△]?)\s*(?=[\d])/);
    if (!m) continue;
    const subject = m[1]!.replace(/[のは]$/, '');
    const start = m[0].length;
    const amt = readJapaneseAmount(c, start);
    if (!amt) {
      if (/\d/.test(c)) unparsed++;
      continue;
    }
    const currency = readCurrency(c.slice(amt.end));
    if (!currency) {
      unparsed++;
      continue;
    }
    const spec = measureOfSubject(subject);
    if (!spec) {
      unparsed++;
      continue;
    }
    let amount = amt.amount;
    if (m[2] || /営業損失|純損失/.test(subject)) amount = -Math.abs(amount);
    metrics.push({
      measure: spec.measure,
      periodKind: 'FISCAL_YEAR',
      period,
      amount,
      currency,
      ...(spec.label ? { label: spec.label } : {}),
      ...(spec.basis ? { basis: spec.basis } : {}),
    });
  }
  return { metrics, unparsedNumeric: unparsed, period };
}
