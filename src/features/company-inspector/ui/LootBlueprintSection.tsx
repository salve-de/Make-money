'use client';

import { legacyText } from '../model/legacy-fields';

import React from 'react';
import {
  CheckCircle2,
  Crosshair,
  Terminal,
  Wrench,
  Zap
} from 'lucide-react';
import type { InspectorSectionProps } from '../model/section-props';

function confirmedText(value: string | null | undefined): string | null {
  const text = value?.trim();
  return text && text !== '未確認' && text !== 'UNKNOWN' ? text : null;
}

export function LootBlueprintSection({
  entity,
  isHazardMode
}: Pick<InspectorSectionProps, 'entity' | 'isHazardMode'>) {
  const loot = entity.lootBlueprint;
  const tools = entity.operations?.toolStack || [];
  const teamSize = entity.operations?.teamSize;
  const initialCapital = entity.operations?.initialCapitalRequired;
  const stealthEntry = confirmedText(loot?.stealthEntry) || confirmedText(entity.acquisition?.primaryFunnel);
  const tollGateSetup = confirmedText(loot?.tollGateSetup) || confirmedText(entity.architecturePattern);
  const incumbentBarrier = confirmedText(entity.meta?.incumbentDilemma?.cannibalizationBarrier)
    || confirmedText(legacyText(entity.strategy, 'moat'));
  const hasKnownTeamSize = !entity.operations?.isTeamSizeUnconfirmed && typeof teamSize === 'number' && teamSize > 0;
  const hasKnownInitialCapital = !entity.operations?.isCapitalUnconfirmed
    && typeof initialCapital === 'number'
    && initialCapital >= 0;

  return (
    <section
      id="section-loot-blueprint"
      className={`rounded-xl border p-4 sm:p-5 shadow-2xl relative overflow-hidden transition-all ${
        isHazardMode
          ? 'bg-[#0A0D14] border-red-500/25 shadow-[0_0_40px_rgba(239,68,68,0.08)]'
          : 'bg-[#0A0D14] border-white/[0.10] shadow-[0_0_40px_rgba(0,0,0,0.6)]'
      }`}
    >
      <div
        className={`absolute top-0 right-0 w-80 h-48 rounded-full blur-[90px] pointer-events-none ${
          isHazardMode ? 'bg-red-500/8' : 'bg-cyan-500/8'
        }`}
      />

      <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-white/[0.08] relative z-10">
        <div className="flex items-center gap-2.5">
          <Crosshair className={`w-4 h-4 shrink-0 ${isHazardMode ? 'text-red-400' : 'text-cyan-400'}`} />
          <h3
            className={`text-xs font-mono font-bold tracking-wider uppercase ${
              isHazardMode ? 'text-red-300' : 'text-zinc-100'
            }`}
          >
            {isHazardMode ? '致死トラップ検死書：二度と踏んではいけない地雷原' : '略奪転用ブループリント：今夜使える不公正なカンニングペーパー'}
          </h3>
        </div>
        <span className="text-[10px] font-mono text-zinc-400 bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.08]">
          LOOT BLUEPRINT
        </span>
      </div>

      <div className="space-y-3 mb-5">
        <div className="rounded-lg border border-white/[0.08] bg-[#0E131F] p-3.5 space-y-1.5 transition-colors hover:border-white/[0.15]">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-black px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
              STEP 1
            </span>
            <span className="font-mono text-xs font-bold text-zinc-100">
              【初動獲得】最初の顧客をどう取ったか
            </span>
          </div>
          <p className={`text-xs leading-relaxed font-sans pl-1 ${stealthEntry ? 'text-zinc-300' : 'text-zinc-500'}`}>
            {stealthEntry || '未確認：初期顧客の獲得経路を裏付ける情報がまだありません。'}
          </p>
          {loot?.targetPrey && (
            <div className="text-[11px] font-mono text-zinc-400 bg-black/40 px-2.5 py-1.5 rounded border border-white/[0.04] flex items-center gap-1.5">
              <span className="text-amber-400 font-bold">強奪対象の獲物:</span>
              <span className="text-zinc-200">{loot.targetPrey}</span>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-white/[0.08] bg-[#0E131F] p-3.5 space-y-1.5 transition-colors hover:border-white/[0.15]">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-black px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
              STEP 2
            </span>
            <span className="font-mono text-xs font-bold text-zinc-100">
              【原価・配管】何を使って、どう提供しているか
            </span>
          </div>
          <p className={`text-xs leading-relaxed font-sans pl-1 ${tollGateSetup ? 'text-zinc-300' : 'text-zinc-500'}`}>
            {tollGateSetup || '未確認：原価構造・利用基盤・提供方式を断定できる一次情報がありません。'}
          </p>
          {loot?.structuralFlaw && (
            <div className="text-[11px] font-mono text-zinc-400 bg-black/40 px-2.5 py-1.5 rounded border border-white/[0.04] flex items-center gap-1.5">
              <span className="text-cyan-400 font-bold">既存業界の構造的バグ:</span>
              <span className="text-zinc-200">{loot.structuralFlaw}</span>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-white/[0.08] bg-[#0E131F] p-3.5 space-y-1.5 transition-colors hover:border-white/[0.15]">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-black px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              STEP 3
            </span>
            <span className="font-mono text-xs font-bold text-zinc-100">
              【追随障壁】大手や競合が真似しにくい理由
            </span>
          </div>
          <p className={`text-xs leading-relaxed font-sans pl-1 ${incumbentBarrier ? 'text-zinc-300' : 'text-zinc-500'}`}>
            {incumbentBarrier || '未確認：競合・大手の追随障壁を裏付ける情報がまだありません。'}
          </p>
        </div>
      </div>

      {loot?.executionChecklist && loot.executionChecklist.length > 0 && (
        <div className="mb-5 rounded-lg border border-white/[0.06] bg-[#06080E] p-3.5">
          <div className="flex items-center gap-1.5 mb-2.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs font-mono font-bold text-zinc-200 uppercase">
              今夜実行する3手詰めチェックリスト
            </span>
          </div>
          <ul className="space-y-2 font-mono text-xs text-zinc-300">
            {loot.executionChecklist.map((step, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span className="text-zinc-200">{step}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="pt-4 border-t border-white/[0.08]">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Wrench className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-xs font-mono font-bold text-zinc-200 uppercase">
              確認できた武器庫（TECH STACK & INFRA）
            </span>
          </div>
          <div className="flex items-center gap-2 font-mono text-[10px] text-zinc-400">
            {hasKnownTeamSize && (
              <span>人員規模: <strong className="text-zinc-200">{teamSize}名</strong></span>
            )}
            {hasKnownInitialCapital && (
              <span>初期資本: <strong className="text-zinc-200">{initialCapital}</strong></span>
            )}
          </div>
        </div>

        {tools.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {tools.map((toolItem, idx) => {
              const toolName = typeof toolItem === 'string' ? toolItem : (toolItem as { name?: string })?.name || 'ツール未定義';
              const toolCategory = typeof toolItem === 'object' && toolItem && 'category' in toolItem ? (toolItem as { category?: string }).category : null;
              const toolPurpose = typeof toolItem === 'object' && toolItem && 'purpose' in toolItem ? (toolItem as { purpose?: string }).purpose : null;

              return (
                <span
                  key={idx}
                  title={toolPurpose || undefined}
                  className="inline-flex items-center gap-1.5 font-mono text-[11px] px-2.5 py-1 rounded bg-[#101522] border border-white/[0.08] text-zinc-200 hover:border-white/[0.2] transition-colors"
                >
                  <Terminal className="w-2.5 h-2.5 text-cyan-400" />
                  <span>{toolName}</span>
                  {toolCategory && (
                    <span className="text-[9px] px-1 py-0.5 rounded bg-white/[0.06] text-zinc-400">
                      {toolCategory}
                    </span>
                  )}
                </span>
              );
            })}
          </div>
        ) : (
          <div className="text-xs font-mono text-zinc-500 py-1">
            ツール構成は未確認です。
          </div>
        )}
      </div>
    </section>
  );
}
