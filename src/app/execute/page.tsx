import React from 'react';
import Link from 'next/link';

import { GlobalHeader } from '@/platform/components/navigation/GlobalHeader';
import { ExecutionHubClient } from './ExecutionHubClient';

export default function ExecutionHubPage() {
  return (
    <div className="flex term-page flex-col bg-term-bg text-term-fg">
      <GlobalHeader currentSection="EXECUTION" />
      <aside aria-label="実行計画のご案内" className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-term-line bg-term-panel px-3 py-2 text-sm text-term-sub">
        <p>実行計画は「作る」にまとめました。これから始める方は、そちらからどうぞ。</p>
        <Link href="/build" prefetch={false} className="inline-flex min-h-11 items-center border border-term-accent px-3 text-term-accent hover:bg-term-head lg:min-h-8">作るへ進む</Link>
      </aside>
      <ExecutionHubClient />
    </div>
  );
}
