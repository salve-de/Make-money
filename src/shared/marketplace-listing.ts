export const MARKETPLACE_CATEGORIES = [
  'ai_automation',
  'business_tool',
  'media',
  'other',
] as const;

export type MarketplaceCategory = (typeof MARKETPLACE_CATEGORIES)[number];
export type MarketplaceListingStatus = 'draft' | 'published';
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
  createdAt: string;
}
