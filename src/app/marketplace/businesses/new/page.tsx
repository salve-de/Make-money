import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import { BusinessSaleEditor } from '@/components/marketplace/business/BusinessSaleEditor';
import { BUSINESS_SALE_ID_PATTERN } from '@/shared/business-sale';

export const metadata: Metadata = {
  title: '事業を掲載 | Make-Money',
  robots: { index: false },
};

/** ?id=<掲載のid> を付けると、自分の既存の掲載の編集になる。 */
export default async function NewBusinessSalePage({ searchParams }: {
  searchParams: Promise<{ id?: string | string[] }>;
}) {
  const { id } = await searchParams;
  if (id !== undefined && (typeof id !== 'string' || !BUSINESS_SALE_ID_PATTERN.test(id))) notFound();
  return <BusinessSaleEditor listingId={id ?? ''} />;
}
