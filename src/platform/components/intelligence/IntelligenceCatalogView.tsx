'use client';

import React from 'react';
import { IntelligenceDossier, IntelligenceTopicId, FinancialEntity } from '../../types/terminal';
import { ArrowRight, Zap, TrendingUp, Building2 } from 'lucide-react';

interface IntelligenceCatalogViewProps {
  dossiers: IntelligenceDossier[];
  allEntities: FinancialEntity[];
  onSelectDossier: (id: IntelligenceTopicId) => void;
}

export const IntelligenceCatalogView: React.FC<IntelligenceCatalogViewProps> = ({
  dossiers,
  allEntities,
  onSelectDossier,
}) => {
  const dossierEntityIds = new Set(dossiers.flatMap((dossier) => dossier.targetEntityIds));
  const relatedEntityCount = allEntities.filter((entity) => dossierEntityIds.has(entity.id)).length;

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-[#060709] text-zinc-100">
      {/* 1. カタログヘッダー */}
      <div className="border-b border-white/[0.06] bg-[#07080B] p-6 md:p-8 max-w-6xl mx-auto w-full">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                事業構造の参考資料
              </span>
              <span className="text-[10px] font-mono text-zinc-500">
                数値・出典は未照合
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white leading-tight">
              事業の仕組みを、事例から読む
            </h1>
            <p className="text-xs text-zinc-400 font-sans max-w-2xl leading-relaxed">
              企業の収益構造や顧客、競争条件について記録された参考資料です。数値、分類、因果関係は事例ごとに出典と時点を確認してください。
            </p>
          </div>

          {/* クイック統計サマリー */}
          <div className="flex items-center gap-3 bg-white/[0.02] border border-white/[0.06] rounded-lg p-3">
            <div className="text-center px-2">
              <div className="text-[10px] font-mono text-zinc-500">収録シナリオ</div>
              <div className="text-sm font-mono font-bold text-white">{dossiers.length}本</div>
            </div>
            <div className="h-6 w-px bg-white/[0.08]" />
              <div className="text-center px-2">
                <div className="text-[10px] font-mono text-zinc-500">関連する登録事例</div>
                <div className="text-sm font-mono font-bold text-white">{relatedEntityCount}社</div>
              </div>
            <div className="h-6 w-px bg-white/[0.08]" />
            <div className="text-center px-2">
              <div className="text-[10px] font-mono text-zinc-500">解剖対象企業</div>
                <div className="text-sm font-mono font-bold text-white">事例別に確認</div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. 参考資料グリッド */}
      <div className="p-6 md:p-8 max-w-6xl mx-auto w-full space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {dossiers.map((dossier, idx) => {
            const matchedEntities = allEntities.filter((e) =>
              dossier.targetEntityIds.includes(e.id)
            );

            return (
              <div
                key={dossier.id}
                onClick={() => onSelectDossier(dossier.id)}
                className="group relative flex w-full flex-col justify-between rounded-lg border border-white/[0.12] bg-surface p-5 text-left shadow-sm transition-colors hover:border-white/[0.24] hover:bg-surface-raised md:p-6"
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelectDossier(dossier.id);
                  }
                }}
              >
                {/* 上部メタ情報 ＆ 最重要メトリクス */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-zinc-500">
                        SCENARIO 0{idx + 1}
                      </span>
                      <span className="text-[10px] font-mono tracking-wider px-1.5 py-0.5 rounded bg-white/[0.05] text-zinc-300 font-medium">
                        {dossier.badge}
                      </span>
                    </div>

                    {dossier.highlightMetric && (
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-300/[0.06] border border-amber-300/20 text-amber-100 font-mono text-[11px] font-medium">
                        <TrendingUp aria-hidden="true" className="w-3 h-3" />
                        <span>{dossier.highlightMetric.label}: {dossier.highlightMetric.value} · 資料内の未照合値</span>
                      </div>
                    )}
                  </div>

                  {/* タイトル */}
                  <h2 className="text-base font-bold text-zinc-100 group-hover:text-white transition-colors leading-snug mb-3">
                    {dossier.title}
                  </h2>

                  {/* 急所パンチライン */}
                  <p className="mb-2 text-[11px] font-medium text-amber-200">資料内要約 · 出典未照合</p>
                  <p className="text-sm leading-relaxed text-zinc-300 line-clamp-3 mb-4">
                    {dossier.punchline}
                  </p>

                  {/* マネーフロー急所プレビュー */}
                  {dossier.moneyFlow && (
                    <div className="p-2.5 rounded bg-white/[0.02] border border-white/[0.04] text-[11px] space-y-1 mb-4">
                      <div className="flex items-center gap-1.5 text-zinc-400 font-mono text-[10px]">
                        <Zap className="w-3 h-3 text-amber-400" />
                        想定される支払者・課題:
                      </div>
                      <p className="text-zinc-300 line-clamp-1">
                        {dossier.moneyFlow.payer}
                      </p>
                    </div>
                  )}
                </div>

                {/* 下部: 対象企業バッジ ＆ CTA */}
                <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between gap-3 mt-2">
                  <div className="flex items-center gap-1.5 overflow-hidden">
                    <Building2 className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                    <span className="text-[11px] text-zinc-500 font-mono shrink-0">対象:</span>
                    <div className="flex items-center gap-1 truncate">
                      {matchedEntities.map((ent) => (
                        <span
                          key={ent.id}
                          className="px-1.5 py-0.5 rounded bg-white/[0.04] text-[10px] font-mono text-zinc-300 truncate"
                        >
                          {ent.name}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-xs font-medium text-zinc-300 group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0">
                    <span>資料の内容を見る</span>
                    <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
