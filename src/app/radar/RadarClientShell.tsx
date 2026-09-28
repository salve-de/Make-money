'use client';

import React from 'react';
import { MarketRadarView } from '@/platform/components/radar/MarketRadarView';
import { GlobalHeader } from '@/platform/components/navigation/GlobalHeader';
export const RadarClientShell: React.FC = () => {
  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-background">
      <GlobalHeader currentSection="RADAR" />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <MarketRadarView />
      </main>
    </div>
  );
};
