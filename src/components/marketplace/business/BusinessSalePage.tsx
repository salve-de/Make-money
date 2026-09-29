import type { ReactNode } from 'react';

import { GlobalHeader } from '@/platform/components/navigation/GlobalHeader';
import { BusinessSaleNotice } from './BusinessSaleNotice';
import { MarketplaceTabs } from './MarketplaceTabs';

/**
 * 事業の売買の全ページ共通の枠。ヘッダー・パネル見出し・切り替えタブ、
 * そして全ページの下部に出す注意書きをここに固定し、ページごとに付け忘れないようにする。
 */
export function BusinessSalePage({ name, aside, srHeading, children }: {
  name: string;
  aside?: ReactNode;
  /** 画面に見える h1 がないページだけ渡す（読み上げ用の見出し） */
  srHeading?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex term-page flex-col bg-term-bg text-term-fg">
      <GlobalHeader currentSection="BUSINESSES" />
      <main className="w-full flex-1">
        <div className="term-panel-title">
          <span className="term-panel-name">{name}</span>
          {aside}
        </div>
        {srHeading && <h1 className="sr-only">{srHeading}</h1>}
        <MarketplaceTabs active="businesses" />
        {children}
      </main>
      <footer className="border-t border-term-line px-3 py-3">
        <BusinessSaleNotice />
      </footer>
    </div>
  );
}
