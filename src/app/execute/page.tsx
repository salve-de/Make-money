import React from 'react';

import { GlobalHeader } from '@/platform/components/navigation/GlobalHeader';
import { ExecutionHubClient } from './ExecutionHubClient';

export default function ExecutionHubPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#07080B] text-zinc-100">
      <GlobalHeader currentSection="EXECUTION" />
      <ExecutionHubClient />
    </div>
  );
}
