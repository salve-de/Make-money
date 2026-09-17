import { DynamicEvidenceDeck } from '../dynamic-sections/DynamicEvidenceDeck';

import type { InspectorSectionProps } from '../model/section-props';

export function EvidenceDeckSection({
  entity,
  isHazardMode,
  hasEvidenceCards,
}: Pick<InspectorSectionProps, 'entity' | 'isHazardMode' | 'hasEvidenceCards'>) {
  if (!hasEvidenceCards) return null;

  return (
    <section
      id="section-evidence"
      className={`scroll-mt-4 overflow-hidden rounded-lg border bg-[#0e131b] ${
        isHazardMode ? 'border-red-500/25' : 'border-white/[0.09]'
      }`}
    >
      <div className="flex flex-wrap items-end justify-between gap-2 border-b border-white/[0.07] px-3.5 py-3">
        <div>
          <div className={`text-[10px] font-medium ${isHazardMode ? 'text-red-300' : 'text-blue-300'}`}>
            EVIDENCE DOSSIER
          </div>
          <h3 className="mt-0.5 text-sm font-semibold text-zinc-100">
            {isHazardMode ? '失敗・撤退の事実ログ' : '儲けのウラ側 ＆ 現場の証拠'}
          </h3>
          <p className="mt-1 text-[11px] text-zinc-500">
            結論だけ一覧し、必要な行だけ開いて詳細を確認します。
          </p>
        </div>
        <div className="font-mono text-[10px] tabular-nums text-zinc-500">
          {entity.evidenceCards!.length} records
        </div>
      </div>

      <div className="p-2">
        <DynamicEvidenceDeck cards={entity.evidenceCards!} isHazardMode={isHazardMode} />
      </div>
    </section>
  );
}
