import type { Metadata } from 'next';

import { MyBusinessSales } from '@/components/marketplace/business/MyBusinessSales';

export const metadata: Metadata = {
  title: '自分の掲載 | 事業の売買 | Make-Money',
  robots: { index: false },
};

export default function MyBusinessSalesPage() {
  return <MyBusinessSales />;
}
