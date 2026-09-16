'use client';

import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { legacyText } from '../model/legacy-fields';
import type { InspectorSectionProps } from '../model/section-props';

export function LootBlueprintSection({
  entity,
  isHazardMode
}: Pick<InspectorSectionProps, 'entity' | 'isHazardMode'>) {
  const loot = entity.lootBlueprint;
  const tools = entity.operations?.toolStack || [];
  const teamSize = entity.operations?.isTeamSizeUnconfirmed ? undefined : entity.operations?.teamSize;
  const initialCapital = entity.operations?.isCapitalUnconfirmed ? undefined : entity.operations?.initialCapitalRequired;

  return (
    <section id="section-loot-blueprint" className="scroll-mt-4">
      {/* 統合ブループリント調書サーフェス */}
      <div className={`rounded-md border bg-[#10131C] overflow-hidden ${
        isHazardMode ? 'border-red-500/30' : 'border-white/[0.12]'
      }`}>
        {/* セクションヘッダー */}
        <div className={`flex items-center justify-between px-4 py-2.5 border-b ${
          isHazardMode ? 'bg-red-950/25 border-red-500/20' : 'bg-[#131724] border-white/[0.10]'
        }`}>
          <div className="flex items-center gap-2.5">
            <span className={`font-mono text-[11px] font-bold tracking-wider uppercase ${
              isHazardMode ? 'text-red-400' : 'text-zinc-300'
            }`}>
              REPLICATION BLUEPRINT // {isHazardMode ? '致命的破綻の設計図' : '収益配管 ＆ 略奪転用設計図'}
            </span>
          </div>
          <span className="font-mono text-[10px] text-zinc-400">
            SYSTEM BLUEPRINT
          </span>
        </div>

        {/* 3ステップ略奪転用プロセス（カード入れ子なし・クリーンな3行構成） */}
        <div className="divide-y divide-white/[0.08]">
          {/* STEP 01 */}
          <div className="p-4 flex flex-col md:flex-row md:items-start gap-3 md:gap-5 hover:bg-white/[0.01] transition-colors">
            <div className="w-full md:w-48 shrink-0 space-y-1">
              <div className="flex items-center gap-2">
                <span className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  isHazardMode ? 'text-red-400 bg-red-950/40 border border-red-500/30' : 'text-zinc-300 bg-white/[0.06] border border-white/[0.10]'
                }`}>
                  STEP 01
                </span>
                <span className="font-mono text-[11px] font-semibold tracking-wider text-zinc-300 uppercase">
                  ENTRY FUNNEL
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                {isHazardMode ? '侵入経路・死因の発端' : '初動の侵入経路・顧客動線'}
              </p>
            </div>
            <div className="flex-1 min-w-0 space-y-2">
              <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                {loot?.stealthEntry || entity.acquisition?.primaryFunnel || '既存プラットフォームの規約の隙間や不満客を狙い撃ちにして初期トラフィックを横取りする動線。'}
              </p>
              {loot?.targetPrey && (
                <div className="text-[11px] font-mono text-zinc-400 bg-white/[0.02] px-2.5 py-1.5 rounded border border-white/[0.04] flex items-center gap-2">
                  <span className="text-zinc-300 font-semibold">ターゲット客層:</span>
                  <span className="text-zinc-200">{loot.targetPrey}</span>
                </div>
              )}
            </div>
          </div>

          {/* STEP 02 */}
          <div className="p-4 flex flex-col md:flex-row md:items-start gap-3 md:gap-5 hover:bg-white/[0.01] transition-colors">
            <div className="w-full md:w-48 shrink-0 space-y-1">
              <div className="flex items-center gap-2">
                <span className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  isHazardMode ? 'text-red-400 bg-red-950/40 border border-red-500/30' : 'text-zinc-300 bg-white/[0.06] border border-white/[0.10]'
                }`}>
                  STEP 02
                </span>
                <span className="font-mono text-[11px] font-semibold tracking-wider text-zinc-300 uppercase">
                  MARGIN PIPELINE
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                {isHazardMode ? '原価破綻・出血構造' : '提供方式・原価圧縮配管'}
              </p>
            </div>
            <div className="flex-1 min-w-0 space-y-2">
              <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                {loot?.tollGateSetup || entity.architecturePattern || '既存のツールやAPIを裏側で配管し、固定費と開発コストを極小化して利益を残す構造。'}
              </p>
              {loot?.structuralFlaw && (
                <div className="text-[11px] font-mono text-zinc-400 bg-white/[0.02] px-2.5 py-1.5 rounded border border-white/[0.04] flex items-center gap-2">
                  <span className="text-zinc-300 font-semibold">既存業界の構造欠陥:</span>
                  <span className="text-zinc-200">{loot.structuralFlaw}</span>
                </div>
              )}
            </div>
          </div>

          {/* STEP 03 */}
          <div className="p-4 flex flex-col md:flex-row md:items-start gap-3 md:gap-5 hover:bg-white/[0.01] transition-colors">
            <div className="w-full md:w-48 shrink-0 space-y-1">
              <div className="flex items-center gap-2">
                <span className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  isHazardMode ? 'text-red-400 bg-red-950/40 border border-red-500/30' : 'text-zinc-300 bg-white/[0.06] border border-white/[0.10]'
                }`}>
                  STEP 03
                </span>
                <span className="font-mono text-[11px] font-semibold tracking-wider text-zinc-300 uppercase">
                  DEFENSE MOAT
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                {isHazardMode ? '防壁崩壊の死角' : '参入障壁・大手の自縛死角'}
              </p>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                {entity.meta?.incumbentDilemma?.cannibalizationBarrier || legacyText(entity.strategy, 'moat') || '大手が参入すると既存の単価・商流を自ら破壊してしまうため、指をくわえて見逃さざるを得ないカニバリズム死角。'}
              </p>
            </div>
          </div>

          {/* 実行チェックリスト */}
          {loot?.executionChecklist && loot.executionChecklist.length > 0 && (
            <div className="p-4 space-y-2.5 bg-white/[0.01]">
              <div className="font-mono text-[11px] font-semibold text-zinc-300 uppercase tracking-wider">
                EXECUTION CHECKLIST // 実行検証チェックリスト
              </div>
              <ul className="space-y-1.5">
                {loot.executionChecklist.map((step, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-xs text-zinc-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" />
                    <span className="leading-relaxed font-sans flex-1">{step}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 稼働ツールスタック要約 */}
          <div className="p-4 space-y-2.5 bg-white/[0.01]">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="font-mono text-[11px] font-semibold text-zinc-300 uppercase tracking-wider">
                TECH STACK // 稼働インフラ構成
              </div>
              <div className="flex items-center gap-3 font-mono text-[11px] text-zinc-400">
                {teamSize !== undefined && (
                  <span>人員: <strong className="text-zinc-200">{teamSize > 0 ? `${teamSize}名` : '1人（自動化）'}</strong></span>
                )}
                {initialCapital && (
                  <span>初期資本: <strong className="text-zinc-200">{initialCapital}</strong></span>
                )}
              </div>
            </div>

            {tools.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {tools.map((toolItem, idx) => {
                  const toolName = typeof toolItem === 'string' ? toolItem : (toolItem as { name?: string })?.name || 'ツール未定義';
                  const toolCategory = typeof toolItem === 'object' && toolItem && 'category' in toolItem ? (toolItem as { category?: string }).category : null;

                  return (
                    <div
                      key={idx}
                      className="inline-flex items-center gap-1.5 font-mono text-[11px] px-2.5 py-1 rounded bg-white/[0.03] border border-white/[0.06] text-zinc-300"
                    >
                      <span>{toolName}</span>
                      {toolCategory && (
                        <span className="text-[9px] text-zinc-400">
                          ({toolCategory})
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-xs font-mono text-zinc-400">
                固有のツール構成は未確認。
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
