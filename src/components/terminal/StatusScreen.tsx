import React from 'react';

/**
 * 画面全体の状態表示（エラー・見つからない）。端末型: 見出しバー＋一文＋操作ボタン。
 * サーバー側（not-found）でも使えるよう、フックは使わず、操作は呼び出し側が渡す。
 */
export function StatusScreen({
  title,
  message,
  detail,
  children,
}: {
  title: string;
  message: string;
  /** 補足の1行（任意） */
  detail?: string;
  children?: React.ReactNode;
}) {
  return (
    <main className="term-page bg-term-bg text-term-fg" role="alert">
      <div className="term-panel-title">
        <h1 className="term-panel-name">{title}</h1>
      </div>
      <div className="max-w-xl px-3 py-6">
        <p className="text-base leading-relaxed text-term-fg-strong lg:text-[13px]">{message}</p>
        {detail && <p className="mt-1 text-sm leading-relaxed text-term-muted lg:text-xs">{detail}</p>}
        <div className="mt-4 flex flex-wrap gap-2">{children}</div>
      </div>
    </main>
  );
}

export const statusButtonClass =
  'inline-flex min-h-11 items-center justify-center rounded-sm border border-term-line bg-transparent px-4 text-sm text-term-fg hover:bg-term-head lg:min-h-8 lg:text-xs';
export const statusPrimaryButtonClass =
  'inline-flex min-h-11 items-center justify-center rounded-sm border border-term-accent bg-transparent px-4 text-sm text-term-accent hover:bg-term-head lg:min-h-8 lg:text-xs';
