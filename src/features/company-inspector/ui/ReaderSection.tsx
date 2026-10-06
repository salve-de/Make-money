import React from 'react';

/**
 * 見出し付きの区画（端末型: 24px の見出しバー＋罫線区切りの本文）。中身が無ければ見出しごと出さない。件数のラベルは持たない。
 */
export function ReaderSection({
  id,
  title,
  empty,
  children,
}: {
  id: string;
  title: string;
  /** true なら何も出さない（呼び出し側が「中身が0件」を渡す） */
  empty: boolean;
  children: React.ReactNode;
}) {
  if (empty) return null;
  return (
    <section id={id} data-section={id} className="scroll-mt-12 border-b border-term-line lg:scroll-mt-9">
      <div className="term-panel-title">
        <h3 className="term-panel-name truncate">{title}</h3>
      </div>
      <div className="px-2.5 py-1.5 text-sm text-term-fg lg:text-[13px] sm:px-3">{children}</div>
    </section>
  );
}
