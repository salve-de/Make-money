export const MARKETPLACE_CATEGORIES = [
  'ai_automation',
  'business_tool',
  'media',
  'other',
] as const;

export type MarketplaceCategory = (typeof MARKETPLACE_CATEGORIES)[number];
/**
 * 掲載の状態。掲載者が公開を申請すると pending_review になり、運営者が承認したものだけが published（公開）になる。
 * 掲載者が自分で published にすることはできない。rejected は審査で却下された状態。
 */
export type MarketplaceListingStatus = 'draft' | 'pending_review' | 'published' | 'rejected';

/** 掲載者が API に送れる状態。published・rejected は運営者の審査でだけ付く。 */
export type MarketplaceListingRequestedStatus = 'draft' | 'pending_review';

export const MARKETPLACE_STATUS_LABELS: Record<MarketplaceListingStatus, string> = {
  draft: '下書き',
  pending_review: '審査待ち',
  published: '公開中',
  rejected: '却下',
};

/** 却下理由の最大文字数（DB の CHECK と揃える） */
export const REVIEW_NOTE_MAX_LENGTH = 200;

export const PENDING_REVIEW_NOTICE = '審査待ちです。承認されると公開されます';
export type MarketplaceListingSource = 'builder' | 'external';

export const MARKETPLACE_CATEGORY_LABELS: Record<MarketplaceCategory, string> = {
  ai_automation: 'AI・自動化',
  business_tool: '業務ツール',
  media: 'メディア・コンテンツ',
  other: 'その他',
};

/** Fields visible on a public Make-Money product page. Never includes owner IDs. */
export interface PublicMarketplaceListing {
  slug: string;
  title: string;
  summary: string;
  category: MarketplaceCategory;
  productUrl: string;
  checkoutUrl: string | null;
  priceLabel: string;
  sellerName: string;
  updatedAt: string;
}

export interface OwnedMarketplaceListing extends PublicMarketplaceListing {
  listingId: string;
  sourceType: MarketplaceListingSource;
  sessionId: string | null;
  status: MarketplaceListingStatus;
  /** 却下の理由。掲載者本人にだけ返し、公開側には出さない */
  reviewNote: string | null;
  createdAt: string;
}
