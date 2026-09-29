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
  { id: 'DISCOVER', label: '発見', href: '/discover' },
  { id: 'RADAR', label: '市場動向', href: '/radar' },
  { id: 'ARCHETYPES', label: '事業パターン', href: '/?mode=ARCHETYPES' },
  { id: 'PLAYBOOK', label: '手口と道具', href: '/playbook' },
  { id: 'SYNTHESIS', label: '事業検討', href: '/?mode=SYNTHESIS' },
];

/** 「その他」の中身 */
export const SECONDARY_NAV_ITEMS: NavItem[] = [
  { id: 'COMPARE', label: '事例の比較', href: '/compare' },
  { id: 'ALERTS', label: '保存した条件', href: '/alerts' },
  { id: 'BUSINESSES', label: '事業の売買', href: '/marketplace/businesses' },
  { id: 'MARKETPLACE', label: 'サービス一覧', href: '/marketplace' },
  { id: 'EXECUTION', label: '実行計画', href: '/execute' },
];

/** スマホの引き出しメニュー。下のタブ（事例・発見・市場・保存）に無い画面を、使う場面ごとに分ける */
export interface MenuGroup {
  label: string;
  items: Array<NavItem & { hint: string }>;
}

export const MOBILE_MENU_GROUPS: MenuGroup[] = [
  {
    label: '調べる',
    items: [
      { id: 'ARCHETYPES', label: '事業パターン', href: '/?mode=ARCHETYPES', hint: '事例から見えた事業の型' },
      { id: 'PLAYBOOK', label: '手口と道具', href: '/playbook', hint: '使われた道具・失敗と見直し' },
      { id: 'COMPARE', label: '事例の比較', href: '/compare', hint: '成功と失敗を並べて見る' },
    ],
  },
  {
    label: '自分の記録',
    items: [
      { id: 'ALERTS', label: '保存した条件', href: '/alerts', hint: '新着をメールで受け取る' },
      { id: 'EXECUTION', label: '実行計画', href: '/execute', hint: '保存した計画の進み具合' },
    ],
  },
  {
    label: '売り買い',
    items: [
      { id: 'BUSINESSES', label: '事業の売買', href: '/marketplace/businesses', hint: '小さな事業の売り出し' },
      { id: 'MARKETPLACE', label: 'サービス一覧', href: '/marketplace', hint: '掲載されたサービス' },
    ],
  },
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
