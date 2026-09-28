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

  const hasAnyContent = steps.length > 0 || tools.length > 0 || Boolean(entity.strategy?.initialTraction?.some((text) => cleanText(text)));

  if (!hasAnyContent) return null;

  const badgeElement = (
    <div className="flex items-center gap-3 text-xs text-zinc-400">
      {hasKnownTeamSize && <span>チーム {teamSize.toLocaleString()}名</span>}
      {hasKnownInitialCapital && <span>初期資本 ¥{initialCapital.toLocaleString()}</span>}
    </div>
  );

  const initialTraction = (entity.strategy?.initialTraction || []).filter(Boolean);

  return (
    <InspectorSectionCard
      id="section-loot-blueprint"
      index="04"
      categoryEn={isHazardMode ? '再発防止' : '事業モデル'}
      titleJa={isHazardMode ? '撤退要因と再発防止' : '事業モデル'}
      badge={badgeElement}
      isHazardMode={isHazardMode}
    >
      {initialTraction.length > 0 && (
        <details className="border-b border-white/[0.07] px-4 py-3 sm:px-5">
          <summary className="cursor-pointer text-xs font-medium text-zinc-300">
            {isHazardMode ? '初期の判断とつまずき' : '立ち上げ初期の動き'}
          </summary>
          <div className="space-y-2 pt-3">
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
        </details>
      )}

      {/* 再現ステップ（アコーディオン） */}
      {steps.length > 0 && (
        <div className="divide-y divide-white/[0.06]">
          {steps.map((step) => (
            <details key={step.index} className="group bg-[#0c1017]">
              <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 hover:bg-white/[0.02] sm:px-5">
                <span className="min-w-0 flex-1">
                  <span className="mb-1 flex items-center gap-2 text-xs font-semibold text-sky-200">
                    <span className="font-mono tabular-nums">{step.index}</span>{step.label}
                  </span>
                  <span className="line-clamp-2 text-[13px] leading-relaxed text-zinc-200">{step.text}</span>
                </span>
                <ChevronDown className="h-4 w-4 shrink-0 text-zinc-400 transition-transform group-open:rotate-180" />
              </summary>

              <div className="border-t border-white/[0.05] bg-[#090d13] px-4 py-3.5 sm:px-5 space-y-2">
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

      {/* 実行基盤 / ツールスタック（存在する場合のみ表形式で描画） */}
      {tools.length > 0 && (
        <div className="border-t border-white/[0.07] px-4 py-4 sm:px-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Wrench className="w-3.5 h-3.5 text-zinc-400" />
                <span className="text-xs font-medium text-zinc-400">
                利用ツール
              </span>
            </div>
            <span className="font-mono text-[10px] tabular-nums text-zinc-400">
              {tools.length}件
            </span>
          </div>

          <div className="overflow-x-auto rounded-lg border border-white/[0.08] bg-[#090d13]">
            <table role="presentation" className="block w-full table-fixed border-collapse text-left text-xs font-sans sm:table">
              <thead className="hidden sm:table-header-group">
                <tr role="presentation" className="border-b border-white/[0.07] bg-white/[0.02] text-[10px] font-mono text-zinc-400">
                  <th className="w-1/4 px-3.5 py-2 font-semibold">ツール・インフラ名称</th>
                  <th className="px-3.5 py-2 font-semibold w-24">区分</th>
                  <th className="px-3.5 py-2 font-semibold">役割・目的</th>
                </tr>
              </thead>
              <tbody className="block sm:table-row-group divide-y divide-white/[0.05]">
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
                    <tr role="presentation" key={`${toolName}-${index}`} className="grid grid-cols-2 sm:table-row hover:bg-white/[0.02] transition-colors">
                      <td className="break-words px-3.5 py-2.5 align-top font-bold text-zinc-100">{toolName}</td>
                      <td className="break-words px-3.5 py-2.5 align-top text-zinc-400 font-mono text-[11px]">{toolCategory}</td>
                      <td className="col-span-2 whitespace-normal break-words px-3.5 pb-3 pt-0 align-top sm:py-2.5 text-zinc-300 text-xs">{toolPurpose}</td>
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
