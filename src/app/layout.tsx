import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Make Money | 事業事例データベース',
  description: '事業の収益構造や登録情報を、出典・時点・確認状況とあわせて閲覧できるデータベース。',
};

import { Providers } from './providers';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#0B0E14] text-zinc-100 font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
