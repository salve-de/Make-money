import Link from 'next/link';
import React from 'react';
import { isSharedSiteDomain, siteDomain } from '@/lib/verification/site-domain';

/**
 * 出典の下に出す、運営者向けの案内。決済アカウントのサイトと照合できる公式サイトがある事例だけに出す
 * （公式サイトがない・共有サービス上のページだと、確認しても必ず断られるため）。
 */
export function OperatorVerificationNote({ entityId, url }: { entityId: string; url?: string | null }) {
  const domain = siteDomain(url);
  if (!domain || isSharedSiteDomain(domain)) return null;
  return (
    <section aria-label="運営者の方へ" className="border-b border-term-line px-3 py-2 text-xs leading-5 text-term-label">
      <p>
        この事例の運営者の方は、Stripeの読み取り専用キーで実際の売上を確認し、一覧と詳細に「決済確認」と表示できます。キーは保存しません。
      </p>
      <Link
        href={`/verify?entity=${encodeURIComponent(entityId)}`}
        className="mt-1 inline-flex min-h-11 items-center rounded-sm border border-term-line px-3 text-term-fg hover:bg-term-head lg:min-h-8"
      >
        決済データで売上を確認する
      </Link>
    </section>
  );
}
