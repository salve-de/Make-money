'use client';

import React, { useState, useMemo } from 'react';
import {
  MacroIntelligenceData,
  TOOL_CATEGORIES,
  ToolCategoryKey,
  CategoryTrendRadar,
} from '@/lib/intelligence/macro-aggregator';
import {
  Server,
  Cpu,
  Database,
  CreditCard,
  Mail,
  Code,
} from 'lucide-react';

export type PlaybookTabKey = 
  | 'TOOL_RADAR' 
  | 'SHELF_LIFE_DOWNGRADES' 
  | 'CURRENT_PLAYS' 
  | 'DIRTY_GENESIS' 
  | 'GOLDEN_RECIPES';

export function usePlaybookNavigation(data: MacroIntelligenceData) {
  // メインタブ
  const [activeTab, setActiveTab] = useState<PlaybookTabKey>('TOOL_RADAR');

  // 用途別ツール武器庫のサブカテゴリ
  const [selectedToolCategory, setSelectedToolCategory] = useState<ToolCategoryKey>('HOSTING_DEPLOY');

  // 即死パターンの選択
  const [selectedTrapId, setSelectedTrapId] = useState<string>(data.deathTraps[0]?.id || '');

  // 稼ぎの型の選択
  const [selectedWaveId, setSelectedWaveId] = useState<string>(data.currentWaves[0]?.id || '');

  // 現在選択中のカテゴリトレンド
  const activeCategoryRadar = useMemo<CategoryTrendRadar>(() => {
    return data.toolCategoryRadars[selectedToolCategory] || data.toolCategoryRadars.HOSTING_DEPLOY;
  }, [data.toolCategoryRadars, selectedToolCategory]);

  const activeCategoryMeta = useMemo(() => {
    return TOOL_CATEGORIES.find((c) => c.key === selectedToolCategory) || TOOL_CATEGORIES[0];
  }, [selectedToolCategory]);

  // 現在選択中の即死パターン
  const activeTrap = useMemo(() => {
    return data.deathTraps.find((t) => t.id === selectedTrapId) || data.deathTraps[0];
  }, [data.deathTraps, selectedTrapId]);

  // 現在選択中の稼ぎの型
  const activeWave = useMemo(() => {
    return data.currentWaves.find((w) => w.id === selectedWaveId) || data.currentWaves[0];
  }, [data.currentWaves, selectedWaveId]);

  const getCategoryIcon = (key: ToolCategoryKey): React.ReactElement => {
    switch (key) {
      case 'HOSTING_DEPLOY':
        return React.createElement(Server, { className: "w-4 h-4" });
      case 'AI_ML':
        return React.createElement(Cpu, { className: "w-4 h-4" });
      case 'DATABASE_BACKEND':
        return React.createElement(Database, { className: "w-4 h-4" });
      case 'PAYMENTS_BILLING':
        return React.createElement(CreditCard, { className: "w-4 h-4" });
      case 'MARKETING_CRM':
        return React.createElement(Mail, { className: "w-4 h-4" });
      case 'FRONTEND_BUILD':
        return React.createElement(Code, { className: "w-4 h-4" });
    }
  };

  return {
    activeTab,
    setActiveTab,
    selectedToolCategory,
    setSelectedToolCategory,
    selectedTrapId,
    setSelectedTrapId,
    selectedWaveId,
    setSelectedWaveId,
    activeCategoryRadar,
    activeCategoryMeta,
    activeTrap,
    activeWave,
    getCategoryIcon,
  };
}
