import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/site/metadata';

// 子の階層（個別の掲載・事業売買・自分の掲載）が canonical を継承しないよう、path は渡さない。
export const metadata: Metadata = pageMetadata({
  title: 'サービス一覧 | Make Money',
  description: '掲載者が登録したサービスの一覧。申込み・決済は各サイトで行います。',
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
