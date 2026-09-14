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
  // 1. 事業モデル ＆ 収益規模（何をしてどれだけの売上・利益を上げているか）
  const businessScale = stripLeadingEntityName(
    entity.tagline || entity.essence?.whatItDoes || '',
    entity.name,
    entity.legalEntity
  );

  // 2. 対象顧客 ＆ 解決ペイン（誰のどんな切実な課題を解決しているか）
  const targetCustomer = entity.essence?.targetCustomer?.trim() || '';
  const painRelief = entity.essence?.painRelief?.trim() || entity.targetPainWallet?.trim() || '';
  const customerPainSummary = targetCustomer && painRelief
    ? `${targetCustomer} ➔ ${painRelief}`
    : targetCustomer || painRelief || entity.targetPainWallet || '業界特有の構造的ペインを抱える顧客層';

  // 3. 競争優位の要諦（なぜ他社が真似できない構造的モートがあるか）
  const rawMoat = entity.strategy?.moatDescription || entity.strategy?.moat || entity.architecturePattern || '';
  const cleanedMoat = rawMoat
    .replace(/^【.*?】/, '')
    .replace(/^【.*?】/, '') // 重複括弧の除去
    .trim();

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
            {isHazardMode ? '構造検死：事業モデルの機能不全と破綻要因' : 'エグゼクティブ・サマリー：事業構造と超過利潤の源泉'}
          </span>
        </div>
        <span className="text-[10px] font-mono text-zinc-400 bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.08]">
          EXECUTIVE DOSSIER
        </span>
      </div>

      {/* 3行ピラミッド要約 */}
      <div className="space-y-3.5 relative z-10">
        {/* 行1: 事業モデル ＆ 収益規模 */}
        <div className="flex flex-col sm:flex-row sm:items-baseline gap-1.5 sm:gap-3">
          <div className="flex items-center gap-1.5 shrink-0 sm:w-36">
            <Building2 className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-300 font-mono">
              {isHazardMode ? '【事業モデル＆破綻規模】' : '【事業モデル＆収益規模】'}
            </span>
          </div>
          <p className="text-zinc-100 text-xs sm:text-sm font-semibold leading-relaxed">
            {businessScale || '特定業界向けソリューションの提供と収益化'}
          </p>
        </div>

        {/* 行2: 対象顧客 ＆ 解決ペイン */}
        <div className="flex flex-col sm:flex-row sm:items-baseline gap-1.5 sm:gap-3">
          <div className="flex items-center gap-1.5 shrink-0 sm:w-36">
            <Eye className={`w-3.5 h-3.5 ${isHazardMode ? 'text-red-400' : 'text-amber-400'}`} />
            <span className={`text-[11px] font-bold uppercase tracking-wider font-mono ${
              isHazardMode ? 'text-red-400' : 'text-amber-400'
            }`}>
              {isHazardMode ? '【構造欠陥＆顧客ペイン】' : '【対象顧客＆解決ペイン】'}
            </span>
          </div>
          <p className="text-zinc-200 text-xs sm:text-sm font-medium leading-relaxed">
            {customerPainSummary}
          </p>
        </div>

        {/* 行3: 競争優位の要諦 */}
        <div className="flex flex-col sm:flex-row sm:items-baseline gap-1.5 sm:gap-3">
          <div className="flex items-center gap-1.5 shrink-0 sm:w-36">
            <ShieldAlert className={`w-3.5 h-3.5 ${isHazardMode ? 'text-red-400' : 'text-emerald-400'}`} />
            <span className={`text-[11px] font-bold uppercase tracking-wider font-mono ${
              isHazardMode ? 'text-red-400' : 'text-emerald-400'
            }`}>
              {isHazardMode ? '【死因の核心（出血点）】' : '【競争優位の要諦（モート）】'}
            </span>
          </div>
          <p className="text-zinc-300 text-xs sm:text-sm leading-relaxed">
            {cleanedMoat || '他社の追随を許さないオペレーション構造と高いスイッチングコスト'}
          </p>
        </div>
      </div>
    </div>
  );
}
