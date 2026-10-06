import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/site/metadata';

export const metadata: Metadata = pageMetadata({
  title: '事例を探す | Make Money',
  description: '登録されている事業事例を、出典・時点・確認状況とあわせて探せます。',
  path: '/discover',
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
