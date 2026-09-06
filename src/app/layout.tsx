import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'KIN-KOROKU | 高収益スモールビジネス財務・構造データベース',
  description: '誰が、どこで、どうやって利益を生み出しているのか。公的決算書・決済データ・一次情報に基づく、高収益事業の財務構造データベース。',
};

import { Providers } from './providers';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
