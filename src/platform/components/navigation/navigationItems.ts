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
  { id: 'MARKETPLACE', label: 'サービス一覧', href: '/marketplace' },
  { id: 'EXECUTION', label: '実行計画', href: '/execute' },
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
