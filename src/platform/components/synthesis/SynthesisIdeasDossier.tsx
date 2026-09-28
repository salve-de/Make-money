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

  const btn = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-sm border px-3 text-sm bg-transparent hover:bg-term-head disabled:cursor-not-allowed disabled:opacity-45 lg:min-h-8';
  return (
    <div className="h-full overflow-y-auto">
      {synthesizedIdeas.length === 0 ? (
        <section>
          <div className="term-panel-title">
            <span className="term-panel-name">選択した事例から企画案を作成</span>
            <span className="term-num ml-auto">{selectedEntityIds.size}件</span>
          </div>
          <div className="flex flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center">
          {selectedEntityIds.size === 0 ? (
            <div className="text-sm">
              <p className="text-term-fg-strong">企画案がここに並びます</p>
              <p className="mt-1 text-term-sub">左の保存した事例を1件以上選び、「企画案を作る」を押してください。</p>
            </div>
          ) : (
            <div className="flex min-w-0 flex-1 flex-wrap gap-2">
              {[...selectedEntityIds].map((id) => {
                const entity = entityById.get(id);
                return entity ? <Link key={id} href={`/?entity=${encodeURIComponent(id)}&mode=LEDGER`} className="inline-flex min-h-11 items-center rounded-sm border border-term-line px-3 text-sm text-term-select-fg hover:bg-term-head lg:min-h-8">{entity.name}</Link> : null;
              })}
            </div>
          )}
          <button
            onClick={handleSynthesize}
            disabled={isSynthesizing || selectedEntityIds.size === 0}
            className={`${btn} shrink-0 self-start border-term-accent text-term-accent`}
          >
            {isSynthesizing ? '企画案を作成中…' : '企画案を作る'}
          </button>
          </div>
        </section>
      ) : (
        <div className="max-w-5xl">
          <div className="term-panel-title">
            <span className="term-panel-name">企画案</span>
            <span className="term-num">{synthesizedIdeas.length}件</span>
            <button
              onClick={handleSynthesize}
              disabled={isSynthesizing}
              className="ml-auto inline-flex min-h-11 items-center gap-1.5 px-2 text-xs text-term-sub hover:text-term-fg-strong disabled:opacity-50 lg:min-h-6"
            >
              <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" />
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
            <article key={idea.id} className="border-b border-term-line">
              <header className="flex flex-col gap-2 border-b border-term-line-soft px-3 py-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <span className="text-xs text-term-label">{idea.dimensionLabel}</span>
                  <h4 className="text-base font-semibold text-term-fg-strong">{idea.title}</h4>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-term-label">着想元</span>
                    {sourceEntities.length > 0 ? sourceEntities.map((entity) => (
                      <Link
                        key={entity.id}
                        href={`/?entity=${encodeURIComponent(entity.id)}`}
                        className="inline-flex min-h-11 items-center gap-2 text-term-select-fg underline underline-offset-2 hover:text-term-fg-strong lg:min-h-6"
                      >
                        <span>{entity.name}</span>
                        <span className="text-term-label">{sourceEvidenceLabel(entity)}</span>
                      </Link>
                    )) : (
                      <span className="text-term-dim">参照元は案に記録されていません</span>
                    )}
                    {unresolvedSourceCount > 0 && (
                      <span className="text-term-dim">台帳で確認できない参照元 {unresolvedSourceCount}件</span>
                    )}
                  </div>
                </div>

                <dl className="grid shrink-0 grid-cols-2 sm:min-w-64 sm:border-l sm:border-term-line-soft">
                  <div className="px-3 py-1">
                    <dt className="text-xs text-term-label">月間利益の仮説</dt>
                    <dd className="term-num text-base text-term-accent">約{formatMoney(idea.projectedMonthlyProfitJpy)}</dd>
                  </div>
                  <div className="px-3 py-1">
                    <dt className="text-xs text-term-label">利益率の仮説</dt>
                    <dd className="term-num text-base text-term-fg-strong">{idea.operatingMargin}%</dd>
                  </div>
                </dl>
              </header>

              <dl className="grid grid-cols-1 border-b border-term-line-soft text-sm md:grid-cols-2">
                <div className="border-b border-term-line-soft px-3 py-2 md:border-b-0 md:border-r">
                  <dt className="text-xs text-term-label">想定する利用者と課題</dt>
                  <dd className="leading-relaxed text-term-fg">{idea.targetPainWallet}</dd>
                </div>
                <div className="px-3 py-2">
                  <dt className="text-xs text-term-label">参考にした事例の構造</dt>
                  <dd className="leading-relaxed text-term-fg">{idea.structuralArbitrage}</dd>
                </div>
              </dl>

              <section aria-label="使用候補と月額費用の目安">
                <h5 className="border-b border-term-line-soft bg-term-head px-3 py-1 text-xs text-term-label">使用候補と月額費用の目安</h5>
                {idea.requiredTools.map((tool, tIdx) => (
                  <div key={tIdx} className={`grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 border-b border-term-line-soft px-3 py-1.5 text-sm ${tIdx % 2 ? 'bg-term-row-alt' : ''}`}>
                    <div className="min-w-0">
                      <span className="font-semibold text-term-fg-strong">{tool.name}</span>
                      <span className="block text-xs text-term-sub">{tool.purpose}</span>
                    </div>
                    <span className="term-num text-term-fg">月{formatMoney(tool.monthlyCostJpy)}</span>
                  </div>
                ))}
              </section>

              <section aria-label="最初に試す検証手順">
                <h5 className="border-b border-term-line-soft bg-term-head px-3 py-1 text-xs text-term-label">最初に試す検証手順（案）</h5>
                <ol className="text-sm text-term-fg">
                  {idea.first100TractionPlaybook.map((step, sIdx) => (
                    <li key={sIdx} className="flex items-start gap-2 border-b border-term-line-soft px-3 py-1.5">
                      <span className="term-num shrink-0 text-xs text-term-label">{sIdx + 1}.</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </section>

              <div className="flex flex-col justify-between gap-2 px-3 py-2 sm:flex-row sm:items-center">
                <span className="text-sm text-term-sub">
                  参考にした内容: {idea.userNoteInspiration || '選択した事例'}
                </span>
                <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
                  <button
                    onClick={() => handleDrilldownIdea(idea)}
                    className={`${btn} cursor-pointer border-term-line text-term-fg`}
                  >
                    <span>内容を相談する</span>
                    <ArrowRight aria-hidden="true" className="h-4 w-4 text-term-label" />
                  </button>
                  <button
                    onClick={() => {
                      try { sessionStorage.setItem(`mm_build_idea:${idea.id}`, JSON.stringify(idea)); } catch { /* navigation still works for already-persisted ideas */ }
                      router.push(`/build/${encodeURIComponent(idea.id)}`);
                    }}
                    className={`${btn} cursor-pointer border-term-accent text-term-accent`}
                  >
                    <Hammer aria-hidden="true" className="h-3.5 w-3.5" />
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
