'use client';

import React from 'react';
import { BookOpen, Cpu, Database, Layers, TrendingUp } from 'lucide-react';
import { GridFilterOption, WorkspaceMode } from '../../types/terminal';

interface MobileBottomNavProps {
  workspaceMode: WorkspaceMode;
  onSelectMode: (mode: WorkspaceMode) => void;
  currentFilter: GridFilterOption;
  onSelectFilter: (filter: GridFilterOption) => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  workspaceMode,
  onSelectMode,
  currentFilter,
  onSelectFilter,
}) => {
  const itemClass = (active: boolean) => `flex h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-md border text-xs transition-colors ${
    active ? 'border-sky-300/35 bg-sky-300/[0.12] text-sky-100' : 'border-transparent text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-100'
  }`;

  return (
    <nav
      aria-label="メインメニュー"
      className="fixed inset-x-0 bottom-0 z-30 flex h-[calc(3.5rem+env(safe-area-inset-bottom))] items-start border-t border-white/[0.14] bg-surface/95 px-1 pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <button
        type="button"
        onClick={() => {
          onSelectMode('LEDGER');
          onSelectFilter('ALL');
        }}
        aria-pressed={workspaceMode === 'LEDGER' && currentFilter === 'ALL'}
        className={itemClass(workspaceMode === 'LEDGER' && currentFilter === 'ALL')}
      >
        <Database aria-hidden="true" className="h-4 w-4" />
        <span>事例</span>
      </button>

      <button
        type="button"
        onClick={() => onSelectMode('PLAYBOOK')}
        aria-pressed={workspaceMode === 'PLAYBOOK'}
        className={itemClass(workspaceMode === 'PLAYBOOK')}
      >
        <BookOpen aria-hidden="true" className="h-4 w-4" />
        <span>収益構造</span>
      </button>

      <button
        type="button"
        onClick={() => onSelectMode('ARCHETYPES')}
        aria-pressed={workspaceMode === 'ARCHETYPES'}
        className={itemClass(workspaceMode === 'ARCHETYPES')}
      >
        <Layers aria-hidden="true" className="h-4 w-4" />
        <span>パターン</span>
      </button>

      <button
        type="button"
        onClick={() => onSelectMode('RADAR')}
        aria-pressed={workspaceMode === 'RADAR'}
        className={itemClass(workspaceMode === 'RADAR')}
      >
        <TrendingUp aria-hidden="true" className="h-4 w-4" />
        <span>市場動向</span>
      </button>

      <button
        type="button"
        onClick={() => onSelectMode('SYNTHESIS')}
        aria-pressed={workspaceMode === 'SYNTHESIS'}
        className={itemClass(workspaceMode === 'SYNTHESIS')}
      >
        <Cpu aria-hidden="true" className="h-4 w-4" />
        <span>検討</span>
      </button>
    </nav>
  );
};
