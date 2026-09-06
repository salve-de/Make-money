'use client';

import React from 'react';
import { Filter, SlidersHorizontal, RotateCcw } from 'lucide-react';
import { FilterState } from '@/types/business';

interface FilterBarProps {
  filter: FilterState;
  onChange: (key: keyof FilterState, value: string) => void;
  onReset: () => void;
  totalCount: number;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filter,
  onChange,
  onReset,
  totalCount,
}) => {
  return (
    <div className="bg-slate-900/90 border-b border-slate-800 p-4 sm:p-5 sticky top-22 z-30 backdrop-blur-md shadow-lg">
      <div className="max-w-7xl mx-auto space-y-3">
        {/* 上段: コントロールバー */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-amber-400" />
            <span className="font-bold text-white text-sm">多次元ファセット抽出</span>
            <span className="px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-300 font-mono font-bold">
              該当 {totalCount} 件
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* ソート順 */}
            <div className="flex items-center gap-1.5 text-slate-300">
              <span className="text-slate-400">並び順:</span>
              <select
                value={filter.sortBy}
                onChange={(e) => onChange('sortBy', e.target.value)}
                aria-label="並び順"
                className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-amber-400 cursor-pointer"
              >
                <option value="revenueDesc">月商が高い順</option>
                <option value="profitMarginDesc">純利益率が高い順</option>
                <option value="investmentAsc">初期費用が安い順</option>
                <option value="recent">新着順</option>
              </select>
            </div>

            {/* リセットボタン */}
            <button
              onClick={onReset}
              className="flex items-center gap-1 text-slate-400 hover:text-amber-300 transition px-2 py-1 rounded bg-slate-800 hover:bg-slate-700"
            >
              <RotateCcw className="w-3 h-3" />
              <span>全解除</span>
            </button>
          </div>
        </div>

        {/* 下段: フィルターセレクト群 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 text-xs">
          {/* 業態 */}
          <div>
            <label className="block text-[11px] text-slate-400 font-medium mb-1">業態・モデル</label>
            <select
              value={filter.businessModel}
              onChange={(e) => onChange('businessModel', e.target.value)}
              aria-label="業態・モデル"
              className="w-full bg-slate-800/90 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-400 cursor-pointer"
            >
              <option value="">すべての業態</option>
              <option value="継続課金型ツール">継続課金型ツール（SaaS）</option>
              <option value="特化型通販">特化型実業・通販</option>
              <option value="定期手紙">定期手紙（ニュースレター）</option>
              <option value="有料集会所">有料集会所（コミュニティ）</option>
              <option value="業務自動化受託">業務自動化受託（AI受託）</option>
              <option value="知識・様式販売">知識・様式販売（テンプレ）</option>
              <option value="顔出しなし動画広告">顔出しなし動画広告</option>
            </select>
          </div>

          {/* 月間売上 */}
          <div>
            <label className="block text-[11px] text-slate-400 font-medium mb-1">月間売上規模</label>
            <select
              value={filter.revenueRange}
              onChange={(e) => onChange('revenueRange', e.target.value)}
              aria-label="月間売上規模"
              className="w-full bg-slate-800/90 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-400 cursor-pointer"
            >
              <option value="">すべての売上規模</option>
              <option value="〜100万">〜100万円</option>
              <option value="100万〜500万">100万〜500万円</option>
              <option value="500万〜1000万">500万〜1,000万円</option>
              <option value="1000万〜3000万">1,000万〜3,000万円</option>
              <option value="3000万以上">3,000万円超</option>
            </select>
          </div>

          {/* 初期費用 */}
          <div>
            <label className="block text-[11px] text-slate-400 font-medium mb-1">初期投資額</label>
            <select
              value={filter.investmentRange}
              onChange={(e) => onChange('investmentRange', e.target.value)}
              aria-label="初期投資額"
              className="w-full bg-slate-800/90 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-400 cursor-pointer"
            >
              <option value="">すべての投資額</option>
              <option value="0円">0円（完全ノーコスト）</option>
              <option value="5万円以下">5万円以下</option>
              <option value="10万円以下">10万円以下</option>
              <option value="50万円以下">50万円以下</option>
              <option value="50万円超">50万円超</option>
            </select>
          </div>

          {/* 自動化度 */}
          <div>
            <label className="block text-[11px] text-slate-400 font-medium mb-1">運用自動化レベル</label>
            <select
              value={filter.automationLevel}
              onChange={(e) => onChange('automationLevel', e.target.value)}
              aria-label="運用自動化レベル"
              className="w-full bg-slate-800/90 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-400 cursor-pointer"
            >
              <option value="">すべての自動化レベル</option>
              <option value="自律稼働型">自律稼働型（自動化率90%以上）</option>
              <option value="半自動型">半自動型（週数時間の保守）</option>
              <option value="プレイヤー実稼働型">プレイヤー実稼働型</option>
            </select>
          </div>

          {/* 必要スキル */}
          <div>
            <label className="block text-[11px] text-slate-400 font-medium mb-1">必要スキル</label>
            <select
              value={filter.skillRequired}
              onChange={(e) => onChange('skillRequired', e.target.value)}
              aria-label="必要スキル"
              className="w-full bg-slate-800/90 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-400 cursor-pointer"
            >
              <option value="">すべてのスキル</option>
              <option value="完全ノーコード">完全ノーコード</option>
              <option value="人工知能の指示のみ">人工知能の指示のみ（プロンプト）</option>
              <option value="基本開発">基本開発（コード）</option>
              <option value="個別営業">個別営業・泥臭いDM</option>
              <option value="発信力">SNS発信力</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};
