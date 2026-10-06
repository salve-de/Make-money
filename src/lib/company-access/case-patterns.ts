/**
 * 事例どうしを並べて見える傾向（共通する勝ち方・条件付きの比較・意外な組合せ・有料になる引き金）を作る純関数。
 *
 * 材料は公開目録の reader（出典つきの事実 facts と、推測の印を付けて出す analysis）だけ。
 * 画面に出る数字は、必ず「根拠の事例リスト」の件数から数える。数字だけが独り歩きしない。
 * 事実から拾うもの（料金の型・有料になる引き金・売上の根拠）と、推論から拾うもの（勝ち方）は混ぜない。
 */

export interface PatternSourceCase {
  id: string;
  name: string;
  sector?: string;
  tags?: string[];
  reader?: {
    facts?: Array<{ kind: string; text: string; statedAt?: string }>;
    analysis?: Array<{ item: string; text: string }>;
    metrics?: Array<{ measure: string; origin: string }>;
  };
}

export type PriceType = 'MONTHLY' | 'ANNUAL' | 'ONE_TIME' | 'USAGE' | 'FREE_TRIAL' | 'QUOTE' | 'FEE_SHARE';
export type RevenueBasis = 'FILED' | 'THIRD_PARTY' | 'ARTICLE' | 'SELF_REPORTED' | 'NONE';
export type WinKey =
  | 'CH_SEARCH' | 'CH_WORD' | 'CH_SNS' | 'CH_COMMUNITY' | 'CH_PARTNER' | 'CH_SALES' | 'CH_FREE' | 'CH_ADS'
  | 'UPFRONT' | 'REFERRAL' | 'PIVOT' | 'LOCK_WEAK' | 'LOCK_STRONG';
export type TriggerKey = 'CAP' | 'USAGE' | 'SEATS' | 'TRIAL' | 'REFUND' | 'COMMERCIAL' | 'FAMILY' | 'PREPAID';

export const PRICE_TYPE_LABELS: Record<PriceType, string> = {
  MONTHLY: '月額',
  ANNUAL: '年払い',
  ONE_TIME: '買い切り',
  USAGE: '従量・クレジット',
  FREE_TRIAL: '無料枠・試用',
  QUOTE: '個別見積もり',
  FEE_SHARE: '手数料・成功報酬',
};
export const REVENUE_BASIS_LABELS: Record<RevenueBasis, string> = {
  FILED: '届出・開示',
  THIRD_PARTY: '第三者の数字',
  ARTICLE: '記事',
  SELF_REPORTED: '本人の申告',
  NONE: '売上の数字なし',
};
export const WIN_LABELS: Record<WinKey, string> = {
  CH_SEARCH: '集客：検索から入る',
  CH_WORD: '集客：口コミ・紹介',
  CH_SNS: '集客：SNS・投稿',
  CH_COMMUNITY: '集客：コミュニティ・掲載サイト',
  CH_PARTNER: '集客：提携・配布先に載る',
  CH_SALES: '集客：営業・問い合わせ',
  CH_FREE: '集客：無料で入口を作る',
  CH_ADS: '集客：広告',
  UPFRONT: '前金を先に受ける',
  REFERRAL: '紹介報酬の仕組みがある',
  PIVOT: '方向転換を経ている',
  LOCK_STRONG: '使うほど離れにくい',
  LOCK_WEAK: '客を縛る力は弱い',
};
export const TRIGGER_LABELS: Record<TriggerKey, string> = {
  CAP: '利用の上限を超える',
  USAGE: '使った回数・分量に応じる',
  SEATS: '人数・台数・サイト数が増える',
  TRIAL: '無料枠や試用が終わる',
  REFUND: '返金の条件がある',
  COMMERCIAL: '商用で使う',
  FAMILY: '家族・共有で使う',
  PREPAID: '年払い・前払いにする',
};

