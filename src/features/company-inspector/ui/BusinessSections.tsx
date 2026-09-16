import React from 'react';
import { parsePunchline } from '../model/inspector-model';
import type { InspectorSectionProps } from '../model/section-props';

function stripLeadingEntityName(text: string, name?: string, legalEntity?: string): string {
  if (!text) return '';
  let res = text.trim();
  const names = [name, legalEntity].filter(Boolean) as string[];
  for (const n of names) {
    const escaped = n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    res = res.replace(new RegExp('^' + escaped + '[は|が|の|による]?\\s*[、,]?\\s*', 'u'), '');
  }
  return res.trim();
}

function cleanSectionPunchline(punchline: string, name?: string, legalEntity?: string): string {
  if (!punchline) return '';
  let res = stripLeadingEntityName(punchline, name, legalEntity);
  res = res.replace(/^.*?が突いた業界の盲点/u, '業界の常識のウラを突いた独自構造');
  res = res.replace(/^.*?が見落とした致命的死角/u, '見落とされた致命的死角と構造的欠陥');
  return res.trim() || '構造的要諦';
}

const MOAT_TYPE_LABELS: Record<string, string> = {
  COUNTER_POSITIONING: '大企業が真似できない構造',
  NETWORK_EFFECT: '利用者が増えるほど強くなる仕組み',
  HIGH_SWITCHING_COSTS: '他社へ乗り換えられない仕組み',
  CORNERED_RESOURCE: '独自の独占資産・特権',
  SCALE_ECONOMIES: '規模の大きさによる圧倒的低コスト',
  PROCESS_POWER: '真似できない独自の現場ノウハウ',
  BRAND_SPEED: '圧倒的なブランド認知とスピード',
  UNKNOWN: '未確認',
};

