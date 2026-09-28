'use client';

import { entityDescription } from '@/platform/utils/entityDescription';
import { useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { AuthModal } from '@/components/auth/AuthModal';
import { SubmissionForm } from '@/components/terminal/SubmissionForm';
import { WeeklyNewsletterSection } from '@/components/terminal/WeeklyNewsletterSection';
import { useAuth } from '@/context/AuthContext';
import { formatYen } from '@/platform/utils/moneyDisplay';
import { GlobalHeader } from '@/platform/components/navigation/GlobalHeader';
import type { FinancialEntity } from '@/shared/terminal';


function formatMonthlyRevenue(entity: FinancialEntity): string {
  if (entity.pnl.isRevenueUnconfirmed || entity.pnl.financialStatus === 'UNAVAILABLE') {
    return entity.pnl.revenueLabel || '未確認';
  }
  return formatYen(entity.pnl.monthlyRevenue, { approx: entity.pnl.financialStatus === 'ESTIMATED' });
}

function financialStatusLabel(entity: FinancialEntity): string {
  if (entity.pnl.isRevenueUnconfirmed || entity.pnl.financialStatus === 'UNAVAILABLE') return '未確認';
  switch (entity.pnl.financialStatus) {
    case 'VERIFIED': return '一次資料';
    case 'REPORTED': return '報告値';
    case 'ESTIMATED': return '推計';
    case 'POST_MORTEM': return '事後記録';
    default: return '根拠未登録';
  }
}

function teamSizeLabel(entity: FinancialEntity): string {
  const operations = entity.operations;
  if (!operations || operations.isTeamSizeUnconfirmed || operations.teamSize == null) return '未確認';
  return `${operations.teamSize.toLocaleString()}人`;
}

const SAMPLE_GRID = 'md:grid-cols-[minmax(0,1.1fr)_minmax(0,2fr)_120px_90px_90px_110px]';

export default function WelcomeClient({
  entities,
  publishedCount,
  collectedCount,
}: {
  entities: FinancialEntity[];
  publishedCount: number;
  collectedCount: number;
}) {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const { user } = useAuth();
  const examples = entities.filter((entity) => ['ent_photoai', 'ent_keyence'].includes(entity.id));
  const btn = 'inline-flex min-h-11 items-center rounded-sm border px-4 text-sm lg:min-h-8 lg:px-3';

  return (
    <div className="min-h-screen bg-term-bg text-term-fg">
      <GlobalHeader
        currentSection="WELCOME"
        rightContent={user ? (
          <span className="max-w-40 truncate text-sm text-term-sub">{user.email}</span>
        ) : (
          <button
            type="button"
            onClick={() => setIsAuthModalOpen(true)}
            className="min-h-11 px-3 text-sm text-term-sub hover:text-term-fg-strong"
          >
            ログイン
          </button>
        )}
      />

      <main>
        <section aria-labelledby="welcome-title" className="border-b border-term-line">
          <div className="term-panel-title"><span className="term-panel-name">事業事例データベース</span></div>
          <div className="grid gap-4 px-3 py-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:gap-8">
            <div>
              <h1 id="welcome-title" className="text-xl font-semibold leading-snug text-term-fg-strong sm:text-2xl">
                事業の売上・やり方・出典を、事例ごとに一覧で確認できます
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-term-sub">
                登録された事業事例について、売上や利益、収益の仕組み、使っているツール、初期の顧客獲得の方法を、出典と対象時期つきで並べています。確認できていない数値は「未確認」と表示し、推定は「約」を付けています。
              </p>
              <form action="/" method="get" role="search" className="mt-3 flex max-w-xl items-center gap-2">
                <div className="relative min-w-0 flex-1">
                  <Search aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-term-label" />
                  <label htmlFor="welcome-company-search" className="sr-only">会社名・ティッカー・事業の特徴で検索</label>
                  <input
                    id="welcome-company-search"
                    name="q"
                    type="search"
                    autoComplete="off"
                    enterKeyHint="search"
                    placeholder="会社名・ティッカー・事業の特徴で検索"
                    className="h-11 w-full rounded-sm border border-term-line bg-term-bg pl-9 pr-3 text-sm text-term-fg-strong outline-none placeholder:text-term-dim focus:border-term-accent lg:h-8"
                  />
                </div>
                <button type="submit" className={`${btn} shrink-0 border-term-accent text-term-accent hover:bg-term-head`}>検索</button>
              </form>
            </div>
            <dl className="grid grid-cols-2 self-start border border-term-line">
              <div className="border-b border-r border-term-line px-3 py-2">
                <dt className="text-xs text-term-label">公開している事例</dt>
                <dd className="term-num text-xl text-term-fg-strong">{publishedCount.toLocaleString('ja-JP')}<span className="ml-1 text-xs text-term-label">件</span></dd>
              </div>
              <div className="border-b border-term-line px-3 py-2">
                <dt className="text-xs text-term-label">収集済みの事例</dt>
                <dd className="term-num text-xl text-term-fg-strong">{collectedCount.toLocaleString('ja-JP')}<span className="ml-1 text-xs text-term-label">件</span></dd>
              </div>
              <div className="col-span-2 px-3 py-2 text-xs leading-5 text-term-label">
                収集済みのうち、出典の確認が済んだものを公開しています。
              </div>
            </dl>
          </div>
        </section>

        <section aria-labelledby="welcome-picks" className="border-b border-term-line">
          <div className="term-panel-title">
            <h2 id="welcome-picks" className="term-panel-name">事例ピックアップ</h2>
            <Link href="/" className="ml-auto inline-flex min-h-6 items-center text-term-select-fg hover:text-term-fg-strong">全件を見る</Link>
          </div>

          {examples.length > 0 ? (
            <div>
              <div className={`hidden h-[26px] items-center gap-3 border-b border-term-line bg-term-head px-3 text-xs text-term-label md:grid ${SAMPLE_GRID}`}>
                <span>事例</span><span>事業内容</span><span className="text-right">売上（月額換算）</span><span className="text-right">運営規模</span><span>資料区分</span><span>対象時期</span>
              </div>
              {examples.map((entity, index) => {
                const status = financialStatusLabel(entity);
                return (
                  <Link
                    key={entity.id}
                    href={`/?entity=${encodeURIComponent(entity.id)}`}
                    className={`grid min-h-11 grid-cols-1 gap-x-3 border-b border-term-line-soft px-3 py-2 text-sm hover:bg-term-select md:min-h-[29px] md:items-center md:py-1 ${SAMPLE_GRID} ${index % 2 ? 'bg-term-row-alt' : ''}`}
                  >
                    <span className="font-semibold text-term-fg-strong">{entity.name}</span>
                    <span className="line-clamp-2 text-term-sub md:line-clamp-1">{entityDescription(entity)}</span>
                    <span className="term-num text-term-fg-strong md:text-right"><span className="mr-2 text-xs text-term-label md:hidden">売上（月額換算）</span>{formatMonthlyRevenue(entity)}</span>
                    <span className="term-num text-term-fg md:text-right"><span className="mr-2 text-xs text-term-label md:hidden">運営規模</span>{teamSizeLabel(entity)}</span>
                    <span className={`text-xs md:text-sm ${status === '推計' ? 'text-term-accent' : status === '未確認' ? 'text-term-dim' : 'text-term-muted'}`}>{status}</span>
                    <span className="term-num text-xs text-term-label md:text-sm">{entity.pnl.dataSnapshotPeriod || '時点未登録'}</span>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="px-3 py-4 text-sm">
              <p className="text-term-fg-strong">事例を読み込めませんでした。</p>
              <p className="mt-1 text-term-sub">事例一覧から登録内容を確認してください。</p>
            </div>
          )}
        </section>

        <section aria-label="更新の受け取りと事例の投稿" className="grid lg:grid-cols-2">
          <details className="border-b border-term-line lg:border-r">
            <summary className="flex min-h-11 cursor-pointer items-center px-3 text-sm text-term-fg hover:bg-term-head">新着をメールで受け取る</summary>
            <div className="border-t border-term-line"><WeeklyNewsletterSection /></div>
          </details>
          <details className="border-b border-term-line">
            <summary className="flex min-h-11 cursor-pointer items-center px-3 text-sm text-term-fg hover:bg-term-head">事例を投稿する</summary>
            <div className="border-t border-term-line"><SubmissionForm /></div>
          </details>
        </section>
      </main>

      <footer className="px-3 py-4">
        <div className="flex flex-col gap-3 text-sm text-term-label sm:flex-row sm:items-center sm:justify-between">
          <span>Make Money</span>
          <nav aria-label="フッターナビゲーション" className="flex flex-wrap gap-x-5">
            <Link href="/" className="inline-flex min-h-11 items-center hover:text-term-fg-strong">事例一覧</Link>
            {!user && <button type="button" onClick={() => setIsAuthModalOpen(true)} className="min-h-11 text-left hover:text-term-fg-strong">ログイン</button>}
          </nav>
        </div>
      </footer>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} defaultMode="signin" />
    </div>
  );
}
