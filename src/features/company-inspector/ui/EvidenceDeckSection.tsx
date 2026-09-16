import React from 'react';
import { DynamicEvidenceDeck } from '../dynamic-sections/DynamicEvidenceDeck';
import type { InspectorSectionProps } from '../model/section-props';

export function EvidenceDeckSection({ entity, isHazardMode, hasEvidenceCards }: Pick<InspectorSectionProps, 'entity' | 'isHazardMode' | 'hasEvidenceCards'>) {
  if (!hasEvidenceCards || !entity.evidenceCards || entity.evidenceCards.length === 0) return null;

  return (
    <section id="section-evidence" className="scroll-mt-4">
      {/* 統合エビデンス調書サーフェス */}
      <div className={`rounded-md border bg-[#0A0D15] overflow-hidden ${
        isHazardMode ? 'border-red-500/30' : 'border-white/[0.08]'
      }`}>
        {/* セクションヘッダー */}
        <div className={`flex items-center justify-between px-4 py-2.5 border-b ${
          isHazardMode ? 'bg-red-950/25 border-red-500/20' : 'bg-white/[0.02] border-white/[0.06]'
        }`}>
          <div className="flex items-center gap-2">
            <span className={`font-mono text-[11px] font-bold tracking-wider uppercase ${
              isHazardMode ? 'text-red-400' : 'text-zinc-400'
            }`}>
              EVIDENCE DOSSIER // {isHazardMode ? '破綻・撤退の客観的証拠ログ' : '儲けのウラ側 ＆ 現場観測ログ'}
            </span>
          </div>
          <span className="font-mono text-[10px] text-zinc-400">
            {entity.evidenceCards.length}件の記録
          </span>
        </div>

        {/* 監査行リスト */}
        <DynamicEvidenceDeck cards={entity.evidenceCards} isHazardMode={isHazardMode} />
      </div>
    </section>
  );
}
