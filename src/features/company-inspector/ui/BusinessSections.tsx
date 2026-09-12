import {
AlertTriangle,
Flame,
ShieldCheck,
Skull,
TrendingUp
} from 'lucide-react';

import { parsePunchline } from '../model/inspector-model';
import type { InspectorSectionProps } from '../model/section-props';

const MOAT_TYPE_LABELS: Record<string, string> = {
  COUNTER_POSITIONING: '大手の自爆誘発',
  NETWORK_EFFECT: '自動増殖ループ',
  HIGH_SWITCHING_COSTS: '乗り換え不能人質',
  CORNERED_RESOURCE: '独占のズルい手札',
  SCALE_ECONOMIES: '規模の低原価要塞',
  PROCESS_POWER: '暗黙知の密室配管',
  BRAND_SPEED: '超速ブランド認知',
  UNKNOWN: '未確認',
};

export function BusinessSections({ entity, isHazardMode, hasEvidenceCards }: Pick<InspectorSectionProps, 'entity' | 'isHazardMode' | 'hasEvidenceCards'>) {
  return <>
          {/* ------------------------------------------------------- */}
          {/* #01〜#04: 事業DNA ＆ 構造的優位性 / 致命的欠陥 (フォールバック) */}
          {/* ------------------------------------------------------- */}
          {!hasEvidenceCards && (
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
                      {isHazardMode ? '事業の罠・錯覚の前提' : '事業の正体・構造仕様'}
                    </h3>
                  </div>
                  <span className="font-mono text-[10px] text-zinc-400 bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.06]">
                    事業DNA
                  </span>
                </div>
                <div className={`divide-y ${
                  isHazardMode ? 'divide-red-500/10' : 'divide-white/[0.06]'
                }`}>
                  <div className="p-3.5 flex items-start gap-3 bg-[#0E131F]">
                    <span className={`w-24 text-[10px] font-mono shrink-0 font-bold uppercase tracking-wider ${isHazardMode ? 'text-red-400' : 'text-zinc-400'}`}>
                      {isHazardMode ? '錯覚した事業' : '何屋か'}
                    </span>
                    <span className="text-zinc-100 text-xs leading-relaxed font-medium">{entity.essence.whatItDoes}</span>
                  </div>
                  <div className="p-3.5 flex items-start gap-3 bg-[#0E131F]">
                    <span className={`w-24 text-[10px] font-mono shrink-0 font-bold uppercase tracking-wider ${isHazardMode ? 'text-red-400' : 'text-zinc-400'}`}>
                      {isHazardMode ? '見誤った顧客' : '誰の財布'}
                    </span>
                    <span className="text-zinc-200 text-xs leading-relaxed">{entity.essence.targetCustomer}</span>
                  </div>
                  <div className="p-3.5 flex items-start gap-3 bg-[#0E131F]">
                    <span className={`w-24 text-[10px] font-mono shrink-0 font-bold uppercase tracking-wider ${isHazardMode ? 'text-red-400' : 'text-zinc-400'}`}>
                      {isHazardMode ? '消滅した需要' : '切除する苦痛'}
                    </span>
                    <span className="text-zinc-200 text-xs leading-relaxed">{entity.essence.painRelief}</span>
                  </div>
                </div>
              </div>
            )}

            {/* #02 突いた盲点 / 見落とした致命的死角 */}
            {(() => {
              const { punchline, detail } = parsePunchline(entity.strategy.blindspot);
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
                          {isHazardMode ? '見落とした致命的死角' : '突いた業界の盲点'}
                        </h3>
                      </div>
                    </div>
                    <span className="font-mono text-[10px] text-zinc-400 bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.06]">
                      業界の盲点
                    </span>
                  </div>
                  <div className="p-3.5 space-y-2.5 bg-[#0E131F]">
                    {punchline && (
                      <div className={`font-bold text-xs leading-snug border-l-2 pl-3 py-1 ${
                        isHazardMode ? 'text-red-200 border-red-500 bg-red-950/20' : 'text-white border-zinc-400 bg-white/[0.02]'
                      }`}>
                        {punchline}
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
                          {isHazardMode ? '崩壊した見せかけの堀' : '参入障壁の正体'}
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
                    {punchline && (
                      <div className={`font-bold text-xs leading-snug border-l-2 pl-3 py-1 ${
                        isHazardMode ? 'text-red-200 border-red-500 bg-red-950/20' : 'text-white border-zinc-400 bg-white/[0.02]'
                      }`}>
                        {punchline}
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
            {entity.strategy.incumbentDilemma && (
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
                        {isHazardMode ? '大手に一撃で市場を奪取された理由' : '大手が構造上真似できない理由'}
                      </h3>
                    </div>
                  </div>
                  <span className="font-mono text-[10px] text-zinc-400 bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.06]">
                    大手の自爆
                  </span>
                </div>
                <div className="p-3.5 bg-[#0E131F]">
                  <p className="text-zinc-300 text-xs leading-relaxed">
                    {entity.strategy.incumbentDilemma}
                  </p>
                </div>
              </div>
            )}
            </div>
          )}


  </>;
}
