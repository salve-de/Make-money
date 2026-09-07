'use client';

import React from 'react';
import { IntelligenceDossier, IntelligenceTopicId, FinancialEntity } from '../../types/terminal';
import { ShieldAlert, ArrowRight, Zap, TrendingUp, Sparkles, Building2 } from 'lucide-react';

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
  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-[#060709] text-zinc-100">
      {/* 1. カタログヘッダー */}
      <div className="border-b border-white/[0.06] bg-[#07080B] p-6 md:p-8 max-w-6xl mx-auto w-full">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                STRATEGIC INTELLIGENCE DOSSIERS
              </span>
              <span className="text-[10px] font-mono text-zinc-500">
                PRO RESEACH ARCHIVE
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white leading-tight">
              資本主義の裏帳簿：4大攻略シナリオ
            </h1>
            <p className="text-xs text-zinc-400 font-sans max-w-2xl leading-relaxed">
              単体の企業データではなく、複数社に共通する「大手の自爆（カニバリズム）」と「利益率80%超の抜け道」を体系化した勝ちパターンの設計図。
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
              <div className="text-[10px] font-mono text-zinc-500">平均手残り・利益率</div>
              <div className="text-sm font-mono font-bold text-emerald-400">71.3%</div>
            </div>
            <div className="h-6 w-px bg-white/[0.08]" />
            <div className="text-center px-2">
              <div className="text-[10px] font-mono text-zinc-500">解剖対象企業</div>
              <div className="text-sm font-mono font-bold text-white">8社</div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. 4大攻略シナリオ グリッド */}
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
                className="group relative flex flex-col justify-between p-5 md:p-6 rounded-lg bg-[#08090C] border border-white/[0.08] hover:border-white/[0.2] hover:bg-[#0B0C10] transition-all cursor-pointer shadow-lg"
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
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-[11px] font-bold">
                        <TrendingUp className="w-3 h-3" />
                        <span>{dossier.highlightMetric.label}: {dossier.highlightMetric.value}</span>
                      </div>
                    )}
                  </div>

                  {/* タイトル */}
                  <h2 className="text-base font-bold text-zinc-100 group-hover:text-white transition-colors leading-snug mb-3">
                    {dossier.title}
                  </h2>

                  {/* 急所パンチライン */}
                  <p className="text-xs text-zinc-400 line-clamp-3 leading-relaxed mb-4">
                    {dossier.punchline}
                  </p>

                  {/* マネーフロー急所プレビュー */}
                  {dossier.moneyFlow && (
                    <div className="p-2.5 rounded bg-white/[0.02] border border-white/[0.04] text-[11px] space-y-1 mb-4">
                      <div className="flex items-center gap-1.5 text-zinc-400 font-mono text-[10px]">
                        <Zap className="w-3 h-3 text-amber-400" />
                        人質にした財布:
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
                    <span>深層解剖</span>
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