// 料金の型は、PRICING の事実の文だけから拾う。語が見つからなければ型なし（推測で埋めない）。
const PRICE_TYPE_RULES: Array<[PriceType, RegExp]> = [
  ['MONTHLY', /月額|\/\s*月|月\s*[$€¥￥]|[$€¥￥]\s*[\d,.]+\s*\/\s*(?:ユーザー\/)?月|月払い|毎月/],
  ['ANNUAL', /年払い|年額|年間契約|年次|年契約|年間請求/],
  ['ONE_TIME', /買い切り|買切|一括払い|永久ライセンス|生涯ライセンス|ライフタイム/],
  ['USAGE', /従量|クレジット|ウォレット|チャージ|トークン課金|結果課金|1回あたり|1件あたり/],
  ['FREE_TRIAL', /無料トライアル|無料試用|無料体験|試用|トライアル|無料プラン|無料枠|フリープラン|永久無料|無料で使え|無料版/],
  ['QUOTE', /個別見積|見積もり/],
  ['FEE_SHARE', /手数料|成功報酬|レベニューシェア|取り分/],
];

// 有料になる引き金。PRICING の事実の文だけを見て、語の拾い方を厳密にする。
// 「返品審査」のように別の意味で出る語は除く。
const UNIT = '(?:通|件|人|回|名|席|シート|ユーザー|サイト|ドメイン|プロジェクト|アカウント|GB|MB|TB|クレジット|リクエスト|トークン|購読者|メンバー|台|デバイス|端末|枠|分|時間|本|ページ|商品|ライセンス)';
const TRIGGER_RULES: Array<[TriggerKey, RegExp]> = [
  ['CAP', new RegExp(`上限|[\\d,.]+\\s*${UNIT}\\s*(?:まで|以内)|まで無料`)],
  ['USAGE', /従量|クレジット|ウォレット|チャージ|1回あたり|1件あたり|トークン課金|結果課金|残高から/],
  ['SEATS', /席数|シート|ユーザー数|1ユーザー|ユーザー(?:あたり|ごと)|\/\s*ユーザー|人数に応じ|台数|デバイス数|サイト(?:あたり|ごと)|1サイト/],
  ['TRIAL', /無料トライアル|無料試用|無料体験|試用|トライアル|無料プラン|無料枠|フリープラン|永久無料/],
  ['REFUND', /返金保証|\d+日間?(?:の)?返金|\d+日以内.{0,8}返金|返金(?:可能|対応|条件|ポリシー)|全額保証|満足保証/],
  ['COMMERCIAL', /商用|商業利用/],
  ['FAMILY', /家族|ファミリープラン|共有プラン|チーム共有/],
  ['PREPAID', /年払い|年額|年次サブスク|年契約|前払い|前払/],
];

// 勝ち方は、推論（analysis）の文から拾う。画面では必ず「推測」と出す。
const CHANNEL_RULES: Array<[WinKey, RegExp]> = [
  ['CH_SEARCH', /検索|SEO/],
  ['CH_WORD', /口コミ|紹介|クチコミ/],
  ['CH_SNS', /SNS|Twitter|YouTube|TikTok|Instagram|LinkedIn|投稿|(?<![A-Za-z])X(?![A-Za-z])/],
  ['CH_COMMUNITY', /コミュニティ|Reddit|Discord|フォーラム|Indie Hackers|Product Hunt|Hacker News/],
  ['CH_PARTNER', /提携|パートナー|アフィリエイト|代理店|マーケットプレイス|ストア|拡張|プラグイン/],
  ['CH_SALES', /営業|コールド|商談|問い合わせ|相談/],
  ['CH_FREE', /無料|フリーミアム|試用/],
  ['CH_ADS', /広告/],
];
const LOCK_WEAK = /拘束は弱|拘束が弱|離れやすい|乗り換えやすい|弱い/;
const LOCK_STRONG = /溜まる|蓄積|組み込|履歴|連携|移行は面倒|手間が増える|手間がかか/;

/** 日付が事実に付いていない間は「最近の変化」を作らない。この件数以上そろったら再検討する目安。 */
export const RECENT_CHANGE_MIN_DATED_CASES = 30;

export interface PatternCase {
  id: string;
  name: string;
  sector: string;
  tags: string[];
  priceTypes: PriceType[];
  /** 料金の事実（PRICING）のうち、引き金の語に当たったもの。key ごとに最初の1文を残す */
  triggers: Partial<Record<TriggerKey, string>>;
  hasPricingFact: boolean;
  revenueBasis: RevenueBasis;
  /** 推論から拾った勝ち方。value は根拠にした推論の1文（推測） */
  wins: Partial<Record<WinKey, string>>;
  datedFactCount: number;
  factKinds: string[];
}

