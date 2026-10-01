import Link from 'next/link';
import React from 'react';
import { ChevronRight } from 'lucide-react';
import { isSharedSiteDomain, siteDomain } from '@/lib/verification/site-domain';

/**
 * 出典の下に出す、運営者向けの案内。決済アカウントのサイトと照合できる公式サイトがある事例だけに出す
 * （公式サイトがない・共有サービス上のページだと、確認しても必ず断られるため）。
 */
export function OperatorVerificationNote({ entityId, url }: { entityId: string; url?: string | null }) {
  const domain = siteDomain(url);
  if (!domain || isSharedSiteDomain(domain)) return null;
  return (
    // 閲覧者には関係が薄いので、見出しだけ出して畳んでおく（開けば運営者向けの説明とボタン）
    <details className="group border-b border-term-line text-xs leading-5 text-term-label">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1 px-3 text-term-muted hover:text-term-fg lg:min-h-8 [&::-webkit-details-marker]:hidden">
        <ChevronRight aria-hidden="true" className="h-3.5 w-3.5 transition-transform duration-150 group-open:rotate-90" />
        この事例の運営者の方へ
      </summary>
      <div className="px-3 pb-2">
      <p>
        この事例の運営者の方は、Stripeの読み取り専用キーで実際の売上を確認し、一覧と詳細に「決済確認」と表示できます。キーは保存しません。
      </p>
      <Link
        href={`/verify?entity=${encodeURIComponent(entityId)}`}
        className="mt-1 inline-flex min-h-11 items-center rounded-sm border border-term-line px-3 text-term-fg hover:bg-term-head lg:min-h-8"
      >
        決済データで売上を確認する
      </Link>
      </div>
    </details>
  );
}
