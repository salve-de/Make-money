import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/site/metadata';

export const metadata: Metadata = pageMetadata({
  title: 'はじめに | Make Money',
  description: '事業の収益構造や登録情報を、出典・時点・確認状況とあわせて閲覧できるデータベースの使い方。',
  path: '/welcome',
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
