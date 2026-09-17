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

  const leadText = isHazardMode
    ? '巨額調達や見かけの急成長の陰で、現場で実際に何が起きていたのかの客観的事実ログ（検死記録）を検証する。'
    : '公式PRの綺麗事を焼き払い、大手が自爆を恐れて手を出せない構造的ジレンマと、現場の生々しい客観的事実ログ（一次証拠）を突きつける。';

  const incumbentDilemma = entity.strategy?.incumbentDilemma?.trim();
  const moatDescription = entity.strategy?.moatDescription?.trim();

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
      {/* セクション・リード文 */}
      <div className="px-4 py-3 sm:px-5 sm:py-3.5 bg-white/[0.02] border-b border-white/[0.06] text-xs sm:text-[13px] text-zinc-300 leading-relaxed font-sans">
        <span className={`text-[10px] font-mono uppercase tracking-wider font-bold px-1.5 py-0.5 rounded border mr-2 ${
          isHazardMode
            ? 'bg-red-500/10 text-red-300 border-red-500/30'
            : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
        }`}>
          {isHazardMode ? 'POST-MORTEM DOSSIER / 検死記録' : 'UNVARNISHED FACTS / 客観証拠'}
        </span>
        {leadText}
      </div>

      {/* 大手の自縛・参入障壁ハイライト（存在する場合） */}
      {(incumbentDilemma || moatDescription) && (
        <div className={`p-4 sm:p-5 border-b border-white/[0.07] ${
          isHazardMode ? 'bg-red-950/20' : 'bg-amber-950/15'
        }`}>
          <div className="flex items-start gap-3">
            <div className={`w-1 h-4 rounded-full shrink-0 mt-1 ${
              isHazardMode ? 'bg-red-400' : 'bg-amber-400'
            }`} />
            <div className="space-y-1 min-w-0">
              <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">
                {isHazardMode ? 'STRUCTURAL FLAW / 破綻の根本原因' : 'INCUMBENT DILEMMA / 大手が真似できない自爆構造'}
              </div>
              <p className="text-xs sm:text-[13px] text-zinc-200 leading-relaxed font-medium">
                {(incumbentDilemma || moatDescription)?.replace(/^【.*?】/g, '').trim()}
              </p>
            </div>
          </div>
        </div>
      )}

      <DynamicEvidenceDeck cards={cards} isHazardMode={isHazardMode} />
    </InspectorSectionCard>
  );
}
