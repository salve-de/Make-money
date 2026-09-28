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

  const sourceCount = new Set((entity.observationsStream || []).flatMap((item) => item.evidenceIds ?? [])).size;
  const linkedCards = cards.filter((card) => /https?:\/\/\S+/i.test(card.sourceNote || ''));


  return (
    <InspectorSectionCard
      id="section-evidence"
      index="03"
      categoryEn="出典に基づく記録"
      titleJa={isHazardMode ? '撤退・破綻に関する記録' : '根拠となる記録'}
      badge={
        <span className="rounded border border-white/[0.10] bg-white/[0.04] px-2 py-0.5 text-zinc-400 font-mono text-[11px]">
          {sourceCount > 0 ? `出典 ${sourceCount}件 / 記録 ${cards.length}件` : linkedCards.length > 0 ? `参照先あり ${linkedCards.length}件` : `${cards.length}件`}
        </span>
      }
      isHazardMode={isHazardMode}
    >
      <DynamicEvidenceDeck cards={cards} isHazardMode={isHazardMode} />
    </InspectorSectionCard>
  );
}
