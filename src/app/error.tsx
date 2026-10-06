'use client';

import Link from 'next/link';
import { StatusScreen, statusButtonClass, statusPrimaryButtonClass } from '@/components/terminal/StatusScreen';

/** ページの表示中に失敗した時の画面。もう一度読み込むか、一覧へ戻れる。 */
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <StatusScreen title="表示できません" message="このページを表示できませんでした。" detail="通信が不安定な可能性があります。もう一度読み込むか、一覧へ戻ってください。">
      <button type="button" onClick={reset} className={statusPrimaryButtonClass}>
        もう一度読み込む
      </button>
      <Link href="/" className={statusButtonClass}>
        一覧へ戻る
      </Link>
    </StatusScreen>
  );
}
