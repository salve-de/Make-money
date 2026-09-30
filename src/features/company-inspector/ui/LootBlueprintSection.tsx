'use client';

import React from 'react';
import { ChevronDown } from 'lucide-react';
import type { InspectorSectionProps } from '../model/section-props';
import { InspectorSectionCard } from './InspectorSectionCard';
import { cleanDisplayText } from '@/shared/display-text';
import { legacyText } from '../model/legacy-fields';
import { formatYen } from '@/platform/utils/moneyDisplay';

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
  return cleanDisplayText(trimmed);
}

export function LootBlueprintSection({
  entity,
  isHazardMode,
  isPro,
}: Pick<InspectorSectionProps, 'entity' | 'isHazardMode' | 'isPro'>) {
  const loot = entity.lootBlueprint;
  const teamSize = entity.operations?.teamSize;
  const initialCapital = entity.operations?.initialCapitalRequired;

  const stealthEntry = cleanText(loot?.stealthEntry);
  const tollGateSetup = cleanText(loot?.tollGateSetup) || cleanText(entity.architecturePattern);
  const incumbentBarrier = (isPro ? cleanText(entity.meta?.incumbentDilemma?.cannibalizationBarrier) : null)
    || cleanText(legacyText(entity.strategy, 'moat'));

  const hasKnownTeamSize = !entity.operations?.isTeamSizeUnconfirmed && typeof teamSize === 'number' && teamSize > 0;
  const hasKnownInitialCapital = entity.operations?.isCapitalUnconfirmed === false
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
      extraLabel: cleanText(loot?.targetPrey) ? 'ターゲット' : null,
      extra: cleanText(loot?.targetPrey),
    });
  }

  if (tollGateSetup) {
    steps.push({
      index: String(steps.length + 1).padStart(2, '0'),
      label: isHazardMode ? '構造' : '提供構造',
      title: isHazardMode ? 'どの構造が損失を増幅したか' : '何を使って、どう提供するか',
      text: tollGateSetup,
      extraLabel: cleanText(loot?.structuralFlaw) ? '業界の摩擦' : null,
      extra: cleanText(loot?.structuralFlaw),
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

  if (cleanText(loot?.targetPrey) && !stealthEntry) steps.push({ index: String(steps.length + 1).padStart(2, '0'), label: '対象顧客', title: '狙う顧客', text: cleanText(loot?.targetPrey)! });
  if (cleanText(loot?.structuralFlaw) && !tollGateSetup) steps.push({ index: String(steps.length + 1).padStart(2, '0'), label: '業界の摩擦', title: '既存の構造上の課題', text: cleanText(loot?.structuralFlaw)! });
  const initialTraction = (entity.strategy?.initialTraction || []).filter((text) => cleanText(text));
  const hasAnyContent = steps.length > 0 || initialTraction.length > 0;

  if (!hasAnyContent) return null;

  const badgeElement = (
    <div className="flex items-center gap-3 text-xs text-zinc-400">
      {hasKnownTeamSize && <span>チーム {teamSize.toLocaleString()}名</span>}
      {hasKnownInitialCapital && <span>初期資本 {formatYen(initialCapital)}</span>}
    </div>
  );

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
        <details open className="border-b border-term-line-soft px-4 py-3 sm:px-5">
          <summary className="cursor-pointer text-xs font-medium text-zinc-300">
            {isHazardMode ? '初期の判断とつまずき' : '立ち上げ初期の動き'}
          </summary>
          <div className="space-y-2 pt-3">
            {initialTraction.map((item, idx) => (
              <div key={idx} className="flex items-start gap-2.5 text-xs sm:text-[13px] text-zinc-200 leading-relaxed">
                <span className={`font-mono text-xs font-bold shrink-0 mt-0.5 ${
                  isHazardMode ? 'text-term-danger' : 'text-term-fg'
                }`}>
                  #{idx + 1}
                </span>
                <span>{cleanDisplayText(item)}</span>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* 再現ステップ（アコーディオン） */}
      {steps.length > 0 && (
        <div className="divide-y divide-term-line-soft">
          {steps.map((step) => (
            <details key={step.index} open className="group bg-term-panel">
              <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 hover:bg-term-head sm:px-5">
                <span className="min-w-0 flex-1">
                  <span className="mb-1 flex items-center gap-2 text-xs font-semibold text-term-fg">
                    <span className="font-mono tabular-nums">{step.index}</span>{step.label}
                  </span>
                  <span className="text-[13px] leading-relaxed text-zinc-200">{step.title}</span>
                </span>
                <ChevronDown className="h-4 w-4 shrink-0 text-zinc-400 transition-transform group-open:rotate-180" />
              </summary>

              <div className="border-t border-term-line-soft bg-term-bg px-4 py-3.5 sm:px-5 space-y-2">
                <p className="text-xs sm:text-[13px] leading-relaxed text-zinc-200">
                  {step.text}
                </p>
                {step.extra && step.extraLabel && (
                  <div className="mt-2.5 flex items-start gap-2 border-l-2 border-term-line pl-3 py-0.5">
                    <span className="text-xs font-mono text-zinc-400 font-semibold shrink-0">
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

    </InspectorSectionCard>
  );
}
