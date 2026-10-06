'use client';

import './globals.css';
import { StatusScreen, statusButtonClass, statusPrimaryButtonClass } from '@/components/terminal/StatusScreen';

/** 最上位の画面（レイアウト）が失敗した時の最後の受け皿。自前で html と body を持つ。 */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-term-bg font-sans text-term-fg">
        <StatusScreen title="表示できません" message="画面を表示できませんでした。" detail="もう一度読み込むか、最初のページへ戻ってください。">
          <button type="button" onClick={reset} className={statusPrimaryButtonClass}>
            もう一度読み込む
          </button>
          {/* レイアウトが壊れている場合があるので、ページ全体を読み直す普通のリンクにする */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/" className={statusButtonClass}>
            一覧へ戻る
          </a>
        </StatusScreen>
      </body>
    </html>
  );
}
