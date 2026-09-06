'use client';

import React, { Suspense } from 'react';
import { TerminalShell } from '../platform/components/layout/TerminalShell';

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#060709]" />}>
      <TerminalShell />
    </Suspense>
  );
}

