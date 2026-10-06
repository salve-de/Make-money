'use client';

import { useEffect, useRef, type ReactNode } from 'react';

/**
 * 404・障害・メンテナンスで共通の表示。端末型UI（docs/design/TERMINAL_UI.md）に合わせる。
 * 文言は「何が起きたか」と「次にすること」を1〜2行で。見出しへフォーカスを移し、読み上げでも状況が先に伝わるようにする。
 */
export const STATUS_BUTTON = 'inline-flex min-h-11 items-center border px-4 text-sm lg:min-h-8 lg:px-3';
export const STATUS_BUTTON_MAIN = `${STATUS_BUTTON} border-term-accent text-term-accent hover:bg-term-head`;
export const STATUS_BUTTON_SUB = `${STATUS_BUTTON} border-term-line bg-transparent text-term-fg hover:bg-term-head`;

export function StatusScreen({ label, title, children, actions, note }: {
  /** 左上の小さな状態表示（例: 404）。 */
  label: string;
  title: string;
  /** 本文（1〜2文）。 */
  children: ReactNode;
  actions: ReactNode;
  /** 本文の下の補足（障害番号など）。 */
  note?: ReactNode;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, []);
  return (
    <main className="term-page flex flex-col bg-term-bg text-term-fg">
      <div className="term-panel-title">
        <span className="term-panel-name">Make Money</span>
        <span>お知らせ</span>
      </div>
      <section className="w-full max-w-xl px-4 py-10 lg:px-6 lg:py-14" aria-labelledby="status-title">
        <p className="term-num text-xs text-term-label">{label}</p>
        <h1 id="status-title" ref={heading} tabIndex={-1} className="mt-2 text-lg text-term-fg-strong outline-none focus-visible:outline-2 focus-visible:outline-term-accent">
          {title}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-term-sub lg:text-[13px]">{children}</p>
        {note ? <p className="mt-3 text-xs text-term-label">{note}</p> : null}
        <div className="mt-6 flex flex-wrap gap-2">{actions}</div>
      </section>
    </main>
  );
}
