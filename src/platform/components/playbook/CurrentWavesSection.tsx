'use client';

import React from 'react';
import {
  MacroIntelligenceData,
} from '@/lib/intelligence/macro-aggregator';
import {
  Flame,
  Zap,
} from 'lucide-react';

interface CurrentWavesSectionProps {
  currentWaves: MacroIntelligenceData['currentWaves'];
  selectedWaveId: string;
  setSelectedWaveId: (id: string) => void;
  activeWave?: MacroIntelligenceData['currentWaves'][number];
}

export const CurrentWavesSection: React.FC<CurrentWavesSectionProps> = ({
  currentWaves,
  selectedWaveId,
  setSelectedWaveId,
  activeWave,
}) => {
  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <div className="bg-[#090A0F] border border-emerald-500/20 rounded-lg p-4 sm:p-5">
        <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono font-semibold tracking-wider uppercase mb-1">
          <Flame className="w-3.5 h-3.5" />
          <span>Actionable Playbook Directory</span>
        </div>
        <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
          事業の組み立てを考える参考プレイブック
        </h2>
        <p className="text-xs sm:text-sm text-zinc-400 mt-1">
          顧客が支払う理由と事業の組み立て方の参考例。利益額や現在の有効性は未確認です。
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 space-y-3">
          {currentWaves.map((wave) => {
            const isSelected = selectedWaveId === wave.id;
            return (
              <div
                key={wave.id}
                onClick={() => setSelectedWaveId(wave.id)}
                className={`p-4 rounded-lg border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-white shadow-lg'
                    : 'bg-[#08090D] border-white/[0.06] text-zinc-300 hover:border-white/[0.15]'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                  <span className="text-emerald-400 font-bold">{wave.badge}</span>
                  <span className="text-zinc-500">回収: {wave.paybackDays}</span>
                </div>
                <h3 className="text-sm font-bold text-white tracking-tight mb-1.5 leading-snug">{wave.title}</h3>
                <div className="flex items-center gap-3 text-xs font-mono text-zinc-400 mb-1.5">
                  <span>月商: 約{(wave.medianRevenueJpy / 10000).toLocaleString()}万円</span>
                  <span>粗利: {wave.marginPercent}%</span>
                </div>
                <p className="text-xs text-zinc-400 line-clamp-2">{wave.targetPainWallet}</p>
              </div>
            );
          })}
        </div>

        <div className="lg:col-span-7">
          {activeWave && (
            <div className="bg-[#08090D] border border-white/[0.08] rounded-lg p-5 sm:p-6 space-y-4 sticky top-4">
              <div>
                <span className="px-2 py-0.5 rounded text-xs font-mono bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  {activeWave.viabilityLabel}
                </span>
                <h3 className="text-lg font-bold text-white tracking-tight mt-2">{activeWave.title}</h3>
                <div className="text-xs text-zinc-400 font-mono mt-1">
                  月商 約{(activeWave.medianRevenueJpy / 10000).toLocaleString()}万円 | 営業利益率 {activeWave.marginPercent}%
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-xs font-mono text-zinc-400 font-semibold">【顧客が思わずお金を払う切実な理由】</div>
                <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed bg-white/[0.02] border border-white/[0.04] p-3 rounded">
                  {activeWave.targetPainWallet}
                </p>
              </div>

              <div className="space-y-1">
                <div className="text-xs font-mono text-cyan-400 font-semibold">【なぜ今勝てるのか】</div>
                <p className="text-xs text-zinc-300 leading-relaxed">{activeWave.whyItWinsNow}</p>
              </div>

              <div className="bg-amber-950/20 border border-amber-500/20 p-3 rounded text-xs space-y-1">
                <div className="text-amber-400 font-mono font-bold">【賞味期限・後発参入の冷酷判定】</div>
                <p className="text-zinc-300 leading-relaxed">{activeWave.shelfLifeAnalysis}</p>
              </div>

              <div className="space-y-2 pt-2 border-t border-white/[0.06]">
                <div className="text-xs font-mono font-semibold text-emerald-400 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5" />
                  <span>【今夜別業界で同じズルを使って稼ぐ3ステップ】</span>
                </div>
                <div className="text-xs font-bold text-white">{activeWave.lootBlueprint.headline}</div>
                <div className="space-y-1.5">
                  {activeWave.lootBlueprint.steps.map((step, idx) => (
                    <div key={idx} className="bg-white/[0.02] border border-white/[0.06] p-2.5 rounded text-xs text-zinc-200 leading-relaxed">
                      {step}
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-white/[0.06]">
                <div className="text-[11px] font-mono text-zinc-400 mb-1">【裏付け実在企業】:</div>
                {activeWave.proofEntities.map((ent) => (
                  <div key={ent.id} className="flex items-center justify-between text-xs bg-white/[0.02] border border-white/[0.04] px-3 py-1.5 rounded">
                    <span className="font-bold text-white">{ent.name}</span>
                    <span className="text-emerald-400 font-mono">月商 約{(ent.monthlyRevenueJpy / 10000).toLocaleString()}万円</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
