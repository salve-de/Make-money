import type { Metadata } from 'next';
import { GlobalHeader } from '@/platform/components/navigation/GlobalHeader';
import { VerifyRevenueView } from '@/platform/components/verify/VerifyRevenueView';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: '決済データで売上を確認', robots: { index: false } };

const MAX_ENTITY_ID_LENGTH = 200;

export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ entity?: string | string[] }> }) {
  const raw = (await searchParams).entity;
  const value = (Array.isArray(raw) ? raw[0] : raw)?.trim() ?? '';
  const entityId = value && value.length <= MAX_ENTITY_ID_LENGTH ? value : null;
  return (
    <div className="flex term-page flex-col bg-term-bg text-term-fg">
      <GlobalHeader currentSection="VERIFY" />
      <main className="w-full flex-1">
        <div className="term-panel-title">
          <span className="term-panel-name">決済データで売上を確認</span>
          <span className="hidden truncate sm:inline">事例の運営者の方向け。Stripeの読み取り専用キーを使います。</span>
        </div>
        <h1 className="sr-only">決済データで売上を確認</h1>
        <VerifyRevenueView entityId={entityId} />
      </main>
    </div>
  );
}
