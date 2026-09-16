import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import type { InspectorSectionProps } from '../model/section-props';

export function RelatedResearch({ onSelectTopic, onOpenAnomaly, relatedDossier, relatedAnomaly }: Pick<InspectorSectionProps, 'onSelectTopic' | 'onOpenAnomaly' | 'relatedDossier' | 'relatedAnomaly'>) {
  if (!relatedAnomaly && !relatedDossier) return null;

  return (
    <div className="space-y-2">
      {/* 実証中の市場歪みへの直通行 */}
      {relatedAnomaly && (
        <div
          onClick={() => onOpenAnomaly && onOpenAnomaly(relatedAnomaly.id)}
          className="rounded-md border border-white/[0.08] hover:border-white/[0.18] bg-[#0A0D15] p-3 flex items-center justify-between group cursor-pointer transition-all duration-150"
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider shrink-0">
              MARKET ANOMALY //
            </span>
            <div className="truncate">
              <span className="text-xs font-semibold text-zinc-100 group-hover:text-white transition-colors">
                {relatedAnomaly.title}
              </span>
              <span className="text-[10px] font-mono text-zinc-400 ml-2">
                成長率: {relatedAnomaly.growthRate} / 利益率: {relatedAnomaly.netMarginPercent}%
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 font-mono text-[11px] text-zinc-400 group-hover:text-zinc-200 shrink-0 pl-2">
            <span>カルテ</span>
            <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
        </div>
      )}

      {/* 関連特集インテリジェンスへの連動行 */}
      {relatedDossier && (
        <div
          onClick={() => onSelectTopic && onSelectTopic(relatedDossier.id)}
          className="rounded-md border border-white/[0.08] hover:border-white/[0.18] bg-[#0A0D15] p-3 flex items-center justify-between group cursor-pointer transition-all duration-150"
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider shrink-0">
              DOSSIER //
            </span>
            <div className="truncate">
              <span className="text-xs font-semibold text-zinc-100 group-hover:text-white transition-colors">
                {relatedDossier.title}
              </span>
              {relatedDossier.punchline && (
                <span className="text-[11px] text-zinc-400 ml-2 font-sans hidden sm:inline truncate">
                  {relatedDossier.punchline}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 font-mono text-[11px] text-zinc-400 group-hover:text-zinc-200 shrink-0 pl-2">
            <span>特集</span>
            <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
        </div>
      )}
    </div>
  );
}
