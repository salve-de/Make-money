'use client';

import React, { useState, useMemo } from 'react';
import { BUSINESS_IDEAS } from '@/data/ideasData';
import { BusinessIdeaRecord, IdeaCategory } from '@/types/idea';
import { CompanyLogo } from '@/components/terminal/CompanyLogo';
import {
  ArrowRight,
  Search,
  CheckCircle2,
  Clock,
  Wrench,
  ChevronRight,
  Sparkles,
  Layers,
  AlertCircle,
  ExternalLink,
  Target,
  Zap
} from 'lucide-react';

interface IdeasVaultViewProps {
  onSelectCompany: (companyId: string) => void;
}

export const IdeasVaultView: React.FC<IdeasVaultViewProps> = ({ onSelectCompany }) => {
  const [selectedCategory, setSelectedCategory] = useState<IdeaCategory>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIdeaId, setSelectedIdeaId] = useState<string>(BUSINESS_IDEAS[0]?.id || '');

  const categories: { id: IdeaCategory; label: string; count: number }[] = [
    { id: 'ALL', label: '全カテゴリ', count: BUSINESS_IDEAS.length },
    { id: 'RICH_CLIENT', label: '高単価産業', count: BUSINESS_IDEAS.filter(i => i.category === 'RICH_CLIENT').length },
    { id: 'AI_TREND', label: 'AI先端', count: BUSINESS_IDEAS.filter(i => i.category === 'AI_TREND').length },
    { id: 'ZERO_CAPITAL', label: '初期0円', count: BUSINESS_IDEAS.filter(i => i.category === 'ZERO_CAPITAL').length },
    { id: 'NO_CODE', label: 'ノーコード', count: BUSINESS_IDEAS.filter(i => i.category === 'NO_CODE').length },
    { id: 'PASSIVE_SOLO', label: 'ソロ高純利', count: BUSINESS_IDEAS.filter(i => i.category === 'PASSIVE_SOLO').length },
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
    const found = filteredIdeas.find(i => i.id === selectedIdeaId);
    if (found) return found;
    return filteredIdeas[0] || null;
  }, [selectedIdeaId, filteredIdeas]);

  return (
    <div className="flex-1 flex overflow-hidden w-full h-full font-sans text-slate-900 select-none">
      
      {/* ───────────────────────────────────────────────────────────── */}
      {/* 【左ペイン】カテゴリ・検索 ＆ 機会一覧台帳 (幅340px〜380px) */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="w-84 lg:w-96 border-r border-slate-200 bg-slate-50/50 flex flex-col shrink-0 overflow-hidden">
        
        {/* 上部固定：ヘッダー ＆ 検索 */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold text-slate-700 uppercase tracking-wider">
              <Layers size={11} className="text-slate-500" />
              <span>OPPORTUNITY VAULT</span>
            </div>
            <div className="font-mono text-[10px] text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
              検証済み: <strong className="text-slate-950 font-bold tabular-nums">{filteredIdeas.length}</strong> 件
            </div>
          </div>

          {/* キーワード検索 */}
          <div className="relative w-full">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="機会・市場・歪みキーワードで検索..."
              className="w-full h-8 pl-7 pr-3 bg-white border border-slate-200 focus:border-slate-900 rounded text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all font-sans"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          </div>

          {/* カテゴリタブ（横スクロール） */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pt-0.5">
            {categories.map((cat) => {
              const isActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`h-6 px-2 rounded text-[11px] font-medium whitespace-nowrap transition-colors flex items-center gap-1 cursor-pointer shrink-0 ${
                    isActive
                      ? 'bg-slate-950 text-white font-bold'
                      : 'bg-white text-slate-600 hover:text-slate-950 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <span>{cat.label}</span>
                  <span className={`text-[9px] font-mono px-1 py-0.1 rounded tabular-nums ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                    {cat.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* リスト一覧（縦スクロール） */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-200/80">
          {filteredIdeas.map((idea) => {
            const isSelected = activeIdea?.id === idea.id;
            return (
              <div
                key={idea.id}
                onClick={() => setSelectedIdeaId(idea.id)}
                className={`p-3.5 cursor-pointer transition-colors space-y-1.5 ${
                  isSelected
                    ? 'bg-slate-100/90 border-l-3 border-slate-950 text-slate-950 font-medium'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-l-3 border-transparent'
                }`}
              >
                {/* 1行目: カテゴリ ＆ 推計月利 */}
                <div className="flex items-center justify-between gap-2 font-mono text-[10px]">
                  <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                    {idea.categoryLabel}
                  </span>
                  <span className="font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/80 tabular-nums">
                    {idea.estimatedMonthlyProfit}
                  </span>
                </div>

                {/* 2行目: タイトル */}
                <div className="flex items-start gap-2">
                  <CompanyLogo id={idea.id} size="sm" />
                  <h3 className="text-xs font-bold text-slate-950 line-clamp-2 leading-snug flex-1">
                    {idea.title}
                  </h3>
                </div>

                {/* 3行目: ターゲット市場 ＆ 立ち上げ日数 */}
                <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-0.5">
                  <span className="truncate max-w-[190px]">{idea.targetMarket}</span>
                  <span className="shrink-0">着金目安: {idea.setupDays}</span>
                </div>
              </div>
            );
          })}

          {filteredIdeas.length === 0 && (
            <div className="p-8 text-center text-xs text-slate-500 font-mono">
              該当するビジネス機会が見つかりませんでした
            </div>
          )}
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 【右ペイン】選択した機会の完全実務実行Playbookドシエ (flex-1) */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 h-full overflow-y-auto bg-white p-6 sm:p-8 space-y-6">
        {activeIdea ? (
          <div className="max-w-4xl mx-auto space-y-6">
            
            {/* 1. ドシエ・ヘッダー */}
            <div className="border-b border-slate-200 pb-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 font-mono text-[11px]">
                  <span className="px-2 py-0.5 rounded text-[9px] bg-slate-950 text-white font-bold uppercase tracking-wider">
                    OPPORTUNITY PLAYBOOK
                  </span>
                  <span className="text-slate-500">
                    {activeIdea.categoryLabel} • 検証難易度: <strong className="text-slate-900 font-semibold">{activeIdea.difficulty}</strong>
                  </span>
                </div>

                {activeIdea.sourceCompanyId && (
                  <button
                    type="button"
                    onClick={() => onSelectCompany(activeIdea.sourceCompanyId!)}
                    className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 text-white font-mono text-xs font-semibold rounded transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>実在企業財務DB</span>
                    <ArrowRight size={12} />
                  </button>
                )}
              </div>

              <div className="space-y-1">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-950 tracking-tight">
                  {activeIdea.title}
                </h1>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {activeIdea.shortDescription}
                </p>
              </div>

              {/* 実務数値ストリップ（マトリクス） */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 font-mono">
                <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded">
                  <span className="text-[10px] text-emerald-700 font-semibold uppercase block">推計実効月利</span>
                  <span className="text-base font-bold text-emerald-800 tabular-nums">
                    {activeIdea.estimatedMonthlyProfit}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                  <span className="text-[10px] text-slate-500 font-semibold uppercase block">所要初期資本</span>
                  <span className="text-base font-bold text-slate-950 tabular-nums">
                    {activeIdea.initialCapital}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                  <span className="text-[10px] text-slate-500 font-semibold uppercase block">初装着金目安</span>
                  <span className="text-base font-bold text-slate-950 tabular-nums">
                    {activeIdea.setupDays}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                  <span className="text-[10px] text-slate-500 font-semibold uppercase block">対象市場規模</span>
                  <span className="text-xs font-bold text-slate-950 truncate block mt-0.5">
                    {activeIdea.targetMarket}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. セクション 01: 突くべき業界の歪み・盲点 */}
            <div className="border border-slate-200 rounded-lg p-5 bg-white space-y-3 shadow-xs">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                <span className="font-mono text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  01. MARKET GLITCH & INEFFICIENCY
                </span>
                <span className="text-xs font-bold text-slate-950">
                  突くべき業界の歪み・価格の盲点
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-800 leading-relaxed">
                {activeIdea.glitchOrTrap}
              </p>
              <div className="p-2.5 bg-slate-50 rounded border border-slate-200/80 text-xs text-slate-600 font-mono">
                狙うべき顧客ターゲット: <strong className="text-slate-950 font-bold">{activeIdea.targetMarket}</strong>
              </div>
            </div>

            {/* 3. セクション 02: 収益化の設計図 ＆ 使用ツールスタック */}
            <div className="border border-slate-200 rounded-lg p-5 bg-white space-y-4 shadow-xs">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                <span className="font-mono text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  02. MONETIZATION ARCHITECTURE & STACK
                </span>
                <span className="text-xs font-bold text-slate-950">
                  提供価値と必須ツールスタック
                </span>
              </div>

              <div className="space-y-2">
                <span className="text-[11px] font-mono font-bold text-slate-500 uppercase block">提供価値とビジネスモデル構造</span>
                <p className="text-xs sm:text-sm text-slate-800 leading-relaxed">
                  {activeIdea.shortDescription}
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <span className="text-[11px] font-mono font-bold text-slate-500 uppercase block">稼働に必要なツールスタック（格安・無料枠）</span>
                <div className="flex flex-wrap gap-2">
                  {activeIdea.requiredTools.map((tool, idx) => (
                    <div
                      key={idx}
                      className="px-2.5 py-1 rounded bg-slate-50 border border-slate-200 text-xs font-mono font-medium text-slate-800 flex items-center gap-1.5"
                    >
                      <Wrench size={11} className="text-slate-500" />
                      <span>{tool}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 4. セクション 03: 具体的な立ち上げ・DAY-1実行手順 */}
            <div className="border border-slate-200 rounded-lg p-5 bg-white space-y-3 shadow-xs">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                <span className="font-mono text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  03. DAY-1 ACTION PLAN
                </span>
                <span className="text-xs font-bold text-slate-950">
                  具体的な立ち上げ・初装着金手順
                </span>
              </div>

              <div className="p-3.5 bg-slate-50 rounded border border-slate-200 text-xs sm:text-sm text-slate-800 leading-relaxed font-sans whitespace-pre-line">
                {activeIdea.actionableSteps}
              </div>
            </div>

            {/* 5. セクション 04: 実在参照ビジネスと財務DB連動 */}
            {activeIdea.sourceCompanyName && (
              <div className="border border-slate-200 rounded-lg p-5 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono font-bold text-slate-500 uppercase block">
                    BENCHMARK REFERENCE
                  </span>
                  <div className="text-sm font-bold text-slate-950">
                    参照元実在ビジネス: {activeIdea.sourceCompanyName}
                  </div>
                  <p className="text-xs text-slate-600">
                    このモデルを実際に運用して利益を上げている企業の損益計算書・原価内訳を財務DBで閲覧できます。
                  </p>
                </div>

                {activeIdea.sourceCompanyId && (
                  <button
                    type="button"
                    onClick={() => onSelectCompany(activeIdea.sourceCompanyId!)}
                    className="px-4 py-2 bg-slate-950 hover:bg-slate-800 text-white font-mono text-xs font-bold rounded transition-colors flex items-center gap-2 cursor-pointer shrink-0 self-start sm:self-auto"
                  >
                    <span>財務諸表を監査する</span>
                    <ArrowRight size={13} />
                  </button>
                )}
              </div>
            )}

          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-xs text-slate-500 font-mono">
            左ペインから実践ビジネス機会を選択してください
          </div>
        )}
      </div>

    </div>
  );
};
