import {
Zap
} from 'lucide-react';
import { UniversalIntelligenceStream } from './UniversalIntelligenceStream';

import type { InspectorSectionProps } from '../model/section-props';

export function EvidenceStream({ entity, currency, isHazardMode }: Pick<InspectorSectionProps, 'entity' | 'currency' | 'isHazardMode'>) {
  return <>
          {/* ------------------------------------------------------- */}
          {/* #13: 一次証拠 ＆ 万能救済ストリーム (EVIDENCE STREAM) */}
          {/* ------------------------------------------------------- */}
          <div
            id="section-stream"
            className={`rounded-lg overflow-hidden border shadow-xl ${
              isHazardMode ? 'border-red-500/30 bg-[#0E131F]' : 'border-white/[0.12] bg-[#0E131F]'
            } scroll-mt-4`}
          >
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
                  #13
                </span>
                <div className="flex items-center gap-1.5">
                  <Zap className={`w-3.5 h-3.5 ${isHazardMode ? 'text-red-400' : 'text-zinc-400'}`} />
                  <h3 className={`font-mono text-xs font-bold uppercase tracking-wider ${
                    isHazardMode ? 'text-red-200' : 'text-zinc-100'
                  }`}>
                    {isHazardMode ? '死因一次証拠 ＆ 崩壊怨嗟ストリーム (CASUALTY STREAM)' : '一次証拠 ＆ 万能救済ストリーム (EVIDENCE STREAM)'}
                  </h3>
                </div>
              </div>
              {entity.observationsStream && entity.observationsStream.length > 0 && (
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border ${
                  isHazardMode
                    ? 'bg-red-950/40 text-red-300 border-red-500/30'
                    : 'bg-white/[0.06] text-zinc-300 border-white/[0.10]'
                }`}>
                  {entity.observationsStream.length}件の観測ログ
                </span>
              )}
            </div>

            <div className="p-3.5 bg-[#0E131F]">
              <UniversalIntelligenceStream entity={entity} currency={currency} />
            </div>
          </div>


  </>;
}
