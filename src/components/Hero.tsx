'use client';

import React from 'react';
import { Search, Sparkles, TrendingUp, CheckCircle2, Zap } from 'lucide-react';

interface HeroProps {
  keyword: string;
  onKeywordChange: (val: string) => void;
  onQuickSelect: (type: string, val: string) => void;
}

export const Hero: React.FC<HeroProps> = ({ keyword, onKeywordChange, onQuickSelect }) => {
  return (
    <div className="relative overflow-hidden pt-12 pb-10 border-b border-slate-800 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* 背景の光沢エフェクト */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        {/* バッジ */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold mb-6">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>嘘・煽り・誇大広告を完全排除した日本初の一次情報台帳</span>
        </div>

        {/* メインタイトル */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight sm:leading-tight">
          稼いでいる個人の、<br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 bg-clip-text text-transparent">
            財務諸表と実証された参入戦略
          </span>
          を全公開。
        </h1>

        {/* サブコピー */}
        <p className="mt-4 text-sm sm:text-base text-slate-300 max-w-3xl mx-auto leading-relaxed">
          誰が・何を使って・初期費用いくらで・最初の客10人をどう集めて・今月いくら儲けているのか。
          <br className="hidden sm:inline" />
          完全一人や少人数で月利100万円〜数千万円を叩き出す「本物のビジネス」だけを解剖・保管するオープン金庫。
        </p>

        {/* 検索バー */}
        <div className="mt-8 max-w-2xl mx-auto">
          <div className="relative flex items-center shadow-xl rounded-xl border border-slate-700 bg-slate-900/90 focus-within:border-amber-400/80 focus-within:ring-2 focus-within:ring-amber-400/20 transition">
            <Search className="w-5 h-5 text-slate-400 ml-4 shrink-0" />
            <input
              type="text"
              value={keyword}
              onChange={(e) => onKeywordChange(e.target.value)}
              placeholder="業態、ツール名、創業者名、キーワードで検索（例: AI, PHP, 0円, Notion...）"
              className="w-full py-4 pl-3 pr-4 text-sm sm:text-base text-white placeholder-slate-500 bg-transparent focus:outline-none"
            />
            {keyword && (
              <button
                onClick={() => onKeywordChange('')}
                className="mr-3 px-2 py-1 text-xs text-slate-400 hover:text-white bg-slate-800 rounded-md"
              >
                クリア
              </button>
            )}
          </div>
        </div>

        {/* クイック絞り込みタグ */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs">
          <span className="text-slate-400 flex items-center gap-1">
            <Zap className="w-3 h-3 text-amber-400" />
            注目の条件:
          </span>
          <button
            onClick={() => onQuickSelect('investment', '0円')}
            className="px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-slate-300 hover:border-amber-400/50 hover:text-amber-300 transition"
          >
            初期費用0円
          </button>
          <button
            onClick={() => onQuickSelect('revenue', '3000万以上')}
            className="px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-slate-300 hover:border-emerald-400/50 hover:text-emerald-300 transition"
          >
            月商3,000万円超
          </button>
          <button
            onClick={() => onQuickSelect('automation', '自律稼働型')}
            className="px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-slate-300 hover:border-blue-400/50 hover:text-blue-300 transition"
          >
            自律稼働型（自動化率90%以上）
          </button>
          <button
            onClick={() => onQuickSelect('skill', '完全ノーコード')}
            className="px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-slate-300 hover:border-purple-400/50 hover:text-purple-300 transition"
          >
            完全ノーコード
          </button>
          <button
            onClick={() => onQuickSelect('model', '定期手紙')}
            className="px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-slate-300 hover:border-amber-400/50 hover:text-amber-300 transition"
          >
            ニュースレター型
          </button>
        </div>

        {/* 信頼性ポリシー・特徴 */}
        <div className="mt-8 pt-6 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-400 max-w-4xl mx-auto">
          <div className="flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span><strong>Stripe等の決済画面</strong>を元に売上実証済み</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
            <span>使っている<strong>全ツールと月額費用</strong>を全公開</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
            <span>最初の100人を集めた<strong>泥臭い集客ログ</strong>を収録</span>
          </div>
        </div>
      </div>
    </div>
  );
};
