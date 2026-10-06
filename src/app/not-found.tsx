import type { Metadata } from 'next';
import Link from 'next/link';
import { StatusScreen, STATUS_BUTTON_MAIN, STATUS_BUTTON_SUB } from '@/lib/site/StatusScreen';

export const metadata: Metadata = {
  title: 'ページが見つかりません | Make Money',
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <StatusScreen
      label="404"
      title="ページが見つかりません"
      actions={
        <>
          <Link href="/" className={STATUS_BUTTON_MAIN}>トップへ戻る</Link>
          <Link href="/discover" className={STATUS_BUTTON_SUB}>事例を探す</Link>
        </>
      }
    >
      アドレスが違うか、このページは移動または公開を終了した可能性があります。トップから探し直してください。
    </StatusScreen>
  );
}
