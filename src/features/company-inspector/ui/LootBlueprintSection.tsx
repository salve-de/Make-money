'use client';

import React from 'react';
import { ChevronDown, Wrench } from 'lucide-react';
import type { InspectorSectionProps } from '../model/section-props';
import { InspectorSectionCard } from './InspectorSectionCard';
import { legacyText } from '../model/legacy-fields';

function cleanText(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (
    !trimmed ||
    trimmed === '未確認' ||
    trimmed === 'UNKNOWN' ||
    trimmed.startsWith('未確認：') ||
    trimmed.startsWith('未確認:')
  ) {
    return null;
  }
  return trimmed;
}

export function LootBlueprintSection({
  entity,
  isHazardMode,
}: Pick<InspectorSectionProps, 'entity' | 'isHazardMode'>) {
  const loot = entity.lootBlueprint;
  const tools = entity.operations?.toolStack || [];
  const teamSize = entity.operations?.teamSize;
  const initialCapital = entity.operations?.initialCapitalRequired;

  const stealthEntry = cleanText(loot?.stealthEntry) || cleanText(entity.acquisition?.primaryFunnel);
  const tollGateSetup = cleanText(loot?.tollGateSetup) || cleanText(entity.architecturePattern);
  const incumbentBarrier = cleanText(entity.meta?.incumbentDilemma?.cannibalizationBarrier)
    || cleanText(legacyText(entity.strategy, 'moat'));

  const hasKnownTeamSize = !entity.operations?.isTeamSizeUnconfirmed && typeof teamSize === 'number' && teamSize > 0;
  const hasKnownInitialCapital = !entity.operations?.isCapitalUnconfirmed
    && typeof initialCapital === 'number'
    && initialCapital >= 0;

  // データが存在するステップのみを抽出（カス表示ゼロ）
  const steps: Array<{
    index: string;
    label: string;
    title: string;
    text: string;
    extraLabel?: string | null;
    extra?: string | null;
  }> = [];

  if (stealthEntry) {
    steps.push({
      index: String(steps.length + 1).padStart(2, '0'),
      label: isHazardMode ? '入口' : '顧客獲得',
      title: isHazardMode ? 'どこで無理が始まったか' : '最初の顧客をどう取るか',
      text: stealthEntry,
      extraLabel: loot?.targetPrey ? 'ターゲット' : null,
      extra: loot?.targetPrey || null,
    });
  }

  if (tollGateSetup) {
    steps.push({
      index: String(steps.length + 1).padStart(2, '0'),
      label: isHazardMode ? '構造' : '提供構造',
      title: isHazardMode ? 'どの構造が損失を増幅したか' : '何を使って、どう提供するか',
      text: tollGateSetup,
      extraLabel: loot?.structuralFlaw ? '業界の摩擦' : null,
      extra: loot?.structuralFlaw || null,
    });
  }

  if (incumbentBarrier) {
    steps.push({
      index: String(steps.length + 1).padStart(2, '0'),
      label: isHazardMode ? '防止' : '防御壁',
      title: isHazardMode ? '同じ失敗を避ける条件' : '競合が真似しにくい理由',
      text: incumbentBarrier,
    });
  }

  const checklist = (loot?.executionChecklist || []).filter(Boolean);
  const hasAnyContent = steps.length > 0 || checklist.length > 0 || tools.length > 0;

  if (!hasAnyContent) return null;

  const badgeElement = (
    <div className="flex items-center gap-3 font-mono text-[11px] text-zinc-400">
      {hasKnownTeamSize && <span>TEAM {teamSize.toLocaleString()}名</span>}
      {hasKnownInitialCapital && <span>CAPITAL ¥{initialCapital.toLocaleString()}</span>}
    </div>
  );

  const leadText = isHazardMode
    ? '同じ過ちを犯さないための再発防止の実行手順と、損失を回避するための撤退条件。'
    : '今夜使える不公正なカンニングペーパー。創業者が実際に打った初動のズル、自動で現金を吸い上げる関所配管、現場で稼働している実兵器を完全公開する。';

  const initialTraction = (entity.strategy?.initialTraction || []).filter(Boolean);

  return (
    <InspectorSectionCard
      id="section-loot-blueprint"
      index="04"
      categoryEn={isHazardMode ? 'FAILURE PLAYBOOK' : 'REPLICATION PLAYBOOK'}
      titleJa={isHazardMode ? '再発防止の実行順 ＆ 教訓' : '再現・略奪の実行手順'}
      badge={badgeElement}
      isHazardMode={isHazardMode}
    >
      {/* セクション・リード文 */}
      <div className="px-4 py-3 sm:px-5 sm:py-3.5 bg-white/[0.02] border-b border-white/[0.06] text-xs sm:text-[13px] text-zinc-300 leading-relaxed font-sans">
        <span className={`text-[10px] font-mono uppercase tracking-wider font-bold px-1.5 py-0.5 rounded border mr-2 ${
          isHazardMode
            ? 'bg-red-500/10 text-red-300 border-red-500/30'
            : 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
        }`}>
          {isHazardMode ? 'LESSONS LEARNED / 敗因と教訓' : 'LOOT BLUEPRINT / 略奪再現手順'}
        </span>
        {leadText}
      </div>

      {/* 初動突破の泥臭い事実ログ（INITIAL TRACTION） */}
      {initialTraction.length > 0 && (
        <div className={`p-4 sm:p-5 border-b border-white/[0.07] ${
          isHazardMode ? 'bg-red-950/15' : 'bg-cyan-950/15'
        }`}>
          <div className="mb-2.5 flex items-center gap-2">
            <span className={`text-[10px] font-mono font-bold uppercase tracking-wider ${
              isHazardMode ? 'text-red-300' : 'text-cyan-300'
            }`}>
              {isHazardMode ? 'CRITICAL MISTAKES / 初動で踏み抜いた地雷' : 'INITIAL TRACTION / 創業者が打った初期の泥臭い事実'}
            </span>
          </div>
          <div className="space-y-2">
            {initialTraction.map((item, idx) => (
              <div key={idx} className="flex items-start gap-2.5 text-xs sm:text-[13px] text-zinc-200 leading-relaxed">
                <span className={`font-mono text-xs font-bold shrink-0 mt-0.5 ${
                  isHazardMode ? 'text-red-400' : 'text-cyan-400'
                }`}>
                  #{idx + 1}
                </span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 再現ステップ（アコーディオン） */}
      {steps.length > 0 && (
        <div className="divide-y divide-white/[0.06]">
          {steps.map((step) => (
            <details key={step.index} open className="group bg-[#0c1017]">
              <summary className="grid cursor-pointer list-none grid-cols-[36px_72px_minmax(0,1fr)_auto] items-center gap-2.5 px-4 py-3.5 transition-colors hover:bg-white/[0.02] focus-visible:outline-none sm:grid-cols-[40px_84px_minmax(0,1fr)_auto] sm:px-5">
                <span className="font-mono text-xs tabular-nums text-cyan-400 font-bold">
                  {step.index}
                </span>
                <span className={`text-[11px] font-mono font-semibold ${
                  isHazardMode ? 'text-red-400' : 'text-zinc-300'
                }`}>
                  {step.label}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-xs sm:text-[13px] font-bold text-zinc-100">
                    {step.title}
                  </span>
                </span>
                <ChevronDown className="h-4 w-4 text-zinc-400 transition-transform group-open:rotate-180 shrink-0" />
              </summary>

              <div className="border-t border-white/[0.05] bg-[#090d13] px-4 py-3.5 sm:pl-[134px] sm:pr-6 space-y-2">
                <p className="text-xs sm:text-[13px] leading-relaxed text-zinc-200">
                  {step.text}
                </p>
                {step.extra && step.extraLabel && (
                  <div className="mt-2.5 flex items-start gap-2 border-l-2 border-white/[0.12] pl-3 py-0.5">
                    <span className="text-[10px] font-mono text-zinc-400 font-semibold shrink-0">
                      {step.extraLabel}:
                    </span>
                    <span className="text-xs text-zinc-300 leading-relaxed">
                      {step.extra}
                    </span>
                  </div>
                )}
              </div>
            </details>
          ))}
        </div>
      )}

      {/* 初動アクションチェックリスト */}
      {checklist.length > 0 && (
        <div className="border-t border-white/[0.07] bg-[#090d13] px-4 py-4 sm:px-5">
          <div className="mb-2.5 text-[10px] font-mono font-bold tracking-wider uppercase text-zinc-400">
            NEXT ACTIONS（初動チェックリスト）
          </div>
          <div className="divide-y divide-white/[0.05]">
            {checklist.map((item, index) => (
              <div
                key={index}
                className="grid grid-cols-[28px_minmax(0,1fr)] gap-2 py-2.5 text-xs sm:text-[13px] leading-relaxed"
              >
                <span className="font-mono tabular-nums text-cyan-400 font-bold">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="text-zinc-200 font-medium">{item}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 実行基盤 / ツールスタック（存在する場合のみ表形式で描画） */}
      {tools.length > 0 && (
        <div className="border-t border-white/[0.07] px-4 py-4 sm:px-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Wrench className="w-3.5 h-3.5 text-zinc-400" />
              <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-zinc-400">
                TECH STACK / 実行基盤
              </span>
            </div>
            <span className="font-mono text-[10px] tabular-nums text-zinc-400">
              {tools.length} items
            </span>
          </div>

          <div className="overflow-x-auto rounded-lg border border-white/[0.08] bg-[#090d13]">
            <table className="w-full min-w-[500px] border-collapse text-left text-xs font-sans">
              <thead>
                <tr className="border-b border-white/[0.07] bg-white/[0.02] text-[10px] font-mono text-zinc-400">
                  <th className="px-3.5 py-2 font-semibold">ツール・インフラ名称</th>
                  <th className="px-3.5 py-2 font-semibold w-24">区分</th>
                  <th className="px-3.5 py-2 font-semibold">役割・目的</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {tools.map((toolItem, index) => {
                  const toolName = typeof toolItem === 'string'
                    ? toolItem
                    : (toolItem as { name?: string })?.name || '名称不明';
                  const toolCategory = typeof toolItem === 'object' && toolItem && 'category' in toolItem
                    ? (toolItem as { category?: string }).category || '—'
                    : '—';
                  const toolPurpose = typeof toolItem === 'object' && toolItem && 'purpose' in toolItem
                    ? (toolItem as { purpose?: string }).purpose || '—'
                    : '—';

                  return (
                    <tr key={`${toolName}-${index}`} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-3.5 py-2.5 font-bold text-zinc-100">{toolName}</td>
                      <td className="px-3.5 py-2.5 text-zinc-400 font-mono text-[11px]">{toolCategory}</td>
                      <td className="px-3.5 py-2.5 text-zinc-300 text-xs">{toolPurpose}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </InspectorSectionCard>
  );
}
