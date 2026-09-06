'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CleanHeader } from '@/components/terminal/CleanHeader';
import { DiagnosticFinder } from '@/components/terminal/DiagnosticFinder';
import { ExecutiveDetailSheet } from '@/components/terminal/ExecutiveDetailSheet';
import { TERMINAL_COMPANIES } from '@/data/terminalData';
import { MarketLiveTicker } from '@/components/terminal/MarketLiveTicker';
import { X } from 'lucide-react';

export default function FinderPage() {
  const router = useRouter();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);

  const selectedCompany = selectedCompanyId 
    ? TERMINAL_COMPANIES.find(c => c.id === selectedCompanyId) || null
    : null;

  const handleChangeMainView = (view: string) => {
    if (view === 'FINDER') return;
    router.push(`/?view=${view}`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      <MarketLiveTicker />
      <CleanHeader
        searchQuery=""
        onSearchChange={() => {}}
        totalCount={TERMINAL_COMPANIES.length}
        mainView="FINDER"
        onChangeMainView={handleChangeMainView}
      />
      <main className="flex-1 overflow-y-auto p-5 sm:p-7 lg:p-9 space-y-6 select-none max-w-7xl mx-auto w-full">
        <DiagnosticFinder
          onSelectCompany={(id) => setSelectedCompanyId(id)}
        />
      </main>

      {/* 詳細レントゲンシート（モーダル展開） */}
      {selectedCompany && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 relative">
            <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md px-6 py-3 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-slate-500 uppercase">
                事業完全レントゲンシート
              </span>
              <button
                type="button"
                onClick={() => setSelectedCompanyId(null)}
                className="px-3 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold font-mono transition-colors cursor-pointer flex items-center gap-1"
              >
                <X size={13} />
                <span>閉じる</span>
              </button>
            </div>
            <div className="p-6">
              <ExecutiveDetailSheet
                company={selectedCompany}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
