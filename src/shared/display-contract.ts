/**
 * 表示契約: 事例の詳細画面に出す項目と、それぞれが「何で埋まったら出せるか」。収集（事例担当の AGENT_BRIEF）・取り込み・診断・画面が同じこの1ファイルを見る。
 * 説明と運用は docs/pipeline/DISPLAY_CONTRACT.md。項目の順は画面で読む順。
 *
 * 埋まり方は、事実（facts の kind）・数値（metrics の measure）・推論（analysis の item）のどれか1つで足りる。
 * 推論は画面で「推測」と明記して出す（OWNER_INTENT 3章）。事実が無い欄を推論で埋めるのは可、数字を作るのは不可。
 * 出典と画像は reader の外（出典の利用条件・画像台帳）も見るので、ここでは reader 内で判定できる部分だけを持つ。
 */
import type { AnalysisItem, ReaderCase } from './reader-case';

type FactKind = ReaderCase['facts'][number]['kind'];
type Measure = ReaderCase['metrics'][number]['measure'];

export interface DisplayItem {
  key: string;
  /** 画面・指示文で使う名前（オーナーの言い方のまま） */
  label: string;
  /** 収集側への一行の指示（何を集めれば埋まるか） */
  collect: string;
  facts?: readonly FactKind[];
  measures?: readonly Measure[];
  analysis?: readonly AnalysisItem[];
  /** 事実・数値・推論の全てを満たす必要がある組み（例: 誰が何を ＋ いくらで） */
  allOf?: readonly { facts?: readonly FactKind[]; measures?: readonly Measure[]; analysis?: readonly AnalysisItem[] }[];
}

export const DISPLAY_CONTRACT_VERSION = 'display-contract-v1';

export const DISPLAY_ITEMS: readonly DisplayItem[] = [
  { key: 'LEAD', label: 'リード', analysis: ['HEADLINE'],
    collect: '人・行動・結果が1〜2文で浮かぶ一文。数字は出典にある値だけ（幅・時点不詳の詰め込み・製品説明は不可）。src/shared/lead-standard.ts の checkLead に通すこと' },
  { key: 'KEY_NUMBER', label: '主要数字', measures: ['REVENUE', 'OPERATING_INCOME', 'NET_INCOME', 'PROFIT', 'EXIT_VALUE', 'USERS'],
    collect: '売上・利益・利用者数・売却額のどれか1つを、出典・時点つきの数値（metrics）で' },
  { key: 'WHO_WHAT_PRICE', label: '誰が何をいくらで',
    allOf: [{ facts: ['DESCRIPTION'], analysis: ['BUSINESS_MODEL'] }, { facts: ['PRICING'], measures: ['PRICE'], analysis: ['PRICING'] }],
    collect: '誰に何を売るか（DESCRIPTION の事実）と、料金（PRICING の事実か PRICE の数値。無ければ料金の推論）' },
  { key: 'CUSTOMER_PAIN', label: '客の痛み', analysis: ['CUSTOMER_PAIN', 'CUSTOMER'],
    collect: '客が何に困ってお金を払うのか。客の声・事例ページ・レビューの出典があれば事実で' },
  { key: 'START_AND_FIRST_CUSTOMERS', label: '始め方と最初の客', facts: ['FOUNDING'], analysis: ['FIRST_CUSTOMERS', 'STORY'],
    collect: 'いつ・誰が・なぜ始めたか（FOUNDING）と、最初の客をどこで得たか' },
  { key: 'MONEY_AND_TIME', label: '売上・費用・利益と時期', measures: ['REVENUE', 'OPERATING_INCOME', 'NET_INCOME', 'PROFIT', 'COST'], analysis: ['REVENUE_ESTIMATE', 'COST_STRUCTURE', 'TAKE_HOME'],
    collect: '売上・費用・利益の数値を期間（月・年・累計）と時点つきで。無ければ式つきの推定' },
  { key: 'OPERATIONS', label: '運営', facts: ['TEAM', 'TOOL', 'CHANNEL'], analysis: ['CAPITAL_AND_TEAM', 'TOOLS', 'CHANNELS'],
    collect: '人数・道具・集客の経路のどれか（TEAM / TOOL / CHANNEL の事実）' },
  { key: 'TURNS', label: '転機・失敗・工夫', facts: ['EVENT', 'EXIT', 'FUNDING'], analysis: ['PIVOTS', 'FAILURE_CAUSE', 'WHY_IT_WORKED'],
    collect: '転機・失敗・方向転換・売却・資金調達などの出来事（EVENT 等の事実）' },
  { key: 'VIABILITY', label: '今の有効性', analysis: ['VIABILITY', 'TIMELINE'],
    collect: '今も同じやり方が通じるか（いま営業中か・競合・規約や価格の変化）の判断と根拠' },
  { key: 'INTERESTING_FACT', label: '面白い事実', facts: ['OTHER'], analysis: ['INCUMBENT_BLINDSPOT', 'LESSON', 'UPFRONT_CASH', 'REFERRAL', 'LOCK_IN'],
    collect: 'この事例ならではの意外な事実（大手が手を出せない理由・前金・紹介報酬・人質化など）' },
  { key: 'SOURCES', label: '出典',
    collect: '本人・公式・届出の一次情報を優先。利用規約で表示できない紹介サイト（eBiz Facts 等）は使わない。本文が取得できること' },
  { key: 'IMAGE', label: '画像',
    collect: '実際の製品画面（ストアの画面写真 → 公式の製品画面 → アイコンの順）。宣伝バナー・人物写真は不可。出典と権利の判定つき' },
];

