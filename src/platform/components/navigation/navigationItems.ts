import { Bookmark, BellRing, CircleUserRound, GitCompareArrows, Handshake, Package, type LucideIcon } from 'lucide-react';

export type GlobalNavSection =
  | 'LEDGER'
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
  COMPARE: 'LEDGER',
  EXECUTION: 'BUILDER',
  BUSINESSES: 'MARKETPLACE',
};

/** いま開いている画面を含むタブ（5つのタブのどれでもなければ undefined） */
export function tabOfSection(section: GlobalNavSection): GlobalNavSection | undefined {
  const id = TAB_OF_SECTION[section] ?? section;
  return PRIMARY_NAV_ITEMS.some((item) => item.id === id) ? id : undefined;
}

export const PRO_HREF = '/?pro=1';
export const SAVED_HREF = '/?mode=SYNTHESIS';
export const ACCOUNT_PATH = '/account';

export type MenuItemKey = 'SAVED' | 'COMPARE' | 'ALERTS' | 'MY_PRODUCTS' | 'REFERRALS' | 'PRO' | 'ACCOUNT';

export interface MenuItem {
  key: MenuItemKey;
  label: string;
  href: string;
  icon: LucideIcon;
  /** 開いている画面がこの値なら、行を選択中にする（無ければ選択中にならない） */
  section?: GlobalNavSection;
  /** 件数など、行の右に小さく出す値 */
  badge?: string;
}

/**
 * PC の「その他」とスマホの引き出しメニューで共通の、5つのタブに入らない補助機能（ここ1か所が正本）。
 * 実在する画面だけを並べる。実行計画・事業の売買・/finder は入口を出さない。
 */
export const MORE_MENU_ITEMS: MenuItem[] = [
  { key: 'SAVED', label: '保存した事例とメモ', href: SAVED_HREF, icon: Bookmark, section: 'SYNTHESIS' },
  { key: 'COMPARE', label: '比較', href: '/compare', icon: GitCompareArrows, section: 'COMPARE' },
  { key: 'ALERTS', label: '保存した条件', href: '/alerts', icon: BellRing, section: 'ALERTS' },
  { key: 'MY_PRODUCTS', label: '自分の商品', href: '/marketplace/activity#activity-listings', icon: Package },
  { key: 'REFERRALS', label: '紹介と取引', href: '/marketplace/activity#activity-referrals', icon: Handshake },
];

/** ログイン状態で変わる行。ログイン中は「会員設定」、未ログインは「ログイン・新規登録」。ログインの仕組みが無い環境では出さない */
export type AccountMenuState = 'signedIn' | 'signedOut' | 'hidden';

export function accountMenuItem(state: AccountMenuState): MenuItem | null {
  if (state === 'hidden') return null;
  return {
    key: 'ACCOUNT',
    label: state === 'signedIn' ? '会員設定' : 'ログイン・新規登録',
    href: ACCOUNT_PATH,
    icon: CircleUserRound,
    section: 'ACCOUNT',
  };
}

/** PC とスマホで同じ並びのメニュー項目（件数つき・ログイン状態つき） */
export function buildMenuItems(options: { account: AccountMenuState; compareIds?: readonly string[]; compareHref?: string; bookmarkCount?: number }): MenuItem[] {
  const items = MORE_MENU_ITEMS.map((item): MenuItem => {
    if (item.key === 'COMPARE' && options.compareIds && options.compareIds.length > 0) {
      return { ...item, href: options.compareHref ?? item.href, badge: `${options.compareIds.length}件` };
    }
    if (item.key === 'SAVED' && options.bookmarkCount && options.bookmarkCount > 0) {
      return { ...item, badge: `${options.bookmarkCount}件` };
    }
    return item;
  });
  const account = accountMenuItem(options.account);
  return account ? [...items, account] : items;
}

export const LOCAL_MODE_BY_SECTION: Partial<Record<GlobalNavSection, LocalWorkspaceMode>> = {
  LEDGER: 'LEDGER',
  SYNTHESIS: 'SYNTHESIS',
};

/** 規約・ポリシー・特定商取引法の表記（メニューの下部と法務ページで使う） */
export const LEGAL_LINKS = [
  { href: '/legal/terms', label: '利用規約' },
  { href: '/legal/privacy', label: 'プライバシーポリシー' },
  { href: '/legal/tokushoho', label: '特定商取引法に基づく表記' },
  { href: '/legal/contact', label: 'お問い合わせ・削除依頼' },
] as const;

/** スマホのヘッダーに出す、いま開いている画面の名前 */
export const SECTION_TITLES: Record<GlobalNavSection, string> = {
  LEDGER: '事例',
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
