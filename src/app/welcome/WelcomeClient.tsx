'use client';

import { ListDescription, ListMetricCell, ListOriginCell, listMetricsOf } from '@/platform/components/grid/ReaderListCells';
import { UI } from '@/shared/ui-strings';
import { useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Search } from 'lucide-react';
import { AuthModal } from '@/components/auth/AuthModal';
import { SubmissionForm } from '@/components/terminal/SubmissionForm';
import { WeeklyNewsletterSection } from '@/components/terminal/WeeklyNewsletterSection';
import { useAuth } from '@/context/AuthContext';
import { GlobalHeader } from '@/platform/components/navigation/GlobalHeader';
import type { FinancialEntity } from '@/shared/terminal';


const SAMPLE_GRID = 'md:grid-cols-[minmax(0,1.1fr)_minmax(0,2fr)_150px_90px]';

/** 最初の一手。中身のある画面だけを、何が見られるかの1行と一緒に並べる（ナビの名前と同じ語を使う） */
const ENTRY_POINTS = [
  { label: 'ランキング', text: '金額・初期資金・人数などで並べ替えて、目立つ事例から見る', href: '/discover' },
  { label: '市場動向', text: '伸びている事業テーマと、失敗した理由を分野ごとに見る', href: '/radar' },
  { label: '事業アイデア', text: '顧客・提供するもの・収益の取り方を組み合わせた案を見る', href: '/?mode=ARCHETYPES' },
  { label: 'やり方とツール', text: '集客の方法や、事業で使われている道具を用途別に見る', href: '/playbook' },
];

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
    <div className="term-page bg-term-bg text-term-fg">
      <GlobalHeader
        pageHasSearch
        currentSection="WELCOME"
        rightContent={user ? (
          <span className="max-w-28 truncate text-sm text-term-sub xl:max-w-40">{user.email}</span>
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
          <div className="grid gap-4 px-3 py-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:gap-8">
            <div>
              <h1 id="welcome-title" className="text-xl font-semibold leading-snug text-term-fg-strong sm:text-2xl">
                事業の売上・やり方・出典を、事例ごとに一覧で確認できます
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-term-sub">
                売上・利益・収益の仕組み・道具・初期の集客を、出典と時期つきで記録。確認できない数値は「未確認」、推定には「約」を付けています。
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
            <div className="self-start border border-term-line">
              <dl className="grid grid-cols-2">
                <div className="border-b border-r border-term-line px-3 py-2">
                  <dt className="text-xs text-term-label">公開している事例</dt>
                  <dd className="term-num text-xl text-term-fg-strong">{publishedCount.toLocaleString('ja-JP')}<span className="ml-1 text-xs text-term-label">件</span></dd>
                </div>
                <div className="border-b border-term-line px-3 py-2">
                  <dt className="text-xs text-term-label">収集済みの事例</dt>
                  <dd className="term-num text-xl text-term-fg-strong">{collectedCount.toLocaleString('ja-JP')}<span className="ml-1 text-xs text-term-label">件</span></dd>
                </div>
              </dl>
              <p className="px-3 py-2 text-xs leading-5 text-term-label">
                収集済みのうち、出典の確認が済んだものを公開しています。
              </p>
            </div>
          </div>
        </section>

        <section aria-labelledby="welcome-picks" className="border-b border-term-line">
          <div className="term-panel-title">
            <h2 id="welcome-picks" className="term-panel-name">事例ピックアップ</h2>
            <Link href="/" className="ml-auto inline-flex min-h-11 items-center text-term-select-fg hover:text-term-fg-strong lg:min-h-6">全件を見る</Link>
          </div>

          {examples.length > 0 ? (
            <div>
              <div className={`hidden h-[26px] items-center gap-3 border-b border-term-line bg-term-head px-3 text-xs text-term-label md:grid ${SAMPLE_GRID}`}>
                <span>{UI.LIST_COL_NAME}</span><span>{UI.LIST_COL_SUMMARY}</span><span className="text-right">{UI.LIST_COL_AMOUNT}</span><span>{UI.LIST_COL_ORIGIN}</span>
              </div>
              {examples.map((entity, index) => {
                const { main } = listMetricsOf(entity.reader);
                return (
                  <Link
                    key={entity.id}
                    href={`/?entity=${encodeURIComponent(entity.id)}`}
                    className={`grid min-h-11 grid-cols-1 gap-x-3 border-b border-term-line-soft px-3 py-2 text-sm hover:bg-term-select md:items-center lg:min-h-[29px] lg:py-1 ${SAMPLE_GRID} ${index % 2 ? 'bg-term-row-alt' : ''}`}
                  >
                    <span className="font-semibold text-term-fg-strong">{entity.name}</span>
                    <ListDescription reader={entity.reader} className="line-clamp-2 text-term-sub md:line-clamp-1" />
                    <span className="term-num md:text-right"><ListMetricCell metric={main} expected={['REVENUE']} /></span>
                    <span className="text-xs md:text-sm"><ListOriginCell metric={main} /></span>
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

        <section aria-labelledby="welcome-entry" className="border-b border-term-line">
          <div className="term-panel-title">
            <h2 id="welcome-entry" className="term-panel-name">ここでできること</h2>
          </div>
          <ul className="grid sm:grid-cols-2">
            {ENTRY_POINTS.map((entry, index) => (
              <li key={entry.href} className={`border-b border-term-line-soft ${index % 2 === 0 ? 'sm:border-r' : ''}`}>
                <Link href={entry.href} prefetch={false} className="flex min-h-11 items-center justify-between gap-3 px-3 py-2 text-sm hover:bg-term-select">
                  <span className="min-w-0">
                    <span className="block font-semibold text-term-fg-strong">{entry.label}</span>
                    <span className="block text-xs leading-5 text-term-sub">{entry.text}</span>
                  </span>
                  <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-term-muted" />
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section aria-label="更新の受け取りと事例の投稿" className="grid lg:grid-cols-2">
          <details className="group border-b border-term-line lg:border-r">
            <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1 px-3 text-sm text-term-fg hover:bg-term-head [&::-webkit-details-marker]:hidden"><ChevronRight aria-hidden="true" className="h-4 w-4 text-term-muted transition-transform duration-150 group-open:rotate-90" />新着をメールで受け取る</summary>
            <div className="border-t border-term-line"><WeeklyNewsletterSection /></div>
          </details>
          <details className="group border-b border-term-line">
            <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1 px-3 text-sm text-term-fg hover:bg-term-head [&::-webkit-details-marker]:hidden"><ChevronRight aria-hidden="true" className="h-4 w-4 text-term-muted transition-transform duration-150 group-open:rotate-90" />事例を投稿する</summary>
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