const hasAny = (reader: ReaderCase, p: { facts?: readonly FactKind[]; measures?: readonly Measure[]; analysis?: readonly AnalysisItem[] }) =>
  (p.facts?.some((k) => reader.facts.some((f) => f.kind === k)) ?? false) ||
  (p.measures?.some((m) => reader.metrics.some((x) => x.measure === m && x.origin !== 'ESTIMATED')) ?? false) ||
  (p.analysis?.some((a) => reader.analysis.some((x) => x.item === a && x.text.trim())) ?? false);

/** reader の中で判定できる項目の埋まり方。SOURCES は出典の有無だけ、IMAGE は外から渡す（画像台帳） */
export function displayCoverage(reader: ReaderCase, opts: { hasDisplayableImage?: boolean } = {}): { filled: string[]; missing: string[] } {
  const filled: string[] = [];
  const missing: string[] = [];
  for (const item of DISPLAY_ITEMS) {
    let ok: boolean;
    if (item.key === 'SOURCES') ok = reader.sources.length > 0;
    else if (item.key === 'IMAGE') ok = opts.hasDisplayableImage ?? false;
    else if (item.allOf) ok = item.allOf.every((part) => hasAny(reader, part));
    else ok = hasAny(reader, item);
    (ok ? filled : missing).push(item.key);
  }
  return { filled, missing };
}

/**
 * 公開の下限（オーナー指示 2026-10-06: 落とし方のルール）。
 * - 取れなかった項目は、その項目だけ画面から隠す。1項目の欠けで事例全体を止めない（誰が何をいくらで・料金・事業説明も同じ）
 * - リード（LEAD）が無い・基準に落ちた → 事例は出さず「リードを書き直す」で事例担当へ差し戻す（直せない時だけ保留）
 * - 事例全体を保留にするのは、本文の節（BODY_KEYS）が MIN_BODY 個未満の「全体が薄い」時だけ
 * - 出典が1件も無い事例は出さない（根拠の無い事実は出さない）。画像は関門（画像の権利・実体）で別に見る
 */
export const BODY_KEYS = ['WHO_WHAT_PRICE', 'KEY_NUMBER', 'CUSTOMER_PAIN', 'START_AND_FIRST_CUSTOMERS', 'MONEY_AND_TIME', 'OPERATIONS', 'TURNS', 'VIABILITY', 'INTERESTING_FACT'] as const;
export const MIN_BODY = 3;
export const LEAD_REWRITE_PREFIX = 'リードを書き直す';
export const THIN_PREFIX = '全体が薄い';

/** 下限に足りない理由。足りていれば空配列。文言の頭で分類する（リードを書き直す／全体が薄い／出典が無い） */
export function displayMinimumProblems(reader: ReaderCase): string[] {
  const { filled } = displayCoverage(reader);
  const have = new Set(filled);
  const problems: string[] = [];
  if (!have.has('LEAD')) problems.push(`${LEAD_REWRITE_PREFIX}:リード（HEADLINE）が無い`);
  if (!have.has('SOURCES')) problems.push('出典が無い');
  const body = BODY_KEYS.filter((k) => have.has(k)).length;
  if (body < MIN_BODY) problems.push(`${THIN_PREFIX}:本文の節が${body}個（${MIN_BODY}個以上必要）`);
  return problems;
}
