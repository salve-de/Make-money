'use client';

import React from 'react';
import {
  MacroIntelligenceData,
} from '@/lib/intelligence/macro-aggregator';
import {
  Zap,
  Wrench,
} from 'lucide-react';

interface GenesisSectionProps {
  genesisTactics: MacroIntelligenceData['genesisTactics'];
}

export const GenesisSection: React.FC<GenesisSectionProps> = ({ genesisTactics }) => {
  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <div className="bg-[#090A0F] border border-amber-500/20 rounded-lg p-4 sm:p-5">
        <div className="flex items-center gap-2 text-amber-400 text-xs font-mono font-semibold tracking-wider uppercase mb-1">
          <Zap className="w-3.5 h-3.5" />
          <span>First 100 Customers Guerrilla Archives</span>
        </div>
        <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
          初動獲得の参考事例（一次証跡未確認）
        </h2>
        <p className="text-xs sm:text-sm text-zinc-400 mt-1">
          初期顧客の獲得方法を比較する参考資料です。企業との対応や記述内容は出典との照合が未完了です。
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {genesisTactics.map((tactic) => (
          <div
            key={tactic.id}
            className="bg-[#08090D] border border-white/[0.08] rounded-lg p-5 flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="flex items-center justify-between text-xs font-mono mb-2">
                <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  {tactic.categoryLabel}
                </span>
                <span className="text-emerald-400 font-semibold">初成約速度: {tactic.speedToFirstCustomer}</span>
              </div>

              <h3 className="text-base font-bold text-white tracking-tight mb-2">{tactic.tacticName}</h3>
              <p className="text-xs text-zinc-300 leading-relaxed bg-white/[0.02] border border-white/[0.04] p-3 rounded mb-3">
                {tactic.summary}
              </p>

              <div className="space-y-1.5">
                <div className="text-[11px] font-mono text-zinc-400 font-semibold">【手口と実行手順】</div>
                {tactic.executionSteps.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-zinc-300 leading-relaxed">
                    <span className="text-amber-400 font-mono font-bold shrink-0">{idx + 1}.</span>
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs font-mono">
              <span className="text-zinc-500">実行創業者:</span>
              <span className="text-zinc-200 font-bold">{tactic.proofEntity.name} ({tactic.proofEntity.founder})</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

interface GoldenStackSectionProps {
  goldenStackRecipes: MacroIntelligenceData['goldenStackRecipes'];
}

export const GoldenStackSection: React.FC<GoldenStackSectionProps> = ({ goldenStackRecipes }) => {
  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <div className="bg-[#090A0F] border border-purple-500/20 rounded-lg p-4 sm:p-5">
        <div className="flex items-center gap-2 text-purple-400 text-xs font-mono font-semibold tracking-wider uppercase mb-1">
          <Wrench className="w-3.5 h-3.5" />
          <span>Battle-Tested Stack Blueprints</span>
        </div>
        <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
          実証済み「黄金スタック構成レシピ」（組み合わせの極意）
        </h2>
        <p className="text-xs sm:text-sm text-zinc-400 mt-1">
          ツールの単体比較ではなく、「どう組み合わせれば月額3,500円で年商1億円に耐えられるか」という配管設計図。
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {goldenStackRecipes.map((recipe) => (
          <div
            key={recipe.id}
            className="bg-[#08090D] border border-purple-500/20 rounded-lg p-5 flex flex-col justify-between relative overflow-hidden"
          >
            <div>
              <div className="flex items-center justify-between text-xs font-mono mb-2">
                <span className="text-purple-400 font-semibold">{recipe.targetScale}</span>
                <span className="text-emerald-400 font-bold">{recipe.marginTarget}</span>
              </div>
              <h4 className="text-base font-bold text-white tracking-tight mb-2">{recipe.name}</h4>
              <p className="text-xs text-zinc-400 leading-relaxed mb-4">{recipe.description}</p>

              <div className="space-y-2 border-t border-white/[0.06] pt-3">
                <div className="text-[11px] font-mono text-zinc-400 font-semibold mb-1">構成ツール配管:</div>
                {recipe.tools.map((t, i) => (
                  <div key={i} className="flex items-center justify-between text-xs bg-white/[0.02] border border-white/[0.04] px-2.5 py-1.5 rounded font-mono">
                    <span className="text-zinc-500 text-[11px]">{t.category}</span>
                    <span className="text-zinc-200 font-semibold">{t.toolName}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between">
              <span className="text-xs font-mono text-zinc-500">想定月額固定費:</span>
              <span className="text-xs font-mono font-bold text-emerald-400">{recipe.monthlyFixedCost}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
