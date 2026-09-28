import { ListingEditor } from '@/components/marketplace/ListingEditor';

export default async function NewMarketplaceListingPage({
  searchParams,
}: {
  searchParams: Promise<{ sessionId?: string; listingId?: string }>;
}) {
  const { sessionId = '', listingId = '' } = await searchParams;
  return <ListingEditor sessionId={sessionId} listingId={listingId} />;
}
