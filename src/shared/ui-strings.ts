/**
 * 画面のコードが持つ文言の許可リスト。
 * 画面の文字は「fact.text」「印つきの analysis」「metrics・sources を書式化した文字」「この一覧の定数」からだけ作る。
 * scripts/architecture/screen-text.tsx は、fact・analysis・metric・source の要素の外にある文字が
 * ここの値のどれかに一致しなければ失敗にする。{name} は事例名に置き換えて照合する。
 */
import type { AnalysisItem, Measure, MetricOrigin, UnknownItem } from './reader-case';
import type { ReaderFact } from './reader-case';

export const MEASURE_LABELS: Record<Measure, string> = {
  REVENUE: '売上',
  OPERATING_INCOME: '営業利益',
  NET_INCOME: '純利益',
  PROFIT: '利益',
  PRICE: '価格',
  EXIT_VALUE: '売却額',
  FUNDING: '調達額',
  VALUATION: '評価額',
  USERS: '利用者数',
  COST: '費用',
  OTHER: 'その他',
};

export const ORIGIN_LABELS: Record<MetricOrigin, string> = {
  FILED: '提出書類',
  SELF_REPORTED: '本人申告',
  ARTICLE: '記事',
  THIRD_PARTY: '第三者',
  ESTIMATED: '推定',
};

export const UNKNOWN_LABELS: Record<UnknownItem, string> = {
  REVENUE: '売上',
  PROFIT: '利益',
  COST: '費用',
  TEAM: 'チーム',
  CHANNEL: '集客',
  TOOLS: '道具',
  PRICING: '料金',
  FOUNDED: '創業',
  STATUS: '現況',
};

export const ANALYSIS_LABELS: Record<AnalysisItem, string> = {
  HEADLINE: '強い一行',
  STORY: '物語',
  BUSINESS_MODEL: '事業の形',
  PRICING: '料金',
  CUSTOMER: '客',
  CUSTOMER_PAIN: '客の痛み',
  FIRST_CUSTOMERS: '最初の客',
  CHANNELS: '集客経路',
  REVENUE_ESTIMATE: '売上の推定',
  COST_STRUCTURE: '費用',
  TAKE_HOME: '手残り',
  CAPITAL_AND_TEAM: '資本と人数',
  TOOLS: '道具',
  DEPENDENCIES: '依存先',
  LOCK_IN: '客が抜けにくい仕掛け',
  UPFRONT_CASH: '前金',
  REFERRAL: '紹介の報酬',
  INCUMBENT_BLINDSPOT: '大手が手を出せない理由',
  COMPETITION: '競合',
  TIMELINE: '年表',
  WHY_IT_WORKED: '勝因',
  VIABILITY: '今も通用するか',
  PIVOTS: '方向転換',
  FAILURE_CAUSE: '失敗の原因',
  LESSON: '教訓',
};

/** 事実の種類ごとの見出し（表示順）。 */
export const FACT_SECTIONS: Array<{ kind: ReaderFact['kind']; title: string }> = [
  { kind: 'DESCRIPTION', title: '事業内容' },
  { kind: 'PRICING', title: '料金' },
  { kind: 'FOUNDING', title: '創業' },
  { kind: 'TEAM', title: 'チーム' },
  { kind: 'CHANNEL', title: '集客' },
  { kind: 'TOOL', title: '道具' },
  { kind: 'EVENT', title: '出来事' },
  { kind: 'EXIT', title: '売却' },
  { kind: 'FUNDING', title: '調達' },
  { kind: 'OTHER', title: 'その他' },
];

