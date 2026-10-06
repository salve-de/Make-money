'use client';

import './globals.css';

/**
 * 画面全体の枠（layout.tsx）が壊れたときの最後の砦。<html> から自前で作る。
 * フォントの読み込みや Provider に頼らず、色は globals.css のトークンが読めない場合に備えて下地色も直接指定する。
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const button = 'inline-flex min-h-11 items-center border px-4 text-sm lg:min-h-8 lg:px-3';
  return (
    <html lang="ja">
      <head><title>表示できませんでした | Make Money</title><meta name="robots" content="noindex" /></head>
      <body className="bg-term-bg text-term-fg font-sans" style={{ backgroundColor: '#0a0b0c', color: '#d6d8db' }}>
        <main className="term-page flex flex-col">
          <div className="term-panel-title"><span className="term-panel-name">Make Money</span><span>お知らせ</span></div>
          <section className="w-full max-w-xl px-4 py-10 lg:px-6 lg:py-14" aria-labelledby="status-title">
            <p className="font-mono text-xs text-term-label">500</p>
            <h1 id="status-title" className="mt-2 text-lg text-term-fg-strong">表示できませんでした</h1>
            <p className="mt-3 text-sm leading-relaxed text-term-sub lg:text-[13px]">
              一時的な問題が起きたようです。もう一度試すと直ることがあります。直らないときは、しばらくしてから開き直してください。
            </p>
            {error.digest ? (
              <p className="mt-3 text-xs text-term-label">
                障害番号 <span className="font-mono text-term-muted">{error.digest}</span>。問い合わせるときは、この番号を添えてください。
              </p>
            ) : null}
            <div className="mt-6 flex flex-wrap gap-2">
              <button type="button" onClick={reset} autoFocus className={`${button} border-term-accent text-term-accent hover:bg-term-head`}>もう一度試す</button>
              {/* 枠が壊れているので、クライアント遷移ではなく通常のリンクで開き直す */}
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a href="/" className={`${button} border-term-line text-term-fg hover:bg-term-head`}>トップへ戻る</a>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}
