'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { WorkspaceMode, IntelligenceTopicId } from '../types/terminal';
import { INTELLIGENCE_DOSSIERS } from '../data/intelligenceDossiers';

export function useTerminalWorkspace() {
  const searchParams = useSearchParams();
  const queryParam = searchParams?.get('q') || '';
  const modeParam = searchParams?.get('mode') as WorkspaceMode | null;
  const topicParam = searchParams?.get('topic') as IntelligenceTopicId | null;

  // 表示モード (LEDGER: 台帳 / RADAR: 動向レーダー / SYNTHESIS: 戦略壁打ち＆独自アイデア合成)
  const initialMode: WorkspaceMode = modeParam || 'LEDGER';
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>(initialMode);

  // 特集トピックID (nullの場合は特集カタログ一覧を表示)
  const initialTopic: IntelligenceTopicId | null =
    topicParam && INTELLIGENCE_DOSSIERS.some((d) => d.id === topicParam)
      ? topicParam
      : null;
  const [activeTopicId, setActiveTopicId] = useState<IntelligenceTopicId | null>(initialTopic);

  const [searchQuery, setSearchQuery] = useState<string>(queryParam);
  const [selectedAnomalyId, setSelectedAnomalyId] = useState<string | null>(null);

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
    if (modeParam) setWorkspaceMode(modeParam);
    else if (topicParam) setWorkspaceMode('DEEP_DIVE');

    if (topicParam && INTELLIGENCE_DOSSIERS.some((d) => d.id === topicParam)) {
      setActiveTopicId(topicParam);
    }

    if (queryParam !== undefined) {
      setSearchQuery(queryParam);
    }
  }, [modeParam, topicParam, queryParam]);

  return {
    workspaceMode,
    setWorkspaceMode,
    activeTopicId,
    setActiveTopicId,
    searchQuery,
    setSearchQuery,
    selectedAnomalyId,
    setSelectedAnomalyId,
    isCommandPaletteOpen,
    setIsCommandPaletteOpen,
    isScreenerOpen,
    setIsScreenerOpen,
    isProModalOpen,
    setIsProModalOpen,
    currency,
  };
}