export const UI = {
  // 詳細の見出し・列名
  SECTION_METRICS: '数値',
  SECTION_SOURCES: '出典',
  SECTION_ANALYSIS: 'アナリストの推測',
  ANALYSIS_MARK: '推測',
  SECTION_EVIDENCE: '推測の計算・前提と根拠',
  ANALYSIS_FORMULA_PREFIX: '計算・前提: ',
  ANALYSIS_BASIS_PREFIX: '根拠: ',
  GROUP_MONEY: 'どう稼ぐか',
  GROUP_CUSTOMERS: '誰から取るか',
  GROUP_EDGE: 'なぜ勝てたか',
  GROUP_NOW: '今やると・経緯',
  SECTION_DETAILS: '根拠・出典・数値の一覧',
  COL_MEASURE: '項目',
  COL_PERIOD: '期間',
  METRIC_STATED_AT_SUFFIX: '時点の表示',
  COL_AMOUNT: '金額',
  COL_ORIGIN: '由来',
  UNKNOWN_PREFIX: '未確認: ',
  UNKNOWN_JOINER: '・',
  ESTIMATED_MARK: '推定',
  NO_READER: 'この事例の詳細は準備中です。',
  DETAIL_LOADING: '詳細を読み込んでいます…',
  DETAIL_LOAD_FAILED: '詳細の読み込みに失敗しました。',
  DETAIL_RELOAD: '再読み込み',
  // ヘッダー・操作
  TAB_LEDGER: '概要・数値',
  TAB_AUDIT: 'メモ',
  TABS_LABEL: '事例の表示内容',
  ACTIONS_LABEL: '事例の操作',
  OFFICIAL_SITE: '公式サイト',
  OFFICIAL_SITE_ARIA: '{name}の公式サイトを新しいタブで開く',
  PLAN: '計画を作成',
  PLAN_ARIA: '{name}をもとに計画を作成',
  SAVE: '保存',
  SAVED: '保存済み',
  SAVE_ARIA: '{name}を保存',
  UNSAVE_ARIA: '{name}の保存を解除',
  SHARE: '共有',
  SHARE_ARIA: 'この事例を共有',
  MORE_ARIA: 'その他の事例操作',
  CLOSE: '閉じる',
  CLOSE_TITLE: '閉じる (Esc)',
  CLOSE_INSPECTOR_ARIA: '企業事例インスペクターを閉じる',
  INSPECTOR_ARIA: '{name}の企業事例インスペクター',
  PREV: '前へ',
  NEXT: '次へ',
  PREV_ARIA: '前の事例',
  NEXT_ARIA: '次の事例',
  APPROVE: '収集事例を承認',
  BACK_TO_LIST: '◀ 一覧',
  BACK_TO_LIST_ARIA: '一覧へ戻る',
  DETAIL_PANEL: '詳細',
  SAVED_SHORT: '保存済',
  COMPARE: '比較',
  COMPARE_ACTIVE: '比較中',
  COMPARE_ADD: '比較に追加',
  COMPARE_REMOVE: '比較から外す',
  COMPARE_FULL: '比較は4件までです',
  COMPARE_ADD_ARIA: '{name}を比較に追加',
  COMPARE_REMOVE_ARIA: '{name}を比較から外す',
  PREV_SHORT: '◀ 前',
  NEXT_SHORT: '次 ▶',
  CLOSE_MARK: '×',
  TAB_LEDGER_SHORT: '概要',
  TAB_AUDIT_SHORT: 'メモ',
  // 分析メモ（利用者が書く欄）
  NOTE: '分析メモ',
  NOTE_HAZARD: '撤退事例のメモ',
  NOTE_PLACEHOLDER: 'この事例についての自分用メモ',
  NOTE_AI: '事例データをAIで分析する',
  NOTE_AI_HAZARD: 'この事例をAIで分析する',
  NOTE_STATUS_LOADING: '読み込み中',
  NOTE_STATUS_SAVED: 'アカウントに保存済み',
  NOTE_STATUS_LOCAL: 'このブラウザだけに保存',
  NOTE_STATUS_SAVING: '保存中',
  NOTE_STATUS_ERROR: '未保存・再入力で再試行',
  // 一覧
  LIST_REVENUE_UNKNOWN: '未確認',
  LIST_COL_CASE: '企業・事業内容',
  LIST_COL_REVENUE: '売上',
  LIST_COL_PROFIT: '営業利益',
  LIST_COL_REVENUE_PROFIT: '売上・営業利益',
  // 一覧（端末型の表・スマホの行）
  LIST_TITLE: '事例一覧',
  LIST_NO_CONDITIONS: '条件なし',
  LIST_COL_INDEX: '#',
  LIST_COL_NAME: '事例',
  LIST_COL_SUMMARY: '概要',
  LIST_COL_SECTOR: '分野',
  LIST_COL_ORIGIN: '由来',
  LIST_COL_AMOUNT: '金額',
  LIST_EMPTY: '条件に合う事例がありません。条件を減らすか、検索語を変えてください。',
  VERIFIED_MARK: '決済確認',
  VERIFIED_MARK_TITLE: '運営者の決済データ（Stripe）で売上を確認済み',
  OPEN_CASE_ARIA: '{name}の事例を開く',
  // 探すの詳細・AIへの質問・計画の参考事例
  DETAIL_CLOSE_ARIA: '詳細を閉じる',
  ASK_TITLE: 'この事例について質問',
  ASK_Q1: '収益の仕組み',
  ASK_Q2: '成立条件',
  ASK_Q3: '顧客の獲得',
  ASK_Q4: '自分への応用',
  ASK_LOGIN: 'Googleでログインして質問する',
  ASK_INPUT_ARIA: '事例についての質問',
  ASK_PLACEHOLDER: '例：この価格設定が成り立つ条件は？',
  ASK_SUBMIT: '聞く',
  CASE_DETAIL: '事例の詳細',
  CONSIDER: '事業を検討',
  REF_CASE: '参考事例: {name}',
  VIEW_CASE: '事例の詳細を見る',
} as const;

