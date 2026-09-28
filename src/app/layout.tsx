import type { Metadata } from 'next';
import { JetBrains_Mono } from 'next/font/google';
import './globals.css';

export const metadata: Metadata = {
  title: 'Make Money | 事業事例データベース',
  description: '事業の収益構造や登録情報を、出典・時点・確認状況とあわせて閲覧できるデータベース。',
};

import { Providers } from './providers';

// 数値・コード表示専用の等幅書体。本文は OS の日本語書体を使う。
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '600'],
  display: 'swap',
  variable: '--font-jetbrains-mono',
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" className={`h-full antialiased ${jetbrainsMono.variable}`}>
      <body className="min-h-full flex flex-col bg-term-bg text-term-fg font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
