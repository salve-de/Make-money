'use client';

import React, { useState, useMemo } from 'react';
import { BUSINESS_IDEAS } from '@/data/ideasData';
import { BusinessIdeaRecord, IdeaCategory } from '@/types/idea';
import { SparklineChart } from '@/components/terminal/SparklineChart';
import { CompanyLogo } from '@/components/terminal/CompanyLogo';
import { ArrowRight, Search, X, CheckCircle2, Clock, Wrench, ChevronRight, Layers, ShieldCheck } from 'lucide-react';

interface IdeasVaultViewProps {
  onSelectCompany: (companyId: string) => void;
}

export const IdeasVaultView: React.FC<IdeasVaultViewProps> = ({ onSelectCompany }) => {
  const [selectedCategory, setSelectedCategory] = useState<IdeaCategory>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIdeaId, setSelectedIdeaId] = useState<string>(BUSINESS_IDEAS[0]?.id || '');

  const categories: { id: IdeaCategory; label: string; count: number }[] = [
    { id: 'ALL', label: '全カテゴリ', count: BUSINESS_IDEAS.length },
    { id: 'RICH_CLIENT', label: '高単価産業マッチング', count: BUSINESS_IDEAS.filter(i => i.category === 'RICH_CLIENT').length },
    { id: 'AI_TREND', label: 'AI先端トレンド', count: BUSINESS_IDEAS.filter(i => i.category === 'AI_TREND').length },
    { id: 'ZERO_CAPITAL', label: '初期資本ゼロ', count: BUSINESS_IDEAS.filter(i => i.category === 'ZERO_CAPITAL').length },
    { id: 'NO_CODE', label: 'ノーコード・非開発', count: BUSINESS_IDEAS.filter(i => i.category === 'NO_CODE').length },
    { id: 'PASSIVE_SOLO', label: 'ソロ運営・高純利', count: BUSINESS_IDEAS.filter(i => i.category === 'PASSIVE_SOLO').length },
  ];

  const filteredIdeas = useMemo(() => {
    return BUSINESS_IDEAS.filter(idea => {
      if (selectedCategory !== 'ALL' && idea.category !== selectedCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = idea.title.toLowerCase().includes(q);
        const matchDesc = idea.shortDescription.toLowerCase().includes(q);
        const matchTarget = idea.targetMarket.toLowerCase().includes(q);
        const matchGlitch = idea.glitchOrTrap.toLowerCase().includes(q);
        return matchTitle || matchDesc || matchTarget || matchGlitch;
      }
      return true;
    });
  }, [selectedCategory, searchQuery]);

  const activeIdea = useMemo(() => {
    return BUSINESS_IDEAS.find(i => i.id === selectedIdeaId) || filteredIdeas[0] || BUSINESS_IDEAS[0];
  }, [selectedIdeaId, filteredIdeas]);

  return (
    <div className="flex-1 bg-white overflow-y-auto font-sans text-slate-900 select-none py-6">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 space-y-6">
        
        {/* 1. ページヘッダー：実証済み事業機会アーカイブ一覧 */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-mono text-[11px] text-slate-500">
              <span className="px-1.5 py-0.5 rounded text-[9px] bg-slate-950 text-white font-bold uppercase tracking-wider">
                OPPORTUNITY VAULT
              </span>
              <span>構造的盲点・価格の歪みを突く実証済みビジネス機会</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-950 tracking-tight">
              実践ビジネス機会台帳
            </h1>
          </div>

          <div className="flex items-center gap-2 self-start lg:self-auto font-mono text-xs text-slate-600 bg-slate-50 px-3 py-1.5 rounded border border-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>検証済みアーカイブ: <strong className="text-slate-950 font-bold tabular-nums">{filteredIdeas.length}</strong> 件</span>
          </div>
        </div>

        {/* 2. フィルター＆検索バー */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 pb-3">
          {/* カテゴリ切り替えタブ（フラット） */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
            {categories.map((cat) => {
              const isActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`h-7 px-2.5 rounded text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
                    isActive
                      ? 'bg-slate-950 text-white font-bold shadow-xs'
                      : 'bg-white text-slate-600 hover:text-slate-950 hover:bg-slate-50 border border-slate-200'
                  }`}
                >
                  <span>{cat.label}</span>
                  <span className={`text-[10px] font-mono px-1 py-0.2 rounded tabular-nums ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                    {cat.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* キーワード検索 */}
          <div className="relative w-full md:w-60">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="機会を絞り込み検索..."
              className="w-full h-7.5 pl-7 pr-3 bg-slate-50 focus:bg-white border border-slate-200 focus:border-slate-900 rounded text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all font-sans"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2" />
          </div>
        </div>

        {/* 3. 高密度ディレクトリーテーブル */}
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-2.5 bg-slate-50/80 border-b border-slate-200 text-[11px] font-mono font-bold text-slate-500 uppercase tracking-wider">
            <div className="col-span-4">実証モデル / 機会名称</div>
            <div className="col-span-4">突くべき業界の歪み・盲点</div>
            <div className="col-span-1 text-center">波形</div>
            <div className="col-span-2 text-right">推計実効月利</div>
            <div className="col-span-1 text-center">初期日数</div>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {filteredIdeas.map((idea) => {
              const isSelected = activeIdea?.id === idea.id;
              return (
                <div
                  key={idea.id}
                  onClick={() => setSelectedIdeaId(idea.id)}
                  className={`px-5 py-3.5 cursor-pointer transition-colors flex flex-col md:grid md:grid-cols-12 gap-2 md:gap-4 items-start md:items-center ${
                    isSelected
                      ? 'bg-slate-50 border-l-4 border-slate-950 font-medium'
                      : 'hover:bg-slate-50/70 border-l-4 border-transparent'
                  }`}
                >
                  <div className="col-span-4 flex items-center gap-2.5 min-w-0 w-full">
                    <CompanyLogo id={idea.id} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-950 group-hover:text-slate-700 transition-colors">
                          {idea.title}
                        </span>
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-medium bg-slate-100 text-slate-600">
                          {idea.categoryLabel}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 truncate mt-0.5 font-normal">
                        {idea.targetMarket}
                      </div>
                    </div>
                  </div>

                  <div className="col-span-4 text-[11px] text-slate-600 line-clamp-2 font-normal">
                    {idea.glitchOrTrap}
                  </div>

                  <div className="col-span-1 hidden md:flex items-center justify-center">
                    <SparklineChart trend="up" width={52} height={16} />
                  </div>

                  <div className="col-span-2 flex md:flex-col items-center md:items-end justify-between md:justify-center w-full md:w-auto">
                    <span className="text-[11px] font-bold text-emerald-700 font-mono tabular-nums bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/80">
                      {idea.estimatedMonthlyProfit}
                    </span>
                  </div>

                  <div className="col-span-1 hidden md:flex items-center justify-center gap-1 text-[11px] font-mono text-slate-500">
                    <span>{idea.setupDays}</span>
                    <ChevronRight size={13} className="text-slate-400" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 4. 選択中機会の完全実行Playbook（モーダルではなくインライン展開） */}
        {activeIdea && (
          <div className="border border-slate-200 rounded-lg bg-white overflow-hidden shadow-xs">
            {/* ヘッダー */}
            <div className="p-5 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-mono text-[10px]">
                  <span className="px-1.5 py-0.2 rounded bg-slate-950 text-white font-bold uppercase tracking-wider">
                    OPPORTUNITY PLAYBOOK
                  </span>
                  <span className="text-slate-500">
                    {activeIdea.categoryLabel} • 初期立上げ {activeIdea.setupDays}
                  </span>
                </div>
                <h2 className="text-base sm:text-lg font-bold text-slate-950 tracking-tight">
                  {activeIdea.title}
                </h2>
                <p className="text-xs text-slate-600">
                  {activeIdea.shortDescription}
                </p>
              </div>

              <div className="flex items-center gap-4 shrink-0 font-mono text-xs">
                <div className="text-right">
                  <span className="text-[9px] text-slate-400 block uppercase font-semibold">推計月利</span>
                  <span className="text-sm font-bold text-emerald-700 tabular-nums">
                    {activeIdea.estimatedMonthlyProfit}
                  </span>
                </div>
                <div className="text-right pl-3 border-l border-slate-200">
                  <span className="text-[9px] text-slate-400 block uppercase font-semibold">初期資本</span>
                  <span className="text-sm font-bold text-slate-950 tabular-nums">
                    {activeIdea.initialCapital}
                  </span>
                </div>
                {activeIdea.sourceCompanyId && (
                  <button
                    type="button"
                    onClick={() => onSelectCompany(activeIdea.sourceCompanyId!)}
                    className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 text-white font-mono text-xs font-semibold rounded transition-colors flex items-center gap-1.5 cursor-pointer ml-2"
                  >
                    <span>実在企業財務DB</span>
                    <ArrowRight size={11} />
                  </button>
                )}
              </div>
            </div>

            {/* 3段コンサルティング構造（歪み・カラクリ・DAY-1） */}
            <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-6 text-xs divide-y md:divide-y-0 md:divide-x divide-slate-200">
              {/* 歪み・盲点 */}
              <div className="space-y-2">
                <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block">
                  01. 突くべき業界の歪み・盲点
                </span>
                <p className="text-xs text-slate-800 leading-relaxed">
                  {activeIdea.glitchOrTrap}
                </p>
                <div className="pt-2 text-[11px] text-slate-500 font-mono">
                  対象市場: <strong className="text-slate-900 font-semibold">{activeIdea.targetMarket}</strong>
                </div>
              </div>

              {/* 収益化カラクリ */}
              <div className="pt-4 md:pt-0 md:pl-6 space-y-2">
                <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block">
                  02. 概要と提供価値
                </span>
                <p className="text-xs text-slate-800 leading-relaxed">
                  {activeIdea.shortDescription}
                </p>
                <div className="pt-2">
                  <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block mb-1">使用ツール</span>
                  <div className="flex items-center gap-1 flex-wrap font-mono text-[10px]">
                    {activeIdea.requiredTools.map((t, idx) => (
                      <span key={idx} className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* DAY-1手順 */}
              <div className="pt-4 md:pt-0 md:pl-6 space-y-2">
                <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block">
                  03. 具体的な立ち上げ・実行手順
                </span>
                <p className="text-xs text-slate-800 leading-relaxed">
                  {activeIdea.actionableSteps}
                </p>
                {activeIdea.sourceCompanyName && (
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded mt-2 text-[11px] text-slate-700">
                    <strong className="text-slate-950 font-bold block mb-0.5">参照元ビジネス:</strong>
                    {activeIdea.sourceCompanyName}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