const BASIS_ORDER: RevenueBasis[] = ['FILED', 'THIRD_PARTY', 'ARTICLE', 'SELF_REPORTED'];

function basisOf(metrics: Array<{ measure: string; origin: string }>): RevenueBasis {
  const origins = new Set(
    metrics.filter((m) => m.measure === 'REVENUE' || m.measure === 'PROFIT' || m.measure === 'NET_INCOME' || m.measure === 'OPERATING_INCOME').map((m) => m.origin),
  );
  const map: Record<string, RevenueBasis> = { FILED: 'FILED', THIRD_PARTY: 'THIRD_PARTY', ARTICLE: 'ARTICLE', SELF_REPORTED: 'SELF_REPORTED' };
  for (const key of BASIS_ORDER) if ([...origins].some((origin) => map[origin] === key)) return key;
  return 'NONE';
}

export function toPatternCase(source: PatternSourceCase): PatternCase {
  const facts = source.reader?.facts ?? [];
  const analysis = source.reader?.analysis ?? [];
  const pricing = facts.filter((fact) => fact.kind === 'PRICING');
  const priceTypes = PRICE_TYPE_RULES.filter(([, re]) => pricing.some((fact) => re.test(fact.text))).map(([key]) => key);
  const triggers: Partial<Record<TriggerKey, string>> = {};
  for (const [key, re] of TRIGGER_RULES) {
    const hit = pricing.find((fact) => re.test(fact.text));
    if (hit) triggers[key] = hit.text;
  }
  const wins: Partial<Record<WinKey, string>> = {};
  const channel = analysis.find((a) => a.item === 'CHANNELS');
  if (channel) for (const [key, re] of CHANNEL_RULES) if (re.test(channel.text)) wins[key] = channel.text;
  for (const [item, key] of [['UPFRONT_CASH', 'UPFRONT'], ['REFERRAL', 'REFERRAL'], ['PIVOTS', 'PIVOT']] as const) {
    const found = analysis.find((a) => a.item === item);
    if (found) wins[key] = found.text;
  }
  const lock = analysis.find((a) => a.item === 'LOCK_IN');
  if (lock) {
    if (LOCK_WEAK.test(lock.text)) wins.LOCK_WEAK = lock.text;
    else if (LOCK_STRONG.test(lock.text)) wins.LOCK_STRONG = lock.text;
  }
  return {
    id: source.id,
    name: source.name,
    sector: source.sector || 'UNKNOWN',
    tags: source.tags ?? [],
    priceTypes,
    triggers,
    hasPricingFact: pricing.length > 0,
    revenueBasis: basisOf(source.reader?.metrics ?? []),
    wins,
    datedFactCount: facts.filter((fact) => Boolean(fact.statedAt)).length,
    factKinds: [...new Set(facts.map((fact) => fact.kind))],
  };
}

export interface PatternFilter {
  sector?: string;
  priceType?: PriceType;
  revenueBasis?: RevenueBasis;
}

export function applyFilter(cases: PatternCase[], filter: PatternFilter): PatternCase[] {
  return cases.filter((c) =>
    (!filter.sector || c.sector === filter.sector)
    && (!filter.priceType || c.priceTypes.includes(filter.priceType))
    && (!filter.revenueBasis || c.revenueBasis === filter.revenueBasis));
}

export interface EvidenceRef { id: string; name: string; quote?: string }
export interface CountRow<K extends string = string> {
  key: K;
  label: string;
  count: number;
  /** 母数。割合は count / base */
  base: number;
  /** この件数の根拠の事例。evidence.length === count を常に満たす */
  evidence: EvidenceRef[];
}

/** 少ない件数は「少ない」と明記する境目 */
export const FEW_CASES = 5;
/** 母数がこれ未満の絞り込みでは、割合や組合せの傾向を出さない */
export const MIN_BASE_FOR_PATTERNS = 30;

function row<K extends string>(key: K, label: string, base: number, hits: EvidenceRef[]): CountRow<K> {
  return { key, label, count: hits.length, base, evidence: hits };
}

