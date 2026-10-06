import type { Metadata } from 'next';

import { ActivityView } from '@/components/marketplace/commerce/ActivityView';
import { MarketplaceTabs } from '@/components/marketplace/business/MarketplaceTabs';
import { GlobalHeader } from '@/platform/components/navigation/GlobalHeader';

export const metadata: Metadata = { title: '取引・紹介 | Make-Money', robots: { index: false } };

export default function MarketplaceActivityPage() {
  return (
    <div className="flex term-page flex-col bg-term-bg text-term-fg">
      <GlobalHeader currentSection="MARKETPLACE" />
      <main className="w-full flex-1">
        <div className="hidden sm:block">
          <div className="term-panel-title">
            <span className="term-panel-name max-lg:hidden">取引・紹介</span>
            <span>自分の掲載、購入、販売、紹介リンクの成果。現在はテスト購入で、実際の請求はありません。</span>
          </div>
        </div>
        <h1 className="sr-only">取引・紹介</h1>
        <MarketplaceTabs active="activity" />
        <ActivityView />
      </main>
    </div>
  );
}
