export type GlobalNavSection =
  | 'LEDGER'
  | 'DISCOVER'
  | 'PLAYBOOK'
  | 'RADAR'
  | 'ARCHETYPES'
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
  | 'WELCOME';

export type LocalWorkspaceMode = 'LEDGER' | 'PLAYBOOK' | 'RADAR' | 'ARCHETYPES' | 'SYNTHESIS';

export interface NavItem {
  id: GlobalNavSection;
  label: string;
  href: string;
}

/** PC のファンクションタブ（先頭から 1〜6 キーで開く） */
export const PRIMARY_NAV_ITEMS: NavItem[] = [
  { id: 'LEDGER', label: '事例一覧', href: '/' },
  { id: 'DISCOVER', label: 'ランキング', href: '/discover' },
  { id: 'RADAR', label: '市場動向', href: '/radar' },
  { id: 'ARCHETYPES', label: '事業アイデア', href: '/?mode=ARCHETYPES' },
  { id: 'PLAYBOOK', label: 'やり方とツール', href: '/playbook' },
  { id: 'SYNTHESIS', label: 'アイデア調査', href: '/?mode=SYNTHESIS' },
];

/** 「その他」の中身 */
export const SECONDARY_NAV_ITEMS: NavItem[] = [
  { id: 'COMPARE', label: '事例の比較', href: '/compare' },
  { id: 'ALERTS', label: '保存した条件', href: '/alerts' },
  { id: 'BUSINESSES', label: '事業の売買', href: '/marketplace/businesses' },
  { id: 'MARKETPLACE', label: 'サービス一覧', href: '/marketplace' },
  { id: 'EXECUTION', label: '実行計画', href: '/execute' },
];

/** スマホの引き出しメニュー。下のタブ（事例一覧・ランキング・市場動向・アイデア調査）に無い画面を、よく使う順に並べる */
export const MOBILE_MENU_ITEMS: NavItem[] = [
  { id: 'ARCHETYPES', label: '事業アイデア', href: '/?mode=ARCHETYPES' },
  { id: 'PLAYBOOK', label: 'やり方とツール', href: '/playbook' },
  { id: 'COMPARE', label: '事例の比較', href: '/compare' },
  { id: 'ALERTS', label: '保存した条件', href: '/alerts' },
  { id: 'EXECUTION', label: '実行計画', href: '/execute' },
  { id: 'BUSINESSES', label: '事業の売買', href: '/marketplace/businesses' },
  { id: 'MARKETPLACE', label: 'サービス一覧', href: '/marketplace' },
];

export const LOCAL_MODE_BY_SECTION: Partial<Record<GlobalNavSection, LocalWorkspaceMode>> = {
  LEDGER: 'LEDGER',
  PLAYBOOK: 'PLAYBOOK',
  RADAR: 'RADAR',
  ARCHETYPES: 'ARCHETYPES',
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
  LEDGER: '事例一覧',
  DISCOVER: 'ランキング',
  RADAR: '市場動向',
  ARCHETYPES: '事業アイデア',
  PLAYBOOK: 'やり方とツール',
  SYNTHESIS: 'アイデア調査',
  BUILDER: 'アイデア調査',
  EXECUTION: '実行計画',
  MARKETPLACE: 'サービス一覧',
  BUSINESSES: '事業の売買',
  COMPARE: '事例の比較',
  ALERTS: '保存した条件',
  VERIFY: '売上の確認',
  LEGAL: '規約・表記',
  WELCOME: 'Make Money',
};
