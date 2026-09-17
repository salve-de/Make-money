'use client';

import { legacyText } from '../model/legacy-fields';
import React from 'react';
import { ChevronDown } from 'lucide-react';
import type { InspectorSectionProps } from '../model/section-props';

function confirmedText(value: string | null | undefined): string | null {
  const text = value?.trim();
  return text && text !== '未確認' && text !== 'UNKNOWN' ? text : null;
}

function preview(text: string, length = 92): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  return normalized.length > length ? `${normalized.slice(0, length - 1)}…` : normalized;
}

export function LootBlueprintSection({
  entity,
  isHazardMode,
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

  const steps = [
    {
      index: '01',
      label: isHazardMode ? '入口' : '顧客獲得',
      title: isHazardMode ? 'どこで無理が始まったか' : '最初の顧客をどう取るか',
      text: stealthEntry || '未確認：初期顧客の獲得経路を裏付ける情報がありません。',
      extraLabel: loot?.targetPrey ? '対象' : null,
      extra: loot?.targetPrey || null,
    },
    {
      index: '02',
      label: isHazardMode ? '構造' : '提供',
      title: isHazardMode ? 'どの構造が損失を増幅したか' : '何を使って、どう提供するか',
      text: tollGateSetup || '未確認：原価構造・利用基盤・提供方式を断定できる情報がありません。',
      extraLabel: loot?.structuralFlaw ? '業界側の摩擦' : null,
      extra: loot?.structuralFlaw || null,
    },
    {
      index: '03',
      label: isHazardMode ? '防止' : '防御',
      title: isHazardMode ? '同じ失敗を避ける条件' : '競合が真似しにくい理由',
      text: incumbentBarrier || '未確認：競合・大手の追随障壁を裏付ける情報がありません。',
      extraLabel: null,
      extra: null,
    },
  ];

  return (
    <section
      id="section-loot-blueprint"
      className={`overflow-hidden rounded-lg border bg-[#0e131b] ${
        isHazardMode ? 'border-red-500/25' : 'border-white/[0.09]'
      }`}
    >
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-white/[0.07] px-4 py-3.5 sm:px-5">
        <div>
          <div className={`text-[10px] font-medium tracking-wide ${isHazardMode ? 'text-red-300' : 'text-blue-300'}`}>
            {isHazardMode ? 'FAILURE PLAYBOOK' : 'REPLICATION / EXECUTION'}
          </div>
          <h3 className="mt-0.5 text-sm font-semibold text-zinc-100">
            {isHazardMode ? '再発防止の実行順' : '再現するなら、この順番'}
          </h3>
          <p className="mt-1 text-[11px] text-zinc-500">
            まず流れだけ見て、必要なSTEPだけ開いて詳細を確認します。
          </p>
        </div>
        <div className="flex items-center gap-3 font-mono text-[9px] text-zinc-500">
          {hasKnownTeamSize && <span>TEAM {teamSize}</span>}
          {hasKnownInitialCapital && <span>CAPITAL {initialCapital.toLocaleString()}</span>}
        </div>
      </div>

      <div className="divide-y divide-white/[0.07]">
        {steps.map((step) => (
          <details key={step.index} className="group bg-[#0f141d] open:bg-[#0b0f15]">
            <summary className="grid cursor-pointer list-none grid-cols-[36px_78px_minmax(0,1fr)_auto] items-center gap-2 px-4 py-3 transition-colors hover:bg-white/[0.025] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-400/70 sm:grid-cols-[42px_92px_minmax(0,1fr)_auto] sm:px-5">
              <span className="font-mono text-[10px] tabular-nums text-zinc-600">{step.index}</span>
              <span className={`text-[10px] font-medium ${isHazardMode ? 'text-red-300' : 'text-zinc-400'}`}>
                {step.label}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[12px] font-semibold text-zinc-100">{step.title}</span>
                <span className="mt-1 block truncate text-[11px] text-zinc-500" title={step.text}>
                  {preview(step.text)}
                </span>
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-zinc-600 transition-transform group-open:rotate-180" />
            </summary>

            <div className="border-t border-white/[0.05] px-4 py-3 sm:pl-[159px] sm:pr-5">
              <p className="text-[12px] leading-relaxed text-zinc-300">{step.text}</p>
              {step.extra && step.extraLabel && (
                <div className="mt-3 grid gap-1 border-l border-white/[0.10] pl-3 sm:grid-cols-[96px_minmax(0,1fr)] sm:gap-3">
                  <span className="text-[10px] text-zinc-500">{step.extraLabel}</span>
                  <span className="text-[11px] leading-relaxed text-zinc-300">{step.extra}</span>
                </div>
              )}
            </div>
          </details>
        ))}
      </div>

      {loot?.executionChecklist && loot.executionChecklist.length > 0 && (
        <div className="border-t border-white/[0.07] bg-[#0b0f15] px-4 py-3.5 sm:px-5">
          <div className="mb-2 text-[10px] font-medium text-zinc-500">NEXT ACTIONS</div>
          <div className="divide-y divide-white/[0.05]">
            {loot.executionChecklist.map((step, index) => (
              <div key={index} className="grid grid-cols-[30px_minmax(0,1fr)] gap-2 py-2 text-[11px] leading-relaxed">
                <span className="font-mono tabular-nums text-zinc-600">{String(index + 1).padStart(2, '0')}</span>
                <span className="text-zinc-300">{step}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="border-t border-white/[0.07] px-4 py-3.5 sm:px-5">
        <div className="mb-2.5 flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-medium text-zinc-500">TECH STACK / INFRA</div>
            <div className="mt-0.5 text-[11px] text-zinc-400">確認できた実行基盤</div>
          </div>
          <span className="font-mono text-[9px] tabular-nums text-zinc-600">{tools.length} items</span>
        </div>

        {tools.length > 0 ? (
          <div className="overflow-hidden rounded-md border border-white/[0.07]">
            <div className="grid grid-cols-[minmax(100px,0.8fr)_100px_minmax(0,1.4fr)] gap-3 border-b border-white/[0.07] bg-[#0b0f15] px-3 py-2 text-[9px] text-zinc-600">
              <span>名称</span>
              <span>区分</span>
              <span>役割</span>
            </div>
            <div className="divide-y divide-white/[0.05]">
              {tools.map((toolItem, index) => {
                const toolName = typeof toolItem === 'string'
                  ? toolItem
                  : (toolItem as { name?: string })?.name || '未定義';
                const toolCategory = typeof toolItem === 'object' && toolItem && 'category' in toolItem
                  ? (toolItem as { category?: string }).category || '—'
                  : '—';
                const toolPurpose = typeof toolItem === 'object' && toolItem && 'purpose' in toolItem
                  ? (toolItem as { purpose?: string }).purpose || '—'
                  : '—';

                return (
                  <div
                    key={`${toolName}-${index}`}
                    className="grid grid-cols-[minmax(100px,0.8fr)_100px_minmax(0,1.4fr)] gap-3 bg-[#0f141d] px-3 py-2.5 text-[10px]"
                  >
                    <span className="truncate font-medium text-zinc-200" title={toolName}>{toolName}</span>
                    <span className="truncate text-zinc-500" title={toolCategory}>{toolCategory}</span>
                    <span className="truncate text-zinc-400" title={toolPurpose}>{toolPurpose}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="border-y border-white/[0.06] py-3 text-[11px] text-zinc-500">
            ツール構成は未確認です。
          </div>
        )}
      </div>
    </section>
  );
}