export function countWins(cases: PatternCase[]): Array<CountRow<WinKey>> {
  return (Object.keys(WIN_LABELS) as WinKey[]).map((key) =>
    row(key, WIN_LABELS[key], cases.length,
      cases.filter((c) => c.wins[key]).map((c) => ({ id: c.id, name: c.name, quote: c.wins[key] }))));
}

export function countTriggers(cases: PatternCase[]): { base: number; rows: Array<CountRow<TriggerKey>> } {
  const withPricing = cases.filter((c) => c.hasPricingFact);
  return {
    base: withPricing.length,
    rows: (Object.keys(TRIGGER_LABELS) as TriggerKey[]).map((key) =>
      row(key, TRIGGER_LABELS[key], withPricing.length,
        withPricing.filter((c) => c.triggers[key]).map((c) => ({ id: c.id, name: c.name, quote: c.triggers[key] })))),
  };
}

export function countPriceTypes(cases: PatternCase[]): Array<CountRow<PriceType>> {
  return (Object.keys(PRICE_TYPE_LABELS) as PriceType[]).map((key) =>
    row(key, PRICE_TYPE_LABELS[key], cases.length,
      cases.filter((c) => c.priceTypes.includes(key)).map((c) => ({ id: c.id, name: c.name }))));
}

export function countRevenueBasis(cases: PatternCase[]): Array<CountRow<RevenueBasis>> {
  return (Object.keys(REVENUE_BASIS_LABELS) as RevenueBasis[]).map((key) =>
    row(key, REVENUE_BASIS_LABELS[key], cases.length,
      cases.filter((c) => c.revenueBasis === key).map((c) => ({ id: c.id, name: c.name }))));
}

export function countSectors(cases: PatternCase[], labels: Record<string, string>): Array<CountRow> {
  const keys = [...new Set(cases.map((c) => c.sector))];
  return keys
    .map((key) => row(key, labels[key] ?? key, cases.length, cases.filter((c) => c.sector === key).map((c) => ({ id: c.id, name: c.name }))))
    .sort((a, b) => b.count - a.count);
}

export interface ComboRow {
  a: { dim: string; key: string; label: string };
  b: { dim: string; key: string; label: string };
  count: number;
  expected: number;
  /** count / expected */
  ratio: number;
  base: number;
  evidence: EvidenceRef[];
}

interface Feature { dim: string; key: string; label: string; has: (c: PatternCase) => boolean }

function features(cases: PatternCase[], labels: Record<string, string>): Feature[] {
  const list: Feature[] = [];
  for (const key of Object.keys(WIN_LABELS) as WinKey[]) list.push({ dim: '勝ち方', key, label: WIN_LABELS[key], has: (c) => Boolean(c.wins[key]) });
  for (const key of Object.keys(PRICE_TYPE_LABELS) as PriceType[]) list.push({ dim: '料金の型', key, label: `料金：${PRICE_TYPE_LABELS[key]}`, has: (c) => c.priceTypes.includes(key) });
  for (const key of [...new Set(cases.map((c) => c.sector))]) list.push({ dim: '分野', key, label: `分野：${labels[key] ?? key}`, has: (c) => c.sector === key });
  return list;
}

/**
 * 意外な組合せ。2つの特徴が一緒に出る回数を、それぞれの出やすさから見込まれる回数と比べる。
 * 同じ種類どうし（集客どうしなど）の組は除く。両方とも 5 件以上、同時に 5 件以上のものだけを対象にする。
 * 母数が少ない時は空を返す。
 */
export function findCombos(cases: PatternCase[], labels: Record<string, string>): { more: ComboRow[]; less: ComboRow[] } {
  const base = cases.length;
  if (base < MIN_BASE_FOR_PATTERNS) return { more: [], less: [] };
  const feats = features(cases, labels).map((f) => ({ ...f, ids: new Set(cases.filter(f.has).map((c) => c.id)) }))
    .filter((f) => f.ids.size >= FEW_CASES);
  const byId = new Map(cases.map((c) => [c.id, c]));
  const out: ComboRow[] = [];
  for (let i = 0; i < feats.length; i++) {
    for (let j = i + 1; j < feats.length; j++) {
      const x = feats[i], y = feats[j];
      if (x.dim === y.dim) continue;
      const shared = [...x.ids].filter((id) => y.ids.has(id));
      const expected = (x.ids.size * y.ids.size) / base;
      if (expected < FEW_CASES) continue;
      out.push({
        a: { dim: x.dim, key: x.key, label: x.label },
        b: { dim: y.dim, key: y.key, label: y.label },
        count: shared.length,
        expected: Math.round(expected * 10) / 10,
        ratio: expected > 0 ? shared.length / expected : 0,
        base,
        evidence: shared.map((id) => ({ id, name: byId.get(id)?.name ?? id })),
      });
    }
  }
  const more = out.filter((r) => r.count >= FEW_CASES && r.ratio >= 1.5).sort((p, q) => q.ratio - p.ratio || q.count - p.count).slice(0, 6);
  const less = out.filter((r) => r.ratio <= 0.5).sort((p, q) => p.ratio - q.ratio || q.expected - p.expected).slice(0, 4);
  return { more, less };
}

