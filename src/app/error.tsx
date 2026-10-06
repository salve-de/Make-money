'use client';

import Link from 'next/link';
import { StatusScreen, STATUS_BUTTON_MAIN, STATUS_BUTTON_SUB } from '@/lib/site/StatusScreen';

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <StatusScreen
      label="500"
      title="表示できませんでした"
      note={error.digest ? <>障害番号 <span className="term-num text-term-muted">{error.digest}</span>。問い合わせるときは、この番号を添えてください。</> : undefined}
      actions={
        <>
          <button type="button" onClick={reset} className={STATUS_BUTTON_MAIN}>もう一度試す</button>
          <Link href="/" className={STATUS_BUTTON_SUB}>トップへ戻る</Link>
        </>
      }
    >
      一時的な問題が起きたようです。もう一度試すと直ることがあります。直らないときは、しばらくしてから開き直してください。
    </StatusScreen>
  );
}
