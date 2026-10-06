import Link from 'next/link';

/** マーケット内の切り替え。「製品」（既存の掲載一覧）と「事業の売買」。 */
export function MarketplaceTabs({ active }: { active: 'products' | 'businesses' | 'activity' }) {
  const tabClass = (isActive: boolean) =>
    `flex min-h-11 items-center border-r border-term-line px-4 text-sm lg:min-h-8 lg:text-[13px] ${
      isActive
        ? 'bg-[var(--surface-overlay)] text-term-fg-strong shadow-[inset_0_-2px_0_var(--term-accent)]'
        : 'text-term-muted hover:bg-term-head hover:text-term-fg'
    }`;
  return (
    <nav aria-label="マーケットの種類" className="flex border-b border-term-line bg-term-panel">
      <Link href="/marketplace" aria-current={active === 'products' ? 'page' : undefined} className={tabClass(active === 'products')}>
        製品
      </Link>
      <Link href="/marketplace/businesses" aria-current={active === 'businesses' ? 'page' : undefined} className={tabClass(active === 'businesses')}>
        事業の売買
      </Link>
      <Link href="/marketplace/activity" aria-current={active === 'activity' ? 'page' : undefined} className={tabClass(active === 'activity')}>
        取引・紹介
      </Link>
    </nav>
  );
}
