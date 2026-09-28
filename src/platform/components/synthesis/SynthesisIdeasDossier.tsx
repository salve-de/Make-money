'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FinancialEntity, SynthesizedIdea } from '../../types/terminal';
import { 
  ArrowRight, 
  RotateCcw,
  Hammer,
} from 'lucide-react';

interface SynthesisIdeasDossierProps {
  entities: FinancialEntity[];
  selectedEntityIds: Set<string>;
  synthesizedIdeas: SynthesizedIdea[];
  handleSynthesize: () => void;
  isSynthesizing: boolean;
  formatMoney: (yen: number) => string;
  handleDrilldownIdea: (idea: SynthesizedIdea) => void;
}

function sourceEvidenceLabel(entity: FinancialEntity): string {
  if (entity.pnl.financialStatus === 'UNAVAILABLE' || entity.pnl.isRevenueUnconfirmed) return '未確認';
  switch (entity.pnl.financialStatus) {
    case 'VERIFIED': return '一次資料';
    case 'REPORTED': return '報告値';
    case 'ESTIMATED': return '推計';
    case 'POST_MORTEM': return '事後記録';
    default: return '根拠未登録';
  }
}

export const SynthesisIdeasDossier: React.FC<SynthesisIdeasDossierProps> = ({
  entities,
  selectedEntityIds,
  synthesizedIdeas,
  handleSynthesize,
  isSynthesizing,
  formatMoney,
  handleDrilldownIdea,
}) => {
  const router = useRouter();
  const entityById = React.useMemo(() => new Map(entities.map((entity) => [entity.id, entity])), [entities]);

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 space-y-5 scrollbar-thin scrollbar-thumb-white/10">
      {synthesizedIdeas.length === 0 ? (
        <section className="overflow-hidden rounded-md border border-white/[0.16] bg-[#101721]">
          <header className="flex items-center justify-between gap-3 border-b border-white/[0.12] bg-[#1a2530] px-4 py-3">
            <h2 className="text-sm font-semibold text-zinc-100">選択した事例から企画案を作成</h2>
            <span className="shrink-0 text-xs text-zinc-400">{selectedEntityIds.size}件</span>
          </header>
          <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          {selectedEntityIds.size === 0 ? <p className="text-sm text-zinc-300">保存した事例を選ぶと、収益の仕組みや自分のメモをもとに企画案を作れます。</p> : (
            <div className="flex min-w-0 flex-1 flex-wrap gap-2">
              {[...selectedEntityIds].map((id) => {
                const entity = entityById.get(id);
                return entity ? <Link key={id} href={`/?entity=${encodeURIComponent(id)}&mode=LEDGER`} className="rounded border border-white/[0.14] px-3 py-2 text-sm text-sky-100 hover:bg-white/[0.06]">{entity.name}</Link> : null;
              })}
            </div>
          )}
          <button
            onClick={handleSynthesize}
            disabled={isSynthesizing || selectedEntityIds.size === 0}
            className="inline-flex min-h-10 shrink-0 items-center justify-center self-start rounded-md bg-sky-200 px-3 py-2 text-sm font-semibold text-slate-950 transition-colors hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {isSynthesizing ? '企画案を作成中…' : '企画案を作る'}
          </button>
          </div>
        </section>
      ) : (
        <div className="space-y-4 max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-700 pb-3">
            <div>
              <h3 className="text-lg font-semibold text-white">
                企画案
              </h3>

            </div>
            <button
              onClick={handleSynthesize}
              disabled={isSynthesizing}
              className="inline-flex min-h-11 items-center justify-center gap-2 px-3 rounded-lg border border-slate-600 text-sm text-slate-100 hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              <RotateCcw className="w-4 h-4" />
              案を作り直す
            </button>
          </div>

          {synthesizedIdeas.map((idea) => {
            const sourceIds = Array.isArray(idea.sourceEntityIds) ? [...new Set(idea.sourceEntityIds)] : [];
            const sourceEntities = sourceIds
              .map((id) => entityById.get(id))
              .filter((entity): entity is FinancialEntity => entity !== undefined);
            const unresolvedSourceCount = sourceIds.length - sourceEntities.length;

            return (
            <article
              key={idea.id}
              className="space-y-5 rounded-lg border border-slate-600 bg-slate-900 p-4 sm:p-5"
            >
              {/* アイデア上部ヘッダー */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-700 pb-4">
                  <div>
                  <span className="text-xs text-slate-200 bg-slate-800 px-2.5 py-1 rounded border border-slate-600 inline-block mb-2">
                    {idea.dimensionLabel}
                  </span>
                  <h4 className="text-base md:text-lg font-semibold text-white font-sans">
                    {idea.title}
                  </h4>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-medium text-slate-300">着想元</span>
                    {sourceEntities.length > 0 ? sourceEntities.map((entity) => (
                      <Link
                        key={entity.id}
                        href={`/?entity=${encodeURIComponent(entity.id)}`}
                        className="inline-flex min-h-8 items-center gap-2 rounded border border-slate-500/60 bg-slate-800 px-2 text-slate-100 hover:border-sky-300/60 hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
                      >
                        <span>{entity.name}</span>
                        <span className="text-slate-300">{sourceEvidenceLabel(entity)}</span>
                      </Link>
                    )) : (
                      <span className="text-amber-200">参照元は案に記録されていません</span>
                    )}
                    {unresolvedSourceCount > 0 && (
                      <span className="text-amber-200">台帳で確認できない参照元 {unresolvedSourceCount}件</span>
                    )}
                  </div>
                </div>

                {/* 財務サマリー */}
                <div className="grid grid-cols-2 gap-4 sm:min-w-64 shrink-0">
                  <div className="rounded-lg bg-slate-950/70 border border-slate-700 p-3">
                    <span className="text-xs text-slate-300 block">月間利益の仮説</span>
                    <span className="text-base font-semibold text-amber-300 tabular-nums mt-1 block">
                      {formatMoney(idea.projectedMonthlyProfitJpy)}
                    </span>
                  </div>
                  <div className="rounded-lg bg-slate-950/70 border border-slate-700 p-3">
                    <span className="text-xs text-slate-300 block">利益率の仮説</span>
                    <span className="text-base font-semibold text-slate-100 tabular-nums mt-1 block">
                      {idea.operatingMargin}%
                    </span>
                  </div>
                </div>
              </div>

              {/* 狙う財布 ＆ 構造的歪み */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="bg-slate-950/60 p-4 rounded-lg border border-slate-700">
                  <span className="text-xs font-semibold text-slate-200 block mb-2">
                    想定する利用者と課題
                  </span>
                  <p className="text-slate-200 leading-relaxed">
                    {idea.targetPainWallet}
                  </p>
                </div>
                <div className="bg-slate-950/60 p-4 rounded-lg border border-slate-700">
                  <span className="text-xs font-semibold text-slate-200 block mb-2">
                    参考にした事例の構造
                  </span>
                  <p className="text-slate-200 leading-relaxed">
                    {idea.structuralArbitrage}
                  </p>
                </div>
              </div>

              {/* 推奨ツールスタック */}
              <div>
                <span className="text-sm font-semibold text-slate-100 block mb-2">
                  使用候補と月額費用の目安
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {idea.requiredTools.map((tool, tIdx) => (
                    <div
                      key={tIdx}
                      className="bg-slate-950/60 border border-slate-700 p-3 rounded-lg text-sm"
                    >
                      <div className="text-white font-semibold">{tool.name}</div>
                      <div className="text-slate-300 mt-1">{tool.purpose}</div>
                      <div className="text-slate-200 text-xs mt-2">
                        月{formatMoney(tool.monthlyCostJpy)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 仮説の検証手順 */}
              <div>
                <span className="text-sm font-semibold text-slate-100 block mb-2">
                  最初に試す検証手順（案）
                </span>
                <ul className="space-y-2 text-sm text-slate-200 font-sans">
                  {idea.first100TractionPlaybook.map((step, sIdx) => (
                    <li key={sIdx} className="flex items-start gap-2">
                      <span className="text-xs font-medium text-slate-400 shrink-0 pt-0.5">
                        {sIdx + 1}.
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* アクション: 深掘り or そのままMVP生成 */}
              <div className="pt-3 border-t border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <span className="text-sm text-slate-300">
                  参考にした内容: {idea.userNoteInspiration || '選択した事例'}
                </span>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <button
                    onClick={() => handleDrilldownIdea(idea)}
                    className="inline-flex min-h-11 items-center justify-center gap-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-sm font-medium text-white transition-colors cursor-pointer"
                  >
                    <span>内容を相談する</span>
                    <ArrowRight className="w-4 h-4 text-slate-300" />
                  </button>
                  <button
                    onClick={() => {
                      try { sessionStorage.setItem(`mm_build_idea:${idea.id}`, JSON.stringify(idea)); } catch { /* navigation still works for already-persisted ideas */ }
                      router.push(`/build/${encodeURIComponent(idea.id)}`);
                    }}
                    className="inline-flex min-h-11 items-center justify-center gap-2 px-3 rounded-lg bg-cyan-700 hover:bg-cyan-600 border border-cyan-600 text-sm font-semibold text-white transition-colors cursor-pointer"
                  >
                    <Hammer className="w-3.5 h-3.5" />
                    <span>試作品を作る</span>
                  </button>
                </div>
              </div>
            </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
