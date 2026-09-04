import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '金鉱録（KIN-KOROKU） | 日本スモールビジネス一次情報金庫',
  description: '煽りゼロ。個人・少人数ビジネスのリアルな決算書・使用ツール・初期集客手順を完全公開する一次情報データベース。',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" className="dark h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-950 text-slate-100">{children}</body>
    </html>
  );
}
