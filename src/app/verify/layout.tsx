import type { Metadata } from 'next';
import { noIndexMetadata } from '@/lib/site/metadata';

// ログイン・個人データ・作業中の画面は検索に出さない（配下のページにも継承される）。
export const metadata: Metadata = noIndexMetadata('決済データで売上を確認 | Make Money');

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
