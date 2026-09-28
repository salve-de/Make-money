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

export const PRO_HREF = '/?pro=1';
export const SAVED_HREF = '/?mode=SYNTHESIS';