export function BusinessSections({ entity, isHazardMode }: Pick<InspectorSectionProps, 'entity' | 'isHazardMode'>) {
  const blindspotData = parsePunchline(entity.strategy.blindspot);
  const blindspotPunch = cleanSectionPunchline(blindspotData.punchline, entity.name, entity.legalEntity);

  const moatData = parsePunchline(entity.strategy.moatDescription);
  const moatPunch = cleanSectionPunchline(moatData.punchline, entity.name, entity.legalEntity);

  const dilemmaData = entity.strategy.incumbentDilemma ? parsePunchline(entity.strategy.incumbentDilemma) : null;
  const dilemmaPunch = dilemmaData ? cleanSectionPunchline(dilemmaData.punchline, entity.name, entity.legalEntity) : '';

  const insightData = entity.strategy.secretInsight ? parsePunchline(entity.strategy.secretInsight) : null;
  const insightPunch = insightData ? cleanSectionPunchline(insightData.punchline, entity.name, entity.legalEntity) : '';

  return (
    <section id="section-essence" className="scroll-mt-4">
      {/* 統合調書サーフェス（コンサルティング・ファーム式 デューデリジェンス調書） */}
      <div className={`rounded-md border bg-[#0A0D15] overflow-hidden ${
        isHazardMode ? 'border-red-500/30' : 'border-white/[0.08]'
      }`}>
        {/* セクションヘッダー */}
        <div className={`flex items-center justify-between px-4 py-2.5 border-b ${
          isHazardMode ? 'bg-red-950/25 border-red-500/20' : 'bg-white/[0.02] border-white/[0.06]'
        }`}>
          <div className="flex items-center gap-2.5">
            <span className={`font-mono text-[11px] font-bold tracking-wider uppercase ${
              isHazardMode ? 'text-red-400' : 'text-zinc-400'
            }`}>
              STRATEGIC BLUEPRINT // {isHazardMode ? '破綻メカニズム・深層死因' : '構造DNA・非対称の堀'}
            </span>
          </div>
          <span className="font-mono text-[10px] text-zinc-400">
            DUE DILIGENCE MEMO
          </span>
        </div>

        {/* 4項目 構造調書（ディバイダーで区切られたフラットなリスト形式） */}
        <div className="divide-y divide-white/[0.06]">
          {/* 01: 突いた盲点 / 見落とした死角 */}
          <div className="p-4 flex flex-col md:flex-row md:items-start gap-3 md:gap-5 hover:bg-white/[0.01] transition-colors">
            <div className="w-full md:w-48 shrink-0 space-y-1">
              <div className="flex items-center gap-2">
                <span className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  isHazardMode ? 'text-red-400 bg-red-950/40 border border-red-500/30' : 'text-zinc-300 bg-white/[0.06] border border-white/[0.10]'
                }`}>
                  01
                </span>
                <span className="font-mono text-[11px] font-semibold tracking-wider text-zinc-300 uppercase">
                  {isHazardMode ? 'FATAL BLINDSPOT' : 'CONTRARIAN THESIS'}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                {isHazardMode ? '見落とした致命的死角' : '常識の逆・突いた盲点'}
              </p>
            </div>
            <div className="flex-1 min-w-0 space-y-1.5">
              {blindspotPunch && (
                <h4 className={`text-xs font-semibold leading-snug ${
                  isHazardMode ? 'text-red-200' : 'text-zinc-100'
                }`}>
                  {blindspotPunch}
                </h4>
              )}
              <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                {blindspotData.detail}
              </p>
            </div>
          </div>

          {/* 02: 参入障壁 / 崩壊した見せかけの堀 */}
          <div className="p-4 flex flex-col md:flex-row md:items-start gap-3 md:gap-5 hover:bg-white/[0.01] transition-colors">
            <div className="w-full md:w-48 shrink-0 space-y-1">
              <div className="flex items-center gap-2">
                <span className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  isHazardMode ? 'text-red-400 bg-red-950/40 border border-red-500/30' : 'text-zinc-300 bg-white/[0.06] border border-white/[0.10]'
                }`}>
                  02
                </span>
                <span className="font-mono text-[11px] font-semibold tracking-wider text-zinc-300 uppercase">
                  {isHazardMode ? 'SHAM MOAT' : 'COMPETITIVE MOAT'}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-zinc-400">
                  {isHazardMode ? '崩壊した見せかけの堀' : '模倣不能の参入障壁'}
                </span>
                <span className="font-mono text-[10px] text-zinc-400">
                  ({MOAT_TYPE_LABELS[entity.strategy.moatType] || entity.strategy.moatType})
                </span>
              </div>
            </div>
            <div className="flex-1 min-w-0 space-y-1.5">
              {moatPunch && (
                <h4 className={`text-xs font-semibold leading-snug ${
                  isHazardMode ? 'text-red-200' : 'text-zinc-100'
                }`}>
                  {moatPunch}
                </h4>
              )}
              <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                {moatData.detail}
              </p>
            </div>
          </div>

          {/* 03: 大手の自爆 / 圧殺された理由 */}
          {dilemmaData && (
            <div className="p-4 flex flex-col md:flex-row md:items-start gap-3 md:gap-5 hover:bg-white/[0.01] transition-colors">
              <div className="w-full md:w-48 shrink-0 space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    isHazardMode ? 'text-red-400 bg-red-950/40 border border-red-500/30' : 'text-zinc-300 bg-white/[0.06] border border-white/[0.10]'
                  }`}>
                    03
                  </span>
                  <span className="font-mono text-[11px] font-semibold tracking-wider text-zinc-300 uppercase">
                    {isHazardMode ? 'SQUASHED BY GIANTS' : 'INCUMBENT TRAP'}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  {isHazardMode ? '大手に圧殺された理由' : '大企業の自爆・手が出せない理由'}
                </p>
              </div>
              <div className="flex-1 min-w-0 space-y-1.5">
                {dilemmaPunch && (
                  <h4 className={`text-xs font-semibold leading-snug ${
                    isHazardMode ? 'text-red-200' : 'text-zinc-100'
                  }`}>
                    {dilemmaPunch}
                  </h4>
                )}
                <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                  {dilemmaData.detail}
                </p>
              </div>
            </div>
          )}

          {/* 04: 勝算の本質 / 慢心と盲信 */}
          {insightData && (
            <div className="p-4 flex flex-col md:flex-row md:items-start gap-3 md:gap-5 hover:bg-white/[0.01] transition-colors">
              <div className="w-full md:w-48 shrink-0 space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    isHazardMode ? 'text-red-400 bg-red-950/40 border border-red-500/30' : 'text-zinc-300 bg-white/[0.06] border border-white/[0.10]'
                  }`}>
                    04
                  </span>
                  <span className="font-mono text-[11px] font-semibold tracking-wider text-zinc-300 uppercase">
                    {isHazardMode ? 'FATAL ARROGANCE' : 'CORE ASYMMETRY'}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  {isHazardMode ? '破綻を招いた慢心と盲信' : '構造的勝算・本質インサイト'}
                </p>
              </div>
              <div className="flex-1 min-w-0 space-y-1.5">
                {insightPunch && (
                  <h4 className={`text-xs font-semibold leading-snug ${
                    isHazardMode ? 'text-red-200' : 'text-zinc-100'
                  }`}>
                    {insightPunch}
                  </h4>
                )}
                <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                  {insightData.detail}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
