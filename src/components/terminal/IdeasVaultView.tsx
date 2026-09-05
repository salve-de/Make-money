'use client';

import React, { useState, useMemo } from 'react';
import { BUSINESS_IDEAS } from '@/data/ideasData';
import { BusinessIdeaRecord, IdeaCategory } from '@/types/idea';

interface IdeasVaultViewProps {
  onSelectCompany: (companyId: string) => void;
}

export const IdeasVaultView: React.FC<IdeasVaultViewProps> = ({ onSelectCompany }) => {
  const [selectedCategory, setSelectedCategory] = useState<IdeaCategory>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIdea, setSelectedIdea] = useState<BusinessIdeaRecord | null>(null);

  const categories: { id: IdeaCategory; label: string; count: number }[] = [
    { id: 'ALL', label: '全カテゴリ', count: BUSINESS_IDEAS.length },
    { id: 'RICH_CLIENT', label: '高単価産業中抜き (High Margin B2B)', count: BUSINESS_IDEAS.filter(i => i.category === 'RICH_CLIENT').length },
    { id: 'AI_TREND', label: 'AI活用・先端トレンド (AI & Trend Arbitrage)', count: BUSINESS_IDEAS.filter(i => i.category === 'AI_TREND').length },
    { id: 'ZERO_CAPITAL', label: '初期資本ゼロ (Zero Capital Bootstrapping)', count: BUSINESS_IDEAS.filter(i => i.category === 'ZERO_CAPITAL').length },
    { id: 'NO_CODE', label: 'ノーコード・非開発型 (No-Code Operations)', count: BUSINESS_IDEAS.filter(i => i.category === 'NO_CODE').length },
    { id: 'PASSIVE_SOLO', label: 'ソロ運営・高純利益ストック (Solo Operator ARR)', count: BUSINESS_IDEAS.filter(i => i.category === 'PASSIVE_SOLO').length },
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
    <div className="flex-1 bg-[#090A0D] overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 select-none font-sans text-zinc-100">
      
      {/* ───────────────────────────────────────────────────────────── */}
      {/* ページヘッダー：マッキンゼー／PitchBook調                     */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="border-b border-white/[0.08] pb-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-zinc-800 text-zinc-300 border border-white/10 uppercase tracking-widest">
                OPERATIONAL ARSENAL & VAULT
              </span>
              <span className="text-xs font-mono text-zinc-500">
                監査済み事業機会・実践手口台帳
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              実践ビジネスアイデア台帳
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl font-normal leading-relaxed">
              既存産業の構造的盲点（裁定機会）および高単価市場の死角を突いて、最小資本からキャッシュフローを創出する実効ビジネスモデル一覧。
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto font-mono text-xs text-zinc-400 bg-[#12141A] px-3.5 py-2 rounded-lg border border-white/10">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-300" />
            <span>検証済みモデル数: <strong className="text-white font-bold tabular-nums">{filteredIdeas.length}</strong> 件</span>
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
                  className={`px-3 py-1.5 rounded text-xs font-medium whitespace-nowrap transition-all border flex items-center gap-2 ${
                    isActive
                      ? 'bg-zinc-200 text-black border-white shadow-xs font-bold'
                      : 'bg-[#12141A] text-zinc-400 border-white/5 hover:border-white/20 hover:text-zinc-200'
                  }`}
                >
                  <span>{cat.label}</span>
                  <span className={`text-[10px] font-mono px-1 rounded tabular-nums ${isActive ? 'bg-black/10 text-black' : 'bg-zinc-800 text-zinc-500'}`}>
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
              placeholder="キーワードで台帳を検索..."
              className="w-full h-8 pl-8 pr-3 bg-[#12141A] border border-white/10 rounded text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-hidden focus:border-zinc-400 transition-colors font-sans"
            />
            <svg className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* アイデアカードグリッド：端正な金融・データ端末調              */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredIdeas.map((idea) => (
          <div
            key={idea.id}
            onClick={() => setSelectedIdea(idea)}
            className="p-5 rounded-xl bg-[#101217] hover:bg-[#14161E] border border-white/[0.08] hover:border-zinc-500 transition-all cursor-pointer flex flex-col justify-between space-y-4 group shadow-sm"
          >
            <div className="space-y-3">
              {/* 上部メタデータ */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-800/80 text-zinc-300 border border-white/10">
                  {idea.categoryLabel}
                </span>

                <div className="flex items-center gap-1.5 font-mono text-[10px]">
                  <span className="text-zinc-500">参入難易度:</span>
                  <span className="text-zinc-300 font-medium">
                    {idea.difficulty}
                  </span>
                  <span className="text-zinc-600">/</span>
                  <span className="text-zinc-400">{idea.setupDays}</span>
                </div>
              </div>

              {/* タイトル */}
              <h3 className="text-sm sm:text-base font-bold text-white group-hover:text-zinc-200 transition-colors leading-snug">
                {idea.title}
              </h3>

              {/* 概要 */}
              <p className="text-xs text-zinc-400 leading-relaxed font-normal">
                {idea.shortDescription}
              </p>

              {/* 標的と歪み（コンサルティング対比枠） */}
              <div className="space-y-2 pt-1 text-[11px] font-sans">
                <div className="p-2.5 rounded bg-[#0A0C0F] border border-white/5 space-y-1">
                  <div className="flex items-center gap-1.5 text-zinc-400">
                    <span className="font-mono text-[10px] uppercase font-bold text-zinc-400 tracking-wider">TARGET MARKET（資金供給元）:</span>
                  </div>
                  <p className="text-zinc-300 text-[11px] leading-relaxed">
                    {idea.targetMarket}
                  </p>
                </div>

                <div className="p-2.5 rounded bg-[#0A0C0F] border border-white/5 space-y-1">
                  <div className="flex items-center gap-1.5 text-zinc-400">
                    <span className="font-mono text-[10px] uppercase font-bold text-zinc-400 tracking-wider">ARBITRAGE MECHANISM（裁定構造）:</span>
                  </div>
                  <p className="text-zinc-300 text-[11px] leading-relaxed">
                    {idea.actionableSteps}
                  </p>
                </div>
              </div>

              {/* 使用ツールタグ */}
              <div className="flex items-center gap-1 flex-wrap pt-1">
                {idea.requiredTools.map((tool, idx) => (
                  <span key={idx} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#171920] text-zinc-400 border border-white/5">
                    {tool}
                  </span>
                ))}
              </div>
            </div>

            {/* 下部：財務指標 ＆ 参照元リンク */}
            <div className="pt-3 border-t border-white/[0.08] space-y-2 font-mono text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-zinc-500 block uppercase">INITIAL CAPITAL</span>
                  <span className="text-zinc-300 font-bold tabular-nums">{idea.initialCapital}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-zinc-500 block uppercase">EXPECTED NET CASH FLOW</span>
                  <span className="text-white font-bold text-xs sm:text-sm tabular-nums">{idea.estimatedMonthlyProfit}</span>
                </div>
              </div>

              {idea.sourceCompanyId && (
                <div className="flex items-center justify-between text-[11px] pt-1 text-zinc-500 group-hover:text-zinc-300">
                  <span>実証元: {idea.sourceCompanyName}</span>
                  <span className="text-zinc-300 group-hover:translate-x-0.5 transition-transform">詳細調書を開く →</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* アイデア詳細モーダル：投資銀行・調査機関レポート調              */}
      {/* ───────────────────────────────────────────────────────────── */}
      {selectedIdea && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#12141A] border border-white/20 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="space-y-1">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-white/10 uppercase font-bold tracking-wider">
                  {selectedIdea.categoryLabel}
                </span>
                <h2 className="text-lg sm:text-xl font-bold text-white">
                  {selectedIdea.title}
                </h2>
              </div>
              <button
                onClick={() => setSelectedIdea(null)}
                className="w-8 h-8 rounded bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center text-sm font-mono transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4 text-xs font-sans">
              <div className="p-3.5 rounded bg-[#0B0D11] border border-white/5 space-y-1.5">
                <div className="text-[10px] font-mono text-zinc-500 uppercase font-bold tracking-wider">事業モデル概要 (EXECUTIVE SUMMARY)</div>
                <p className="text-zinc-200 text-sm leading-relaxed font-medium">
                  {selectedIdea.shortDescription}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded bg-[#0B0D11] border border-white/5 space-y-1">
                  <div className="text-[10px] font-mono text-zinc-400 uppercase font-bold tracking-wider">1. 市場の構造的盲点・価格の歪み</div>
                  <p className="text-zinc-300 leading-relaxed text-xs">
                    {selectedIdea.glitchOrTrap}
                  </p>
                </div>

                <div className="p-3.5 rounded bg-[#0B0D11] border border-white/5 space-y-1">
                  <div className="text-[10px] font-mono text-zinc-400 uppercase font-bold tracking-wider">2. 具体的参入プロトコル（現場手順）</div>
                  <p className="text-zinc-300 leading-relaxed text-xs">
                    {selectedIdea.actionableSteps}
                  </p>
                </div>
              </div>

              <div className="p-4 rounded bg-[#0B0D11] border border-white/5 space-y-2">
                <div className="text-[10px] font-mono text-zinc-400 uppercase font-bold tracking-wider">実稼働インフラ・必要ツールスタック</div>
                <div className="flex items-center gap-2 flex-wrap">
                  {selectedIdea.requiredTools.map((t, i) => (
                    <span key={i} className="px-2.5 py-1 rounded bg-[#171920] border border-white/10 text-xs font-mono text-zinc-200">
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded bg-[#0B0D11] border border-white/5 grid grid-cols-3 gap-3 text-center font-mono">
                <div>
                  <div className="text-[10px] text-zinc-500 uppercase">INITIAL CAPITAL</div>
                  <div className="text-sm font-bold text-white mt-0.5 tabular-nums">{selectedIdea.initialCapital}</div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-500 uppercase">SETUP TIMELINE</div>
                  <div className="text-sm font-bold text-white mt-0.5">{selectedIdea.setupDays}</div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-400 uppercase">EXPECTED NET CF</div>
                  <div className="text-sm font-bold text-white mt-0.5 tabular-nums">{selectedIdea.estimatedMonthlyProfit}</div>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-3">
              {selectedIdea.sourceCompanyId ? (
                <button
                  onClick={() => {
                    const cid = selectedIdea.sourceCompanyId!;
                    setSelectedIdea(null);
                    onSelectCompany(cid);
                  }}
                  className="px-4 py-2 rounded bg-white hover:bg-zinc-200 text-black font-bold text-xs font-mono transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <span>実証企業の詳細分析調書を開く →</span>
                </button>
              ) : (
                <div />
              )}

              <button
                onClick={() => setSelectedIdea(null)}
                className="px-4 py-2 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-colors"
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
