import type { Metadata } from 'next';
import { GlobalHeader } from '@/platform/components/navigation/GlobalHeader';
import { AccountView } from '@/components/auth/AccountView';

export const metadata: Metadata = { title: '会員設定 | Make Money', robots: { index: false } };

export default function AccountPage() {
  return (
    <div className="flex term-page flex-col bg-term-bg text-term-fg">
      <GlobalHeader currentSection="ACCOUNT" />
      <main className="w-full max-w-3xl flex-1 lg:border-r lg:border-term-line">
        <h1 className="border-b border-term-line px-3 py-3 text-lg font-semibold text-term-fg-strong">会員設定</h1>
        <AccountView />
      </main>
    </div>
  );
}
