// src/config/affiliateLinks.ts
// A8.net等のアフィリエイトリンク・提携URLの集中管理設定
// ※提携完了後にこのファイルのURLを自身のA8アフィリエイトリンクに差し替えるだけで、サイト全体のリンクが一撃で切り替わります。

export interface AffiliateItem {
  id: string;
  name: string;
  category: 'FOUNDATION' | 'TAX_ACCOUNTING' | 'OFFICE_BANK';
  badge: string;
  description: string;
  targetUrl: string;       // 提携後のA8.net等アフィリエイトURL（未提携時は公式URL）
}

export const AFFILIATE_CONFIG: AffiliateItem[] = [
  {
    id: 'freee_incorporation',
    name: 'freee会社設立',
    category: 'FOUNDATION',
    badge: '書類作成0円',
    description: '質問に答えるだけで会社設立書類を自動作成。司法書士不要で費用を最小化。',
    targetUrl: 'https://www.freee.co.jp/launch/' // A8提携後にトラッキングURLへ置換
  },
  {
    id: 'gmo_office',
    name: 'GMOオフィスサポート',
    category: 'OFFICE_BANK',
    badge: '月額660円〜',
    description: '自宅住所を隠して都心一等地の住所で登記可能。郵便物転送付きバーチャルオフィス。',
    targetUrl: 'https://www.gmo-office.com/' // A8提携後に置換
  },
  {
    id: 'moneyforward',
    name: 'マネーフォワード クラウド',
    category: 'TAX_ACCOUNTING',
    badge: '初月無料',
    description: '確定申告・請求書発行・経理帳簿を自動連携。個人事業主〜法人の定番会計SaaS。',
    targetUrl: 'https://biz.moneyforward.com/' // A8提携後に置換
  },
  {
    id: 'gmo_aozora',
    name: 'GMOあおぞらネット銀行',
    category: 'OFFICE_BANK',
    badge: '即日ネット審査',
    description: '創業直後でも開設しやすい法人口座。同行間振込無料・他行振込手数料145円。',
    targetUrl: 'https://gmo-aozora.com/' // A8提携後に置換
  }
];
