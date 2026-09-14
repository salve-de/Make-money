import React from 'react';
import { Eye, ShieldAlert, Sparkles, Building2, Flame } from 'lucide-react';
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

export function ExecutiveIntuitiveSummary({ entity, isHazardMode }: Pick<InspectorSectionProps, 'entity' | 'isHazardMode'>) {
  const whatItDoes = stripLeadingEntityName(entity.essence?.whatItDoes || '', entity.name, entity.legalEntity);
  const tagline = stripLeadingEntityName(entity.tagline || '', entity.name, entity.legalEntity);
  const moat = entity.strategy?.moatDescription?.replace(/^【.*?】/, '') || entity.essence?.painRelief || '';

  return (
    <div id="section-summary" className={`rounded-xl border p-4.5 sm:p-5 shadow-2xl relative overflow-hidden transition-all ${
      isHazardMode
        ? 'bg-gradient-to-br from-red-950/30 via-[#0E131F] to-[#0A0D14] border-red-500/30'
        : 'bg-gradient-to-br from-[#121826] via-[#0E131F] to-[#080B10] border-emerald-500/30 shadow-[0_0_25px_rgba(16,185,129,0.05)]'
    }`}>
      {/* 背景の微弱なアクセントグロー */}
      <div className={`absolute top-0 right-0 w-64 h-32 blur-3xl pointer-events-none -mr-16 -mt-16 rounded-full ${
        isHazardMode ? 'bg-red-500/10' : 'bg-emerald-500/10'
      }`} />

      {/* ヘッダーラベル */}
      <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-white/[0.08]">
        <div className="flex items-center gap-2">
          {isHazardMode ? (
            <Flame className="w-4 h-4 text-red-400 shrink-0" />
          ) : (
            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
          )}
          <span className={`text-xs font-mono font-bold tracking-wider uppercase ${
            isHazardMode ? 'text-red-300' : 'text-emerald-300'
          }`}>
            {isHazardMode ? '直感検死：なぜこの事業は破綻・即死したのか' : '直感サマリー：このビジネスの正体と儲けのツボ'}
          </span>
        </div>
        <span className="text-[10px] font-mono text-zinc-400 bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.08]">
          3秒で直感理解
        </span>
      </div>

      {/* 3行ピラミッド要約 */}
      <div className="space-y-3.5 relative z-10">
        {/* 行1: 表の顔 */}
        <div className="flex flex-col sm:flex-row sm:items-baseline gap-1.5 sm:gap-3">
          <div className="flex items-center gap-1.5 shrink-0 sm:w-28">
            <Building2 className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 font-mono">
              【表の顔】
            </span>
          </div>
          <p className="text-zinc-200 text-xs sm:text-sm font-medium leading-relaxed">
            {whatItDoes || '業界向けソリューションの提供'}
          </p>
        </div>

        {/* 行2: 裏の正体 */}
        <div className="flex flex-col sm:flex-row sm:items-baseline gap-1.5 sm:gap-3">
          <div className="flex items-center gap-1.5 shrink-0 sm:w-28">
            <Eye className={`w-3.5 h-3.5 ${isHazardMode ? 'text-red-400' : 'text-amber-400'}`} />
            <span className={`text-[11px] font-bold uppercase tracking-wider font-mono ${
              isHazardMode ? 'text-red-400' : 'text-amber-400'
            }`}>
              {isHazardMode ? '【死の引き金】' : '【裏の正体】'}
            </span>
          </div>
          <p className="text-zinc-100 text-xs sm:text-sm font-bold leading-relaxed">
            {tagline || '顧客の特定の弱みに付け込み、相見積もりを排除して現金を抜く構造'}
          </p>
        </div>

        {/* 行3: 儲けのツボ */}
        <div className="flex flex-col sm:flex-row sm:items-baseline gap-1.5 sm:gap-3">
          <div className="flex items-center gap-1.5 shrink-0 sm:w-28">
            <ShieldAlert className={`w-3.5 h-3.5 ${isHazardMode ? 'text-red-400' : 'text-emerald-400'}`} />
            <span className={`text-[11px] font-bold uppercase tracking-wider font-mono ${
              isHazardMode ? 'text-red-400' : 'text-emerald-400'
            }`}>
              {isHazardMode ? '【致命的死角】' : '【儲けのツボ】'}
            </span>
          </div>
          <p className="text-zinc-300 text-xs sm:text-sm leading-relaxed">
            {moat || '他社が真似できない現場の仕組みと解約不能な監禁構造'}
          </p>
        </div>
      </div>
    </div>
  );
}
