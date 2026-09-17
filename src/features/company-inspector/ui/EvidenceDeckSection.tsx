import { DynamicEvidenceDeck } from '../dynamic-sections/DynamicEvidenceDeck';
import React from 'react';
import type { InspectorSectionProps } from '../model/section-props';
import { InspectorSectionCard } from './InspectorSectionCard';

export function EvidenceDeckSection({
  entity,
  isHazardMode,
  hasEvidenceCards,
}: Pick<InspectorSectionProps, 'entity' | 'isHazardMode' | 'hasEvidenceCards'>) {
  const cards = entity.evidenceCards || [];
  if (!hasEvidenceCards || cards.length === 0) return null;

  return (
    <InspectorSectionCard
      id="section-evidence"
      index="03"
      categoryEn="EVIDENCE DOSSIER"
      titleJa={isHazardMode ? '失敗・撤退の事実ログ' : '儲けのウラ側 ＆ 現場の証拠'}
      badge={
        <span className="rounded border border-white/[0.10] bg-white/[0.04] px-2 py-0.5 text-zinc-400 font-mono text-[11px]">
          {cards.length} records
        </span>
      }
      isHazardMode={isHazardMode}
    >
      <DynamicEvidenceDeck cards={cards} isHazardMode={isHazardMode} />
    </InspectorSectionCard>
  );
}