export interface RecentChangeStatus {
  shown: false;
  datedCases: number;
  base: number;
  reason: string;
}

/** 日付つきの根拠（事実の statedAt）が足りない間は、最近の変化を出さない。偽の傾向を作らない。 */
export function recentChangeStatus(cases: PatternCase[]): RecentChangeStatus {
  const datedCases = cases.filter((c) => c.datedFactCount > 0).length;
  return {
    shown: false,
    datedCases,
    base: cases.length,
    reason: `日付つきの根拠が集まるまで出しません（日付つきの事実がある事例：${datedCases}件／${cases.length}件）`,
  };
}

export interface PatternReport {
  filter: PatternFilter;
  total: number;
  base: number;
  /** 条件を付けない全体の勝ち方（比較の基準） */
  winsAll: Array<CountRow<WinKey>>;
  wins: Array<CountRow<WinKey>>;
  priceTypes: Array<CountRow<PriceType>>;
  revenueBasis: Array<CountRow<RevenueBasis>>;
  sectors: Array<CountRow>;
  triggers: { base: number; rows: Array<CountRow<TriggerKey>> };
  combos: { more: ComboRow[]; less: ComboRow[] };
  recent: RecentChangeStatus;
  /** 分野 × 料金の型の件数（全体） */
  matrix: { sectors: Array<{ key: string; label: string }>; cells: Record<string, Record<string, number>> };
}

export function buildPatternReport(all: PatternCase[], filter: PatternFilter, sectorLabels: Record<string, string>): PatternReport {
  const cases = applyFilter(all, filter);
  const sectorRows = countSectors(all, sectorLabels);
  const cells: Record<string, Record<string, number>> = {};
  for (const s of sectorRows) {
    cells[s.key] = {};
    for (const key of Object.keys(PRICE_TYPE_LABELS) as PriceType[]) {
      cells[s.key][key] = all.filter((c) => c.sector === s.key && c.priceTypes.includes(key)).length;
    }
  }
  return {
    filter,
    total: all.length,
    base: cases.length,
    winsAll: countWins(all),
    wins: countWins(cases),
    priceTypes: countPriceTypes(cases),
    revenueBasis: countRevenueBasis(cases),
    sectors: countSectors(cases, sectorLabels),
    triggers: countTriggers(cases),
    combos: findCombos(cases, sectorLabels),
    recent: recentChangeStatus(all),
    matrix: { sectors: sectorRows.map((s) => ({ key: s.key, label: s.label })), cells },
  };
}

const PRICE_KEYS = new Set<string>(Object.keys(PRICE_TYPE_LABELS));
const BASIS_KEYS = new Set<string>(Object.keys(REVENUE_BASIS_LABELS));

/** URL の条件を安全に読む。知らない値は無視する（絞り込まない）。 */
export function parsePatternFilter(params: { sector?: string | string[]; price?: string | string[]; basis?: string | string[] }, sectorLabels: Record<string, string>): PatternFilter {
  const one = (v?: string | string[]) => (Array.isArray(v) ? v[0] : v);
  const sector = one(params.sector), price = one(params.price), basis = one(params.basis);
  const filter: PatternFilter = {};
  if (sector && sector in sectorLabels) filter.sector = sector;
  if (price && PRICE_KEYS.has(price)) filter.priceType = price as PriceType;
  if (basis && BASIS_KEYS.has(basis)) filter.revenueBasis = basis as RevenueBasis;
  return filter;
}
