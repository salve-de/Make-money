import type { Metadata } from 'next';
import { Inter, Noto_Sans_JP } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const notoSansJP = Noto_Sans_JP({
  subsets: ['latin'],
  variable: '--font-noto-sans-jp',
  display: 'swap',
});

export const metadata: Metadata = {
  title: '金鉱録（KIN-KOROKU） | 日本スモールビジネス一次情報金庫',
  description: '煽りゼロ。個人・少人数ビジネスのリアルな決算書・使用ツール・初期集客手順を完全公開する一次情報データベース。',
};

import { Providers } from './providers';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" className={`h-full antialiased ${inter.variable} ${notoSansJP.variable}`}>
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
