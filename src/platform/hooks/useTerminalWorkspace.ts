'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { WorkspaceMode } from '../types/terminal';

export function useTerminalWorkspace() {
  const searchParams = useSearchParams();
  const queryParam = searchParams?.get('q') || '';
  const modeParam: WorkspaceMode | null = searchParams?.get('mode') === 'SYNTHESIS' ? 'SYNTHESIS' : null;

  // 表示モード (LEDGER: 台帳 / SYNTHESIS: 戦略壁打ち＆独自アイデア合成)
  const initialMode: WorkspaceMode = modeParam || 'LEDGER';
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>(initialMode);

  const [searchQuery, setSearchQuery] = useState<string>(queryParam);

  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);
  const [isScreenerOpen, setIsScreenerOpen] = useState<boolean>(false);
  const [isProModalOpen, setIsProModalOpen] = useState<boolean>(false);
  const [currency] = useState<'JPY' | 'USD'>('JPY');

  // ⌘K グローバル検索ショートカット
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // URL変更との同期
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWorkspaceMode(modeParam ?? 'LEDGER');

    if (queryParam !== undefined) {
      setSearchQuery(queryParam);
    }
  }, [modeParam, queryParam]);

  return {
    workspaceMode,
    setWorkspaceMode,
    searchQuery,
    setSearchQuery,
    isCommandPaletteOpen,
    setIsCommandPaletteOpen,
    isScreenerOpen,
    setIsScreenerOpen,
    isProModalOpen,
    setIsProModalOpen,
    currency,
  };
}
