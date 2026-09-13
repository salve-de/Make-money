import {
ArrowRight,
ArrowUpRight,
FileText,
TrendingUp
} from 'lucide-react';

import type { InspectorSectionProps } from '../model/section-props';

export function RelatedResearch({ onSelectTopic, onOpenAnomaly, relatedDossier, relatedAnomaly }: Pick<InspectorSectionProps, 'onSelectTopic' | 'onOpenAnomaly' | 'relatedDossier' | 'relatedAnomaly'>) {
  return <>
          {/* 市場の歪み・トレンドへの直通バナー（冷徹な情報行） */}
          {relatedAnomaly && (
            <div
              onClick={() => onOpenAnomaly && onOpenAnomaly(relatedAnomaly.id)}
              className="rounded-lg border border-white/[0.10] hover:border-white/[0.22] bg-[#0E131F] p-3 flex items-center justify-between group cursor-pointer transition-all duration-150 shadow-lg"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="p-1 rounded bg-white/[0.06] text-zinc-300 border border-white/[0.10] shrink-0">
                  <TrendingUp className="w-3.5 h-3.5 text-zinc-400" />
                </span>
                <div className="truncate">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-mono text-zinc-400 uppercase tracking-wider font-semibold">
                      実証中の市場の歪み
                    </span>
                    <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-white/[0.06] text-zinc-300 font-bold border border-white/[0.08]">
                      {relatedAnomaly.growthRate}
                    </span>
                    <span className="text-[9px] font-mono text-zinc-500 hidden sm:inline">
                      手残り {relatedAnomaly.netMarginPercent}%
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-white truncate group-hover:text-zinc-200 transition-colors">
                    {relatedAnomaly.title}
                  </h3>
                </div>
              </div>
              <div className="flex items-center gap-1 font-mono text-[11px] text-zinc-400 group-hover:text-white shrink-0 pl-2">
                <span className="hidden sm:inline">歪みカルテ</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          )}

          {/* 特集インテリジェンスへの連動バナー（冷徹な情報行） */}
          {relatedDossier && (
            <div
              onClick={() => onSelectTopic && onSelectTopic(relatedDossier.id)}
              className="rounded-lg border border-white/[0.10] hover:border-white/[0.22] bg-[#0E131F] p-3 flex items-center justify-between group cursor-pointer transition-all duration-150 shadow-lg"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="p-1 rounded bg-white/[0.06] text-zinc-300 border border-white/[0.10] shrink-0">
                  <FileText className="w-3.5 h-3.5 text-zinc-400" />
                </span>
                <div className="truncate">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-mono text-zinc-400 uppercase tracking-wider font-semibold">
                      関連特集インテリジェンス
                    </span>
                    <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-white/[0.06] text-zinc-400 border border-white/[0.08]">
                      {relatedDossier.badge}
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-white truncate group-hover:text-zinc-200 transition-colors">
                    {relatedDossier.title}
                  </h3>
                </div>
              </div>
              <div className="flex items-center gap-1 font-mono text-[11px] text-zinc-400 group-hover:text-white shrink-0 pl-3">
                <span className="hidden sm:inline">深層解剖を読む</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-white transition-colors" />
              </div>
            </div>
          )}


  </>;
}
