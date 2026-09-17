'use client';

import React from 'react';
import {
  MacroIntelligenceData,
} from '@/lib/intelligence/macro-aggregator';
import {
  AlertTriangle,
  Skull,
  CheckCircle2,
} from 'lucide-react';

interface DeathTrapsSectionProps {
  shelfLifeAlerts: MacroIntelligenceData['shelfLifeAlerts'];
  deathTraps: MacroIntelligenceData['deathTraps'];
  selectedTrapId: string;
  setSelectedTrapId: (id: string) => void;
  activeTrap?: MacroIntelligenceData['deathTraps'][number];
}

export const DeathTrapsSection: React.FC<DeathTrapsSectionProps> = ({
  shelfLifeAlerts,
  deathTraps,
  selectedTrapId,
  setSelectedTrapId,
  activeTrap,
}) => {
  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* 週次即死アラートバナー */}
      <div className="bg-[#0A0709] border border-rose-500/25 rounded-lg p-4 sm:p-5">
        <div className="flex items-center gap-2 text-rose-400 text-xs font-mono font-semibold tracking-wider uppercase mb-1">
          <AlertTriangle className="w-3.5 h-3.5 text-rose-400 animate-bounce" />
          <span>This Week&apos;s Shelf-Life Downgrade Alerts</span>
        </div>
        <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
          先週まで動いていた手法の「即死判定格下げアラート」
        </h2>
        <p className="text-xs sm:text-sm text-zinc-400 mt-1">
          手法の有効性を見直すための参考事例。判定は固定サンプルであり、現在の規約・価格・有効性は未確認です。
        </p>
      </div>

      {/* 直近の格下げ警告カード */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {shelfLifeAlerts.map((alert) => (
          <div
            key={alert.id}
            className="bg-[#09080B] border border-rose-500/30 rounded-lg p-5 space-y-3 relative overflow-hidden"
          >
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold">
                {alert.badge} ({alert.downgradeDate})
              </span>
              <span className="text-zinc-500">
                {alert.previousStatus} ➔ <span className="text-rose-400 font-bold">{alert.currentStatus}</span>
              </span>
            </div>

            <h3 className="text-base font-bold text-white tracking-tight">{alert.playbookName}</h3>

            <div className="space-y-1.5 text-xs">
              <div className="text-rose-400 font-mono font-semibold">【判定降格のトリガー】:</div>
              <p className="text-zinc-300 leading-relaxed bg-white/[0.02] border border-white/[0.04] p-2.5 rounded">
                {alert.triggerEvent}
              </p>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="text-zinc-400 font-mono font-semibold">【死因のメカニズム】:</div>
              <p className="text-zinc-300 leading-relaxed">{alert.fatalReason}</p>
            </div>

            <div className="bg-emerald-950/20 border border-emerald-500/20 p-3 rounded text-xs space-y-1">
              <div className="text-emerald-400 font-mono font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>【生き残るための方向転換（Pivot）】</span>
              </div>
              <p className="text-zinc-200 leading-relaxed">{alert.survivalPivot}</p>
            </div>

            <div className="text-[11px] font-mono text-zinc-500 pt-2 border-t border-white/[0.06]">
              犠牲事例: <span className="text-zinc-300">{alert.victimExample}</span>
            </div>
          </div>
        ))}
      </div>

      {/* 恒久的な即死アンチパターン検死録 */}
      <div className="pt-6 border-t border-white/[0.08] space-y-4">
        <div className="text-xs font-mono text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
          <Skull className="w-3.5 h-3.5 text-rose-400" />
          <span>Historical Post-Mortem Registry / 過去の爆死解剖カルテ</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-3">
            {deathTraps.map((trap) => {
              const isSelected = selectedTrapId === trap.id;
              return (
                <div
                  key={trap.id}
                  onClick={() => setSelectedTrapId(trap.id)}
                  className={`p-4 rounded-lg border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-rose-500/10 border-rose-500/40 text-white shadow-lg'
                      : 'bg-[#08090D] border-white/[0.06] text-zinc-300 hover:border-white/[0.15]'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                    <span className="text-rose-400 font-bold">{trap.badge}</span>
                    <span className="text-zinc-500">損失: {trap.lossScale.split('/')[0]}</span>
                  </div>
                  <h4 className="text-sm font-bold text-white tracking-tight mb-1.5 leading-snug">
                    {trap.title}
                  </h4>
                  <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">{trap.mechanism}</p>
                </div>
              );
            })}
          </div>

          <div className="lg:col-span-7">
            {activeTrap && (
              <div className="bg-[#08090D] border border-white/[0.08] rounded-lg p-5 sm:p-6 space-y-4 sticky top-4">
                <div>
                  <span className="px-2 py-0.5 rounded text-xs font-mono bg-rose-500/15 text-rose-300 border border-rose-500/30">
                    {activeTrap.badge}
                  </span>
                  <h3 className="text-lg font-bold text-white tracking-tight mt-2">{activeTrap.title}</h3>
                  <div className="text-xs text-zinc-400 font-mono mt-1">被害規模: {activeTrap.lossScale}</div>
                </div>

                <div className="space-y-1">
                  <div className="text-xs font-mono text-zinc-400 font-semibold">【死因解剖メカニズム】</div>
                  <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed bg-white/[0.02] border border-white/[0.04] p-3 rounded">
                    {activeTrap.mechanism}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <div className="text-xs font-mono text-amber-400 font-semibold">【前兆サイン】</div>
                  <ul className="space-y-1">
                    {activeTrap.warningSigns.map((sign, i) => (
                      <li key={i} className="text-xs text-zinc-300 flex items-start gap-2">
                        <span className="text-rose-400 font-bold shrink-0">✕</span>
                        <span>{sign}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-emerald-950/20 border border-emerald-500/20 p-3 rounded text-xs space-y-1">
                  <div className="text-emerald-400 font-mono font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>【生存の解毒剤】</span>
                  </div>
                  <p className="text-zinc-200 leading-relaxed">{activeTrap.antidote}</p>
                </div>

                <div className="pt-3 border-t border-white/[0.06] space-y-2">
                  <div className="text-[11px] font-mono text-zinc-400">【この罠で爆死した実在企業】:</div>
                  {activeTrap.victimEntities.map((v) => (
                    <div key={v.id} className="bg-white/[0.02] border border-white/[0.06] p-3 rounded text-xs space-y-1">
                      <div className="font-bold text-white">
                        <span>{v.name}</span>
                      </div>
                      <div className="text-rose-300 font-semibold text-[11px]">{v.headline}</div>
                      <div className="text-zinc-400 text-[11px]">{v.punchline}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
