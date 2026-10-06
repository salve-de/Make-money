import type { Metadata } from 'next';
import { StatusScreen, STATUS_BUTTON_MAIN } from '@/lib/site/StatusScreen';

export const metadata: Metadata = {
  title: 'メンテナンス中 | Make Money',
  robots: { index: false, follow: false },
};

/** メンテナンス中の表示。切り替えの設計は docs/launch/MAINTENANCE_MODE.md。 */
export default function MaintenancePage() {
  return (
    <StatusScreen
      label="メンテナンス"
      title="ただいまメンテナンス中です"
      // 再開したかどうかを確かめるため、画面内の遷移でなく通常の読み込みで開き直す
      // eslint-disable-next-line @next/next/no-html-link-for-pages
      actions={<a href="/" className={STATUS_BUTTON_MAIN}>もう一度開く</a>}
    >
      サービスの改善作業を行っています。終わり次第、再開します。しばらくしてから、もう一度開いてください。
    </StatusScreen>
  );
}
