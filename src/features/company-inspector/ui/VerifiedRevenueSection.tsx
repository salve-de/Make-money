'use client';

import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import type { VerifiedRevenue } from '@/shared/verification';
import { useVerifiedEntityIds } from '@/platform/hooks/useVerifiedEntityIds';
import { readVerifiedRevenue, staleVerificationDays, verifiedRevenueRows } from '@/platform/model/verified-revenue-view';
import { InspectorSectionCard } from './InspectorSectionCard';

type Loaded = { entityId: string; verification: VerifiedRevenue | null };

/**
 * 運営者が決済データ（Stripe）で確認した売上。確認済みの事例だけに出す。
 * 数えられなかった項目は「未確認」と出し、0とは書かない。
 */
export function VerifiedRevenueSection({ entityId }: { entityId: string }) {
  const listed = useVerifiedEntityIds().has(entityId);
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    if (!listed) return;
    const controller = new AbortController();
    fetch(`/api/verification?entity_id=${encodeURIComponent(entityId)}`, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((body: unknown) => setLoaded({ entityId, verification: readVerifiedRevenue((body as { verification?: unknown } | null)?.verification) }))
      .catch(() => {
        if (!controller.signal.aborted) setLoaded({ entityId, verification: null });
      });
    return () => controller.abort();
  }, [entityId, listed]);

  const verification = listed && loaded?.entityId === entityId ? loaded.verification : null;
  if (!verification) return null;
  const staleDays = staleVerificationDays(verification.verifiedAt);

  return (
    <InspectorSectionCard
      id="section-verified-revenue"
      index="02"
      categoryEn="VERIFIED REVENUE"
      titleJa="決済データで確認した売上"
      badge={<span className="text-term-positive">決済確認</span>}
    >
      <dl>
        {verifiedRevenueRows(verification).map((row) => (
          <div key={row.label} className="flex min-h-[30px] items-center justify-between gap-3 border-b border-term-line-soft py-1">
            <dt className="shrink-0 text-xs text-term-label">{row.label}</dt>
            <dd className={`term-num min-w-0 truncate text-right ${row.confirmed ? 'text-term-fg-strong' : 'font-sans text-xs text-term-dim'}`}>{row.value}</dd>
          </div>
        ))}
      </dl>
      {staleDays !== null && (
        <p className="border-b border-term-line-soft py-1.5 text-xs text-term-accent">確認から{staleDays}日たっています。今の売上とは違う可能性があります。</p>
      )}
      <p className="py-1.5 text-xs leading-5 text-term-label">
        運営者が読み取り専用のキーでつないだ決済アカウント（Stripe）の実データです。売上は返金を引いた税込の額で、決済手数料は引いていません。決済アカウントに登録されたサイトと公式サイトの一致で照合しており、運営者本人であることの証明ではありません。
      </p>
      <p className="pb-2 text-xs">
        <Link href={`/verify?entity=${encodeURIComponent(entityId)}`} className="inline-flex min-h-11 items-center text-term-fg underline hover:text-term-fg-strong lg:min-h-0">
          運営者の方: 確認し直す
        </Link>
      </p>
    </InspectorSectionCard>
  );
}
