export type GlobalNavSection =
  | 'LEDGER'
  | 'DISCOVER'
  | 'TRENDS'
  | 'SYNTHESIS'
  | 'BUILDER'
  | 'EXECUTION'
  | 'MARKETPLACE'
  | 'BUSINESSES'
  | 'COMPARE'
  | 'ALERTS'
  /** 見出しに項目を持たない画面（運営者向けの売上確認・法務ページ） */
  | 'VERIFY'
  | 'LEGAL'
  | 'WELCOME'
  | 'ACCOUNT';

export type LocalWorkspaceMode = 'LEDGER' | 'SYNTHESIS';

export interface NavItem {
  id: GlobalNavSection;
  label: string;
  href: string;
}

/**
 * 上のタブと下のタブで共通の5つ（先頭から数字キー 1〜5 で開く）。
 * 「事例 → 傾向 → 事業検討 → 作る → 市場」の順に、次にやることが自然につながる並び。
 */
export const PRIMARY_NAV_ITEMS: NavItem[] = [
  { id: 'LEDGER', label: '事例', href: '/' },
  { id: 'TRENDS', label: '傾向', href: '/trends' },
  { id: 'SYNTHESIS', label: '事業検討', href: '/?mode=SYNTHESIS' },
  { id: 'BUILDER', label: '作る', href: '/build' },
  { id: 'MARKETPLACE', label: '市場', href: '/marketplace' },
];

/**
 * 5つのタブに入らない画面が、どのタブの中にあるか。
 * 発見は事例の中、実行計画は作る、事業の売買は市場の中の画面として扱う（入口は出さず、直接のURLだけ残す）。
 */
export const TAB_OF_SECTION: Partial<Record<GlobalNavSection, GlobalNavSection>> = {
  DISCOVER: 'LEDGER',
  COMPARE: 'LEDGER',
  EXECUTION: 'BUILDER',
  BUSINESSES: 'MARKETPLACE',
};

/** いま開いている画面を含むタブ（5つのタブのどれでもなければ undefined） */
export function tabOfSection(section: GlobalNavSection): GlobalNavSection | undefined {
  const id = TAB_OF_SECTION[section] ?? section;
  return PRIMARY_NAV_ITEMS.some((item) => item.id === id) ? id : undefined;
}

/** PC の「その他」の中身（5つのタブに入れない補助の画面） */
export const SECONDARY_NAV_ITEMS: NavItem[] = [
  { id: 'ALERTS', label: '保存した条件', href: '/alerts' },
];

/** スマホの引き出しメニュー。下のタブ（5つ）に無い画面だけを並べる。規約・表記は下部に別枠で出す */
export const MOBILE_MENU_ITEMS: NavItem[] = [
  { id: 'ALERTS', label: '保存した条件', href: '/alerts' },
];

export const LOCAL_MODE_BY_SECTION: Partial<Record<GlobalNavSection, LocalWorkspaceMode>> = {
  LEDGER: 'LEDGER',
  SYNTHESIS: 'SYNTHESIS',
};

/** 規約・ポリシー・特定商取引法の表記（メニューの下部と法務ページで使う） */
export const LEGAL_LINKS = [
  { href: '/legal/terms', label: '利用規約' },
  { href: '/legal/privacy', label: 'プライバシーポリシー' },
  { href: '/legal/tokushoho', label: '特定商取引法に基づく表記' },
] as const;

export const PRO_HREF = '/?pro=1';
export const SAVED_HREF = '/?mode=SYNTHESIS';

/** スマホのヘッダーに出す、いま開いている画面の名前 */
export const SECTION_TITLES: Record<GlobalNavSection, string> = {
  LEDGER: '事例',
  DISCOVER: '事例を探す',
  TRENDS: '傾向',
  SYNTHESIS: '事業検討',
  BUILDER: '作る',
  EXECUTION: '実行計画',
  MARKETPLACE: '市場',
  BUSINESSES: '事業の売買',
  COMPARE: '事例の比較',
  ALERTS: '保存した条件',
  VERIFY: '売上の確認',
  LEGAL: '規約・表記',
  WELCOME: 'Make Money',
  ACCOUNT: '会員設定',
};
