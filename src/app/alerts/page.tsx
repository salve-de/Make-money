import type { Metadata } from 'next';
import { GlobalHeader } from '@/platform/components/navigation/GlobalHeader';
import { SavedSearchesView } from '@/platform/components/alerts/SavedSearchesView';

export const metadata: Metadata = { title: '保存した条件 | Make Money' };

export default function AlertsPage() {
  return (
    <div className="flex term-page flex-col bg-term-bg text-term-fg">
      <GlobalHeader currentSection="ALERTS" />
      <main className="w-full flex-1">
        <SavedSearchesView />
      </main>
    </div>
  );
}
