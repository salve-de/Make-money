import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/site/metadata';

// 各ページのタイトルは page.tsx 側。ここでは共有時の説明だけを揃える（canonical は子が継承するため付けない）。
export const metadata: Metadata = pageMetadata({
  title: '利用規約・ポリシー | Make Money',
  description: 'Make Money の利用規約、プライバシーポリシー、特定商取引法に基づく表記。',
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
