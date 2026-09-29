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
              onKeyDown={(event) => {
                if (onOpenAnomaly && (event.key === 'Enter' || event.key === ' ')) {
                  event.preventDefault();
                  onOpenAnomaly(relatedAnomaly.id);
                }
              }}
              role={onOpenAnomaly ? 'button' : undefined}
              tabIndex={onOpenAnomaly ? 0 : undefined}
              aria-label={onOpenAnomaly ? `${relatedAnomaly.title}の参考資料を開く` : undefined}
              className={`rounded-sm border border-term-line bg-term-panel p-3 flex items-center justify-between group transition-colors duration-150  ${onOpenAnomaly ? 'cursor-pointer hover:border-term-line focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent' : ''}`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="p-1 rounded-sm bg-term-head text-zinc-300 border border-term-line shrink-0">
                  <TrendingUp className="w-3.5 h-3.5 text-zinc-400" />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-xs font-medium text-zinc-300">
                      市場テーマ · 参考情報
                    </span>
                  </div>
                  <h3 className="truncate text-sm font-semibold text-zinc-100 transition-colors group-hover:text-term-fg-strong">
                    {relatedAnomaly.title}
                  </h3>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1 pl-2 text-xs text-zinc-300 group-hover:text-term-fg-strong">
                <span className="hidden sm:inline">詳細を見る</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          )}

          {/* 特集インテリジェンスへの連動バナー（冷徹な情報行） */}
          {relatedDossier && (
            <div
              onClick={() => onSelectTopic && onSelectTopic(relatedDossier.id)}
              onKeyDown={(event) => {
                if (onSelectTopic && (event.key === 'Enter' || event.key === ' ')) {
                  event.preventDefault();
                  onSelectTopic(relatedDossier.id);
                }
              }}
              role={onSelectTopic ? 'button' : undefined}
              tabIndex={onSelectTopic ? 0 : undefined}
              aria-label={onSelectTopic ? `${relatedDossier.title}を開く` : undefined}
              className={`rounded-sm border border-term-line bg-term-panel p-3 flex items-center justify-between group transition-colors duration-150  ${onSelectTopic ? 'cursor-pointer hover:border-term-line focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent' : ''}`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="p-1 rounded-sm bg-term-head text-zinc-300 border border-term-line shrink-0">
                  <FileText className="w-3.5 h-3.5 text-zinc-400" />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-xs font-medium text-zinc-300">
                      関連特集インテリジェンス
                    </span>
                    <span className="rounded-sm border border-term-line bg-term-head px-1.5 py-0.5 text-xs text-zinc-300">
                      {relatedDossier.badge}
                    </span>
                  </div>
                  <h3 className="truncate text-sm font-semibold text-zinc-100 transition-colors group-hover:text-term-fg-strong">
                    {relatedDossier.title}
                  </h3>
                </div>
              </div>
              <div className="flex items-center gap-1 font-mono text-xs text-zinc-400 group-hover:text-term-fg-strong shrink-0 pl-3">
                <span className="hidden sm:inline">特集を読む</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-term-fg-strong transition-colors" />
              </div>
            </div>
          )}


  </>;
}
