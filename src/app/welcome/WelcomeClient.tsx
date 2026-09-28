'use client';

import { entityDescription } from '@/platform/utils/entityDescription';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Search } from 'lucide-react';
import { AuthModal } from '@/components/auth/AuthModal';
import { SubmissionForm } from '@/components/terminal/SubmissionForm';
import { WeeklyNewsletterSection } from '@/components/terminal/WeeklyNewsletterSection';
import { useAuth } from '@/context/AuthContext';
import { GlobalHeader } from '@/platform/components/navigation/GlobalHeader';
import type { FinancialEntity } from '@/shared/terminal';


function formatMonthlyRevenue(entity: FinancialEntity): string {
  if (entity.pnl.isRevenueUnconfirmed || entity.pnl.financialStatus === 'UNAVAILABLE') {
    return entity.pnl.revenueLabel || '未確認';
  }
  const yen = entity.pnl.monthlyRevenue;
  if (yen >= 100_000_000) return `¥${(yen / 100_000_000).toFixed(1)}億`;
  if (yen >= 10_000) return `¥${Math.round(yen / 10_000)}万`;
  return `¥${yen.toLocaleString()}`;
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

export default function WelcomeClient({ entities }: { entities: FinancialEntity[] }) {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const { user } = useAuth();
  const examples = entities.filter((entity) => ['ent_photoai', 'ent_keyence'].includes(entity.id));

  return (
    <div className="min-h-screen bg-background text-foreground">
      <GlobalHeader
        currentSection="WELCOME"
        rightContent={user ? (
          <span className="max-w-40 truncate text-sm text-zinc-300">{user.email}</span>
        ) : (
          <button
            type="button"
            onClick={() => setIsAuthModalOpen(true)}
            className="min-h-11 rounded-md px-3 text-sm text-zinc-300 transition-colors hover:bg-white/[0.06] hover:text-white"
          >
            ログイン
          </button>
        )}
      />

      <main>
        <section className="mx-auto max-w-6xl px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(19rem,26rem)] lg:items-center lg:gap-8">
            <div className="max-w-3xl">
              <h1 className="text-lg font-semibold tracking-tight text-white">事業事例データベース</h1>
            </div>
            <div className="space-y-2">
              <form action="/" method="get" role="search" className="flex min-w-0 items-center gap-2 rounded-md border border-white/[0.16] bg-surface px-3 focus-within:border-accent/70 focus-within:ring-2 focus-within:ring-accent/20">
                <Search aria-hidden="true" className="h-4 w-4 shrink-0 text-zinc-400" />
                <label htmlFor="welcome-company-search" className="sr-only">会社名・ティッカー・事業の特徴で検索</label>
                <input
                  id="welcome-company-search"
                  name="q"
                  type="search"
                  autoComplete="off"
                  enterKeyHint="search"
                  placeholder="会社名・ティッカー・事業の特徴で検索"
                  className="min-h-11 min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-zinc-400"
                />
                <button type="submit" className="min-h-9 shrink-0 rounded px-3 text-sm font-medium text-accent-strong hover:bg-white/[0.06] hover:text-white">
                  検索
                </button>
              </form>
            </div>
          </div>

        </section>

        <section className="border-y border-white/[0.12] bg-surface/70">
          <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-zinc-200">事例ピックアップ</h2>
              <Link href="/" className="inline-flex min-h-10 items-center gap-2 text-sm text-accent-strong hover:text-white">
                全件を見る <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            </div>

          {examples.length > 0 ? (
            <div className="mt-2 grid gap-3 md:grid-cols-2">
              {examples.map((entity) => (
                <Link
                  key={entity.id}
                  href={`/?entity=${encodeURIComponent(entity.id)}`}
                  className="group rounded-lg border border-white/[0.16] bg-background p-4 transition-colors hover:border-accent/55 hover:bg-surface-raised sm:p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-white">{entity.name}</h3>
                      <p className="mt-1 line-clamp-2 text-sm leading-5 text-zinc-300">{entityDescription(entity)}</p>
                    </div>
                    <ArrowRight aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-zinc-500 transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
                  </div>
                  <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-white/[0.12] pt-3">
                    <div>
                      <dt className="text-xs text-zinc-400">売上（月額換算）</dt>
                      <dd className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-zinc-100">{formatMonthlyRevenue(entity)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-zinc-400">運営規模</dt>
                      <dd className="mt-0.5 text-sm text-zinc-100">{teamSizeLabel(entity)}</dd>
                    </div>
                  </dl>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs">
                    <span className={
                      entity.pnl.financialStatus === 'ESTIMATED' ? 'text-warning'
                        : entity.pnl.financialStatus === 'VERIFIED' ? 'text-positive'
                          : entity.pnl.financialStatus === 'REPORTED' ? 'text-sky-200'
                            : entity.pnl.financialStatus === 'POST_MORTEM' ? 'text-rose-200'
                              : 'text-zinc-300'
                    }>
                      {financialStatusLabel(entity)}
                    </span>
                    <span className="text-zinc-400">{entity.pnl.dataSnapshotPeriod || '時点未登録'}</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="mt-6 rounded-lg border border-white/[0.12] bg-surface p-5 text-sm text-zinc-400">
              事例を読み込めませんでした。台帳ページから登録内容をご確認ください。
            </p>
          )}
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl items-start gap-2 px-4 py-4 sm:grid-cols-2 sm:px-6 lg:px-8">
          <details className="rounded-md border border-white/[0.14] bg-surface">
            <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-zinc-300 hover:text-white">新着をメールで受け取る</summary>
            <div className="border-t border-white/[0.1] p-4"><WeeklyNewsletterSection /></div>
          </details>
          <details className="rounded-md border border-white/[0.14] bg-surface">
            <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-zinc-300 hover:text-white">事例を投稿する</summary>
            <div className="border-t border-white/[0.1] p-4"><SubmissionForm /></div>
          </details>
        </section>
      </main>

      <footer className="border-t border-white/[0.1] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 text-sm text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
          <span>Make Money</span>
          <nav aria-label="フッターナビゲーション" className="flex flex-wrap gap-x-5 gap-y-2">
            <Link href="/" className="hover:text-white">事例一覧</Link>
            <Link href="/registry" className="hover:text-white">収集レジストリ</Link>
            {!user && <button type="button" onClick={() => setIsAuthModalOpen(true)} className="text-left hover:text-white">ログイン</button>}
          </nav>
        </div>
      </footer>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} defaultMode="signin" />
    </div>
  );
}
