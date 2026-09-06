'use client';

import React, { useState, useMemo } from 'react';
import { BUSINESS_IDEAS } from '@/data/ideasData';
import { BusinessIdeaRecord, IdeaCategory } from '@/types/idea';
import { SparklineChart } from '@/components/terminal/SparklineChart';
import { CompanyLogo } from '@/components/terminal/CompanyLogo';
import { ArrowRight, Search, X, CheckCircle2, Clock, Wrench } from 'lucide-react';

interface IdeasVaultViewProps {
  onSelectCompany: (companyId: string) => void;
}

export const IdeasVaultView: React.FC<IdeasVaultViewProps> = ({ onSelectCompany }) => {
  const [selectedCategory, setSelectedCategory] = useState<IdeaCategory>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIdea, setSelectedIdea] = useState<BusinessIdeaRecord | null>(null);

  const categories: { id: IdeaCategory; label: string; count: number }[] = [
    { id: 'ALL', label: '全カテゴリ', count: BUSINESS_IDEAS.length },
    { id: 'RICH_CLIENT', label: '高単価産業中抜き', count: BUSINESS_IDEAS.filter(i => i.category === 'RICH_CLIENT').length },
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

  return (
    <div className="flex-1 bg-[#F8FAFC] overflow-y-auto p-5 sm:p-7 lg:p-9 space-y-6 select-none font-sans text-slate-900">
      
      {/* ───────────────────────────────────────────────────────────── */}
      {/* ページヘッダー：実証済み事業機会アーカイブ一覧               */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="border-b border-slate-200 pb-5 space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-900 text-white uppercase tracking-wider">
                OPPORTUNITY VAULT
              </span>
              <span className="text-xs font-mono text-slate-500">
                実証済み事業機会・実践台帳
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              実践ビジネス機会台帳
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 max-w-2xl font-normal leading-relaxed">
              既存産業の構造的盲点・価格の歪みを突いて、最小資本からキャッシュフローを創出する全実践モデル一覧。
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto font-mono text-xs text-slate-700 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>検証済みアーカイブ数: <strong className="text-slate-900 font-bold tabular-nums">{filteredIdeas.length}</strong> 件</span>
          </div>
        </div>

        {/* フィルター＆検索バー */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2">
          {/* カテゴリ切り替えタブ */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
            {categories.map((cat) => {
              const isActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all border flex items-center gap-2 ${
                    isActive
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs font-bold'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:text-slate-900 shadow-2xs'
                  }`}
                >
                  <span>{cat.label}</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full tabular-nums ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    {cat.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* キーワード検索 */}
          <div className="relative w-full md:w-64">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="機会を絞り込み検索..."
              className="w-full h-8.5 pl-8.5 pr-4 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 shadow-2xs font-sans"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 高密度ディレクトリーテーブル：カード入れ子を完全全廃したクリーンな一覧行 */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        {/* テーブルヘッダー */}
        <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 bg-slate-50/80 border-b border-slate-200 text-[11px] font-mono font-bold text-slate-500 uppercase tracking-wider">
          <div className="col-span-4">実証モデル / 機会名称</div>
          <div className="col-span-3">突くべき業界の歪み・盲点</div>
          <div className="col-span-2 text-center">成長モメンタム</div>
          <div className="col-span-2 text-right">推計実効月利</div>
          <div className="col-span-1 text-center">初期日数</div>
        </div>

        {/* テーブル行リスト */}
        <div className="divide-y divide-slate-150">
          {filteredIdeas.map((idea) => (
            <div
              key={idea.id}
              onClick={() => setSelectedIdea(idea)}
              className="px-5 py-4 hover:bg-slate-50/80 transition-colors cursor-pointer flex flex-col md:grid md:grid-cols-12 gap-3 md:gap-4 items-start md:items-center group"
            >
              {/* 列1: アイコン＋名称＋カテゴリ */}
              <div className="col-span-4 flex items-center gap-3 min-w-0 w-full">
                <CompanyLogo id={idea.id} size="md" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-slate-900 group-hover:text-indigo-600 transition-colors">
                      {idea.title}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700">
                      {idea.categoryLabel}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 truncate font-normal mt-0.5">
                    {idea.targetMarket}
                  </div>
                </div>
              </div>

              {/* 列2: 突くべき市場の歪み */}
              <div className="col-span-3 text-xs text-slate-600 line-clamp-2 md:line-clamp-1 font-normal">
                {idea.glitchOrTrap}
              </div>

              {/* 列3: 成長波形スパークライン */}
              <div className="col-span-2 hidden md:flex items-center justify-center">
                <SparklineChart trend="up" width={72} height={24} />
              </div>

              {/* 列4: 推計実効月利 */}
              <div className="col-span-2 flex md:flex-col items-center md:items-end justify-between md:justify-center w-full md:w-auto">
                <span className="text-xs text-slate-400 md:hidden font-mono">推計月利:</span>
                <span className="text-sm font-extrabold text-emerald-700 font-mono tabular-nums bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                  {idea.estimatedMonthlyProfit}
                </span>
              </div>

              {/* 列5: 初期日数 ＆ 矢印 */}
              <div className="col-span-1 hidden md:flex items-center justify-center gap-1 text-xs font-mono text-slate-500">
                <span>{idea.setupDays}</span>
                <ArrowRight size={13} className="text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* アイデア詳細モーダル：白基調・美麗レポート                      */}
      {/* ───────────────────────────────────────────────────────────── */}
      {selectedIdea && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 pb-4">
              <div className="flex items-start gap-3">
                <CompanyLogo id={selectedIdea.id} size="lg" />
                <div className="space-y-1">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 uppercase font-bold tracking-wider">
                    {selectedIdea.categoryLabel}
                  </span>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                    {selectedIdea.title}
                  </h2>
                </div>
              </div>
              <button
                onClick={() => setSelectedIdea(null)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-900 hover:bg-slate-200 flex items-center justify-center text-sm transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4 text-xs font-sans">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="text-[10px] font-mono text-slate-500 uppercase font-bold tracking-wider">事業モデル概要 (EXECUTIVE SUMMARY)</div>
                <p className="text-slate-900 text-sm leading-relaxed font-medium">
                  {selectedIdea.shortDescription}
                </p>
              </div>

              {/* 4大キースペック（入れ子箱を排除したフラットグリッド） */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3 border-y border-slate-200 font-mono">
                <div>
                  <div className="text-[10px] text-slate-500 font-sans font-medium">推計実効月利</div>
                  <div className="text-base font-extrabold text-emerald-700 tabular-nums mt-0.5">{selectedIdea.estimatedMonthlyProfit}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 font-sans font-medium">初期投下資本</div>
                  <div className="text-base font-bold text-slate-900 tabular-nums mt-0.5">{selectedIdea.initialCapital}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 font-sans font-medium">参入難易度</div>
                  <div className="text-base font-bold text-slate-800 mt-0.5">{selectedIdea.difficulty}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 font-sans font-medium">初動期間</div>
                  <div className="text-base font-bold text-slate-800 mt-0.5">{selectedIdea.setupDays}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="space-y-1">
                  <div className="text-[11px] font-mono text-slate-500 uppercase font-bold tracking-wider">1. 市場の構造的盲点・価格の歪み</div>
                  <p className="text-slate-800 leading-relaxed text-xs font-normal">
                    {selectedIdea.glitchOrTrap}
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="text-[11px] font-mono text-slate-500 uppercase font-bold tracking-wider">2. 収益化・仕掛けのカラクリ</div>
                  <p className="text-slate-800 leading-relaxed text-xs font-normal">
                    {selectedIdea.shortDescription}
                  </p>
                </div>
              </div>

              {/* 初動実行手順 */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <div className="text-[11px] font-mono text-slate-500 uppercase font-bold tracking-wider">
                  3. 最初の100万円を作る初動ステップ (EXECUTION BLUEPRINT)
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs leading-relaxed font-medium">
                  {selectedIdea.actionableSteps}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
              {selectedIdea.sourceCompanyId ? (
                <button
                  onClick={() => {
                    const cid = selectedIdea.sourceCompanyId!;
                    setSelectedIdea(null);
                    onSelectCompany(cid);
                  }}
                  className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
                >
                  <span>実証企業（{selectedIdea.sourceCompanyName}）の詳細財務諸表を閲覧</span>
                  <ArrowRight size={14} />
                </button>
              ) : (
                <div className="text-xs text-slate-500 font-mono">独自検証レポート</div>
              )}
              <button
                onClick={() => setSelectedIdea(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