export const SECTOR_LABELS: Record<string, string> = {
  AI_AUTOMATION: 'AI',
  NICHE_SAAS: 'ソフトウェア',
  MONOPOLY_MFG: '製造',
  CONTENT_MEDIA: 'メディア',
  PHYSICAL_ASSET: '物販・不動産',
  FINTECH_INFRA: '金融・決済',
  LOCAL_SERVICES: '地域サービス',
  UNKNOWN: '分類未確認',
};

/** 事例の分野（名前の横の札）。事業を説明する一文の語尾から決める。 */
export const GENRE_LABELS = {
  APP: 'アプリ',
  EXTENSION: '拡張機能',
  API: 'API・基盤',
  SOFTWARE: 'SaaS・ツール',
  AI: 'AI',
  SHOP: '通販',
  SITE: 'Webサイト',
  AGENCY: '代理店・受託',
} as const;

const TEMPLATE = /\{name\}/;

/** 許可リスト（{name} を含む文言は事例名を入れて照合する）。 */
export function allowedUiTexts(entityName: string): Set<string> {
  const out = new Set<string>();
  const add = (s: string) => { const v = s.replace(/\{name\}/g, entityName).trim(); if (v) out.add(v); };
  for (const v of Object.values(UI)) add(v);
  for (const v of Object.values(MEASURE_LABELS)) add(v);
  for (const v of Object.values(ORIGIN_LABELS)) add(v);
  for (const v of Object.values(UNKNOWN_LABELS)) add(v);
  for (const v of Object.values(ANALYSIS_LABELS)) add(v);
  for (const s of FACT_SECTIONS) add(s.title);
  for (const v of Object.values(SECTOR_LABELS)) add(v);
  for (const v of Object.values(GENRE_LABELS)) add(v);
  out.add(entityName);
  return out;
}

/** 「未確認: 売上・利益」のような、許可リストの語だけでできた行か。 */
export function isUnknownsLine(text: string): boolean {
  if (!text.startsWith(UI.UNKNOWN_PREFIX)) return false;
  const labels = new Set<string>(Object.values(UNKNOWN_LABELS));
  return text.slice(UI.UNKNOWN_PREFIX.length).split(UI.UNKNOWN_JOINER).every((l) => labels.has(l));
}

export function uiFormat(template: string, name: string): string {
  return TEMPLATE.test(template) ? template.replace(/\{name\}/g, name) : template;
}
