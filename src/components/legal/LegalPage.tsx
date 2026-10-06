import Link from 'next/link';
import React from 'react';
import { GlobalHeader } from '@/platform/components/navigation/GlobalHeader';
import { LEGAL_PAGE_LINKS } from '@/lib/legal/links';

interface LegalPageProps {
  title: string;
  updatedAt: string;
  /** 法務の確認が済んでいない文面。既定は true。確認が済んだページだけ false にする。 */
  draft?: boolean;
  children: React.ReactNode;
}

/** 法務文書の共通の枠。本文は読みやすい幅に抑える。 */
export function LegalPage({ title, updatedAt, draft = true, children }: LegalPageProps) {
  return (
    <div className="flex term-page flex-col bg-term-bg text-term-fg">
      <GlobalHeader />
      <main className="w-full flex-1">
        <div className="term-panel-title">
          <span className="term-panel-name">{title}</span>
          <span className="term-num">{updatedAt} 改定</span>
        </div>
        <article className="max-w-3xl px-4 py-4 text-sm leading-7 text-term-fg [&_h2]:mt-6 [&_h2]:border-b [&_h2]:border-term-line [&_h2]:pb-1 [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:text-term-fg-strong [&_h3]:mt-4 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-term-fg-strong [&_li]:ml-5 [&_li]:list-disc [&_p]:mt-2 [&_ul]:mt-2">
          {draft ? (
            <p data-legal-draft className="mt-0 text-xs text-term-label">
              ドラフト（要法務確認）: この文面は公開前の案で、弁護士等の確認が済んでいません。
            </p>
          ) : null}
          <h1 className="text-base font-semibold text-term-fg-strong">{title}</h1>
          {children}
        </article>
        <nav aria-label="規約とポリシー" className="flex flex-wrap gap-x-4 gap-y-1 border-t border-term-line px-4 py-3 text-xs">
          {LEGAL_PAGE_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="inline-flex min-h-11 items-center text-term-sub hover:text-term-fg-strong hover:underline lg:min-h-8">{link.label}</Link>
          ))}
        </nav>
      </main>
    </div>
  );
}

/** 表形式の項目（特定商取引法の表記など）。 */
export function LegalTable({ rows }: { rows: ReadonlyArray<readonly [string, React.ReactNode]> }) {
  return (
    <dl className="mt-3 border-t border-term-line">
      {rows.map(([label, value]) => (
        <div key={label} className="grid grid-cols-1 gap-1 border-b border-term-line-soft py-2 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-4">
          <dt className="text-xs text-term-label sm:text-sm">{label}</dt>
          <dd className="min-w-0 break-words">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** 横に長い表（Cookie・端末保存の一覧など）。スマホでは横にスクロールする。 */
export function LegalDataTable({ caption, head, rows }: { caption: string; head: readonly string[]; rows: ReadonlyArray<readonly React.ReactNode[]> }) {
  return (
    <div className="mt-3 overflow-x-auto" tabIndex={0} role="region" aria-label={caption}>
      <table className="w-full min-w-[640px] border-collapse text-xs leading-6">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {head.map((label) => (
              <th key={label} scope="col" className="border-b border-term-line px-2 py-1 text-left font-normal text-term-label">{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((cells, rowIndex) => (
            <tr key={rowIndex} className="align-top">
              {cells.map((cell, cellIndex) => (
                <td key={cellIndex} className="break-words border-b border-term-line-soft px-2 py-1">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
