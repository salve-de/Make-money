'use client';

import Link from 'next/link';
import { LEGAL_PAGE_LINKS } from '@/lib/legal/links';
import { requestConsentReopen } from '@/lib/legal/consent';

/** フッター用の法務リンク集。「同意設定」は、同意の選択をもう一度開く。 */
export function LegalLinks({ className = '' }: { className?: string }) {
  const itemClass = 'inline-flex min-h-11 items-center text-term-sub hover:text-term-fg-strong hover:underline lg:min-h-8';
  return (
    <nav aria-label="法務・お問い合わせ" className={`flex flex-wrap gap-x-4 gap-y-1 text-xs ${className}`.trim()}>
      {LEGAL_PAGE_LINKS.map((link) => (
        <Link key={link.href} href={link.href} className={itemClass}>{link.label}</Link>
      ))}
      <button type="button" onClick={() => requestConsentReopen()} className={`${itemClass} cursor-pointer`}>同意設定</button>
    </nav>
  );
}
