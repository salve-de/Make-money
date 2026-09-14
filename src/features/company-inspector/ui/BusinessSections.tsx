import {
AlertTriangle,
Flame,
ShieldCheck,
Skull,
TrendingUp
} from 'lucide-react';

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

export function BusinessSections({ entity, isHazardMode }: Pick<InspectorSectionProps, 'entity' | 'isHazardMode'> & { hasEvidenceCards?: boolean }) {
  return <>
          {/* ------------------------------------------------------- */}
          {/* #01〜#04: 事業DNA ＆ 構造的優位性 / 致命的欠陥 (フォールバック) */}
          {/* ------------------------------------------------------- */}
          <div className="space-y-8">
            {/* #01 事業の正体 / 事業の罠 */}
            {entity.essence && (
              <div className={`rounded-lg overflow-hidden border shadow-xl ${
                isHazardMode ? 'border-red-500/30 bg-[#0E131F]' : 'border-white/[0.12] bg-[#0E131F]'
              }`}>
                <div className={`flex items-center justify-between px-3.5 py-2.5 border-b ${
                  isHazardMode ? 'bg-red-950/40 border-red-500/30' : 'bg-[#141A29] border-white/[0.08]'
                }`}>
                  <div className="flex items-center gap-2.5">
                    <div className={`w-1 h-3.5 rounded-full ${isHazardMode ? 'bg-red-500' : 'bg-zinc-300'}`} />
                    <span className={`font-mono text-xs font-bold px-1.5 py-0.5 rounded border ${
                      isHazardMode
                        ? 'text-red-300 bg-red-900/40 border-red-500/40'
                        : 'text-zinc-100 bg-white/[0.08] border-white/[0.14]'
                    }`}>
                      #01
                    </span>
                    <h3 className={`font-mono text-xs font-bold uppercase tracking-wider ${
                      isHazardMode ? 'text-red-200' : 'text-zinc-100'
                    }`}>
                      {isHazardMode ? '事業の罠・錯覚の前提' : 'この会社は何屋か（ビジネスの正体）'}
                    </h3>
                  </div>
                  <span className="font-mono text-[10px] text-zinc-400 bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.06]">
                    ビジネスモデル
                  </span>
                </div>
                <div className={`divide-y ${
                  isHazardMode ? 'divide-red-500/10' : 'divide-white/[0.06]'
                }`}>
                  <div className="p-3.5 flex items-start gap-3 bg-[#0E131F]">
                    <span className={`w-24 text-[10px] font-mono shrink-0 font-bold uppercase tracking-wider ${isHazardMode ? 'text-red-400' : 'text-zinc-400'}`}>
                      {isHazardMode ? '錯覚した事業' : '要するに何屋か'}
                    </span>
                    <span className="text-zinc-100 text-xs leading-relaxed font-medium">
                      {stripLeadingEntityName(entity.essence.whatItDoes, entity.name, entity.legalEntity)}
                    </span>
                  </div>
                  <div className="p-3.5 flex items-start gap-3 bg-[#0E131F]">
                    <span className={`w-24 text-[10px] font-mono shrink-0 font-bold uppercase tracking-wider ${isHazardMode ? 'text-red-400' : 'text-zinc-400'}`}>
                      {isHazardMode ? '見誤った顧客' : '誰からお金をもらっているか'}
                    </span>
                    <span className="text-zinc-200 text-xs leading-relaxed">{entity.essence.targetCustomer}</span>
                  </div>
                  <div className="p-3.5 flex items-start gap-3 bg-[#0E131F]">
                    <span className={`w-24 text-[10px] font-mono shrink-0 font-bold uppercase tracking-wider ${isHazardMode ? 'text-red-400' : 'text-zinc-400'}`}>
                      {isHazardMode ? '消滅した需要' : 'どんな悩みを解決しているか'}
                    </span>
                    <span className="text-zinc-200 text-xs leading-relaxed">{entity.essence.painRelief}</span>
                  </div>
                </div>

              </div>
            )}

            {/* #02 突いた盲点 / 見落とした致命的死角 */}
            {(() => {
              const { punchline, detail } = parsePunchline(entity.strategy.blindspot);
              const cleanPunch = cleanSectionPunchline(punchline, entity.name, entity.legalEntity);
              return (
                <div className={`rounded-lg overflow-hidden border shadow-xl ${
                  isHazardMode ? 'border-red-500/30 bg-[#0E131F]' : 'border-white/[0.12] bg-[#0E131F]'
                }`}>
                  <div className={`flex items-center justify-between px-3.5 py-2.5 border-b ${
                    isHazardMode ? 'bg-red-950/40 border-red-500/30' : 'bg-[#141A29] border-white/[0.08]'
                  }`}>
                    <div className="flex items-center gap-2.5">
                      <div className={`w-1 h-3.5 rounded-full ${isHazardMode ? 'bg-red-500' : 'bg-zinc-300'}`} />
                      <span className={`font-mono text-xs font-bold px-1.5 py-0.5 rounded border ${
                        isHazardMode
                          ? 'text-red-300 bg-red-900/40 border-red-500/40'
                          : 'text-zinc-100 bg-white/[0.08] border-white/[0.14]'
                      }`}>
                        #02
                      </span>
                      <div className="flex items-center gap-1.5">
                        {isHazardMode ? (
                          <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                        ) : (
                          <TrendingUp className="w-3.5 h-3.5 text-zinc-400" />
                        )}
                        <h3 className={`font-mono text-xs font-bold uppercase tracking-wider ${
                          isHazardMode ? 'text-red-200' : 'text-zinc-100'
                        }`}>
                          {isHazardMode ? '見落とした致命的な死角' : '業界の常識のウラを突いた点'}
                        </h3>
                      </div>
                    </div>
                    <span className="font-mono text-[10px] text-zinc-400 bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.06]">
                      常識の逆
                    </span>
                  </div>
                  <div className="p-3.5 space-y-2.5 bg-[#0E131F]">
                    {cleanPunch && (
                      <div className={`font-bold text-xs leading-snug border-l-2 pl-3 py-1 ${
                        isHazardMode ? 'text-red-200 border-red-500 bg-red-950/20' : 'text-white border-zinc-400 bg-white/[0.02]'
                      }`}>
                        {cleanPunch}
                      </div>
                    )}
                    <p className="text-zinc-300 text-xs leading-relaxed">
                      {detail}
                    </p>
                  </div>
                </div>
              );
            })()}

            {/* #03 参入障壁 / 崩壊した見せかけの堀 */}
            {(() => {
              const { punchline, detail } = parsePunchline(entity.strategy.moatDescription);
              const cleanPunch = cleanSectionPunchline(punchline, entity.name, entity.legalEntity);
              return (
                <div className={`rounded-lg overflow-hidden border shadow-xl ${
                  isHazardMode ? 'border-red-500/30 bg-[#0E131F]' : 'border-white/[0.12] bg-[#0E131F]'
                }`}>
                  <div className={`flex items-center justify-between px-3.5 py-2.5 border-b ${
                    isHazardMode ? 'bg-red-950/40 border-red-500/30' : 'bg-[#141A29] border-white/[0.08]'
                  }`}>
                    <div className="flex items-center gap-2.5">
                      <div className={`w-1 h-3.5 rounded-full ${isHazardMode ? 'bg-red-500' : 'bg-zinc-300'}`} />
                      <span className={`font-mono text-xs font-bold px-1.5 py-0.5 rounded border ${
                        isHazardMode
                          ? 'text-red-300 bg-red-900/40 border-red-500/40'
                          : 'text-zinc-100 bg-white/[0.08] border-white/[0.14]'
                      }`}>
                        #03
                      </span>
                      <div className="flex items-center gap-1.5">
                        {isHazardMode ? (
                          <Skull className="w-3.5 h-3.5 text-red-400" />
                        ) : (
                          <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
                        )}
                        <h3 className={`font-mono text-xs font-bold uppercase tracking-wider ${
                          isHazardMode ? 'text-red-200' : 'text-zinc-100'
                        }`}>
                          {isHazardMode ? '崩壊した見せかけの強み' : 'ライバルが真似できない理由'}
                        </h3>
                      </div>
                    </div>
                    <span className={`border px-1.5 py-0.5 rounded font-mono text-[10px] ${
                      isHazardMode
                        ? 'bg-red-950/40 text-red-400 border-red-500/30'
                        : 'bg-white/[0.06] text-zinc-200 border-white/[0.12]'
                    }`}>
                      {MOAT_TYPE_LABELS[entity.strategy.moatType] || (entity.strategy.moatType === 'UNKNOWN' ? '未確認' : entity.strategy.moatType)}
                    </span>
                  </div>
                  <div className="p-3.5 space-y-2.5 bg-[#0E131F]">
                    {cleanPunch && (
                      <div className={`font-bold text-xs leading-snug border-l-2 pl-3 py-1 ${
                        isHazardMode ? 'text-red-200 border-red-500 bg-red-950/20' : 'text-white border-zinc-400 bg-white/[0.02]'
                      }`}>
                        {cleanPunch}
                      </div>
                    )}
                    <p className="text-zinc-300 text-xs leading-relaxed">
                      {detail}
                    </p>
                  </div>
                </div>
              );
            })()}

            {/* #04 大手の自爆 / 大手に一撃で圧殺された理由 */}
            {entity.strategy.incumbentDilemma && (() => {
              const { punchline, detail } = parsePunchline(entity.strategy.incumbentDilemma);
              const cleanPunch = cleanSectionPunchline(punchline, entity.name, entity.legalEntity);
              return (
                <div className={`rounded-lg overflow-hidden border shadow-xl ${
                  isHazardMode ? 'border-red-500/30 bg-[#0E131F]' : 'border-white/[0.12] bg-[#0E131F]'
                }`}>
                  <div className={`flex items-center justify-between px-3.5 py-2.5 border-b ${
                    isHazardMode ? 'bg-red-950/40 border-red-500/30' : 'bg-[#141A29] border-white/[0.08]'
                  }`}>
                    <div className="flex items-center gap-2.5">
                      <div className={`w-1 h-3.5 rounded-full ${isHazardMode ? 'bg-red-500' : 'bg-zinc-300'}`} />
                      <span className={`font-mono text-xs font-bold px-1.5 py-0.5 rounded border ${
                        isHazardMode
                          ? 'text-red-300 bg-red-900/40 border-red-500/40'
                          : 'text-zinc-100 bg-white/[0.08] border-white/[0.14]'
                      }`}>
                        #04
                      </span>
                      <div className="flex items-center gap-1.5">
                        <Flame className={`w-3.5 h-3.5 ${isHazardMode ? 'text-red-400' : 'text-zinc-400'}`} />
                        <h3 className={`font-mono text-xs font-bold uppercase tracking-wider ${
                          isHazardMode ? 'text-red-200' : 'text-zinc-100'
                        }`}>
                          {isHazardMode ? '大手に一撃で圧殺された理由' : '大企業が手を出せない理由'}
                        </h3>
                      </div>
                    </div>
                    <span className="font-mono text-[10px] text-zinc-400 bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.06]">
                      カニバリズム
                    </span>
                  </div>
                  <div className="p-3.5 space-y-2.5 bg-[#0E131F]">
                    {cleanPunch && (
                      <div className={`font-bold text-xs leading-snug border-l-2 pl-3 py-1 ${
                        isHazardMode ? 'text-red-200 border-red-500 bg-red-950/20' : 'text-white border-zinc-400 bg-white/[0.02]'
                      }`}>
                        {cleanPunch}
                      </div>
                    )}
                    <p className="text-zinc-300 text-xs leading-relaxed">
                      {detail}
                    </p>
                  </div>
                </div>
              );
            })()}
            </div>


  </>;
}
