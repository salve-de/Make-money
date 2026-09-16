import { DynamicEvidenceDeck } from '../dynamic-sections/DynamicEvidenceDeck';

import type { InspectorSectionProps } from '../model/section-props';

export function EvidenceDeckSection({ entity, isHazardMode, hasEvidenceCards }: Pick<InspectorSectionProps, 'entity' | 'isHazardMode' | 'hasEvidenceCards'>) {
  const hasVerifiedCards = entity.evidenceCards?.some((card) => card.evidenceStatus === 'VERIFIED') === true;
  return <>
          {/* ========================================================= */}
          {/* 【動的証拠保全デッキ (DYNAMIC EVIDENCE DECK)】 */}
          {/* ========================================================= */}
          {hasEvidenceCards && (
            <div
              id="section-evidence"
              className={`rounded-lg overflow-hidden border shadow-xl ${
                isHazardMode
                  ? 'border-red-500/30 bg-[#0E131F]'
                  : 'border-white/[0.12] bg-[#0E131F]'
              } scroll-mt-4`}
            >
              {/* セクション専用タイトルバー (Level 2: #141A29) */}
              <div className={`flex items-center justify-between px-3.5 py-2.5 border-b ${
                isHazardMode
                  ? 'bg-red-950/40 border-red-500/30'
                  : 'bg-[#141A29] border-white/[0.08]'
              }`}>
                <div className="flex items-center gap-2.5">
                  {/* 垂直アクセントバー (視覚の杭) */}
                  <div className={`w-1 h-3.5 rounded-full ${
                    isHazardMode
                      ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'
                      : 'bg-zinc-300'
                  }`} />
                  <span className={`font-mono text-xs font-bold px-1.5 py-0.5 rounded border ${
                    isHazardMode
                      ? 'text-red-300 bg-red-900/40 border-red-500/40'
                      : 'text-zinc-100 bg-white/[0.08] border-white/[0.14]'
                  }`}>
                    {hasVerifiedCards ? 'FACT' : 'OBSERVATION'}
                  </span>
                  <h3 className={`font-mono text-xs font-bold uppercase tracking-wider ${
                    isHazardMode ? 'text-red-200' : 'text-zinc-100'
                  }`}>
                    {isHazardMode ? '失敗・撤退の事実ログ' : '儲けのウラ側 ＆ 現場の証拠ファイル'}
                  </h3>
                </div>
                <span className="font-mono text-[10px] text-zinc-400 bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.06]">
                  {entity.evidenceCards!.length}件の保存済み観測
                </span>
              </div>
              <div className="p-3 bg-[#0E131F]">
                <DynamicEvidenceDeck cards={entity.evidenceCards!} isHazardMode={isHazardMode} />
              </div>
            </div>
          )}


  </>;
}
