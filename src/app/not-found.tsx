import Link from 'next/link';
import { StatusScreen, statusPrimaryButtonClass } from '@/components/terminal/StatusScreen';

export default function NotFound() {
  return (
    <StatusScreen title="ページが見つかりません" message="お探しのページは見つかりませんでした。" detail="アドレスが変わったか、公開されていない可能性があります。">
      <Link href="/" className={statusPrimaryButtonClass}>
        事例一覧へ戻る
      </Link>
    </StatusScreen>
  );
}
