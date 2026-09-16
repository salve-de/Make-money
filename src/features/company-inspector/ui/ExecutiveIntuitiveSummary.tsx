import { legacyText, legacyNumber } from '../model/legacy-fields';
import React from 'react';
import { Building2, Flame } from 'lucide-react';
import type { InspectorSectionProps } from '../model/section-props';

function stripLeadingEntityName(text: string, name?: string, legalEntity?: string, founder?: string): string {
  if (!text) return '';
  let res = text.trim();
  const baseName = name ? name.replace(/\s*[\(（].*?[\)）]/g, '').trim() : '';
  const names = [name, baseName, legalEntity, founder].filter(Boolean) as string[];
  for (const n of names) {
    const escaped = n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    res = res.replace(new RegExp('^' + escaped + '[は|が|の|による]?\\s*[、:：,]?\\s*', 'u'), '');
    // 【月商〇〇】の直後に社名があるケースも除去
    res = res.replace(new RegExp('^(【.*?】)\\s*' + escaped + '\\s*[、:：,]?\\s*', 'u'), '$1 ');
  }
  return res.trim();
}

export function ExecutiveIntuitiveSummary({
  entity,
  isHazardMode,
  formatMoney,
}: Pick<InspectorSectionProps, 'entity' | 'isHazardMode' | 'formatMoney'>) {
  // 1. 最上段の一撃フック（白太字・最大視覚強度）
  const strongHeadline = stripLeadingEntityName(
    entity.tagline || entity.essence?.whatItDoes || '',
    entity.name,
    entity.legalEntity,
    entity.founder
  );

  // 2. 何をやっているのか（事業の正体）
  const whatItDoes = entity.essence?.whatItDoes || legacyText(entity, 'executiveSummary') || '特定業界向けソリューションの開発・販売';
  const targetCustomer = entity.essence?.targetCustomer?.trim() || '';
  const painRelief = entity.essence?.painRelief?.trim() || entity.targetPainWallet?.trim() || '';

  // 3. どうやって儲けているのか（儲けのカラクリ）
  const monetization = legacyText(entity.essence, 'monetizationWay') || legacyText(entity, 'monetizationWay') || '';
  const rawMoat = entity.strategy?.moatDescription || legacyText(entity.strategy, 'moat') || legacyText(entity, 'coreMoatDescription') || entity.architecturePattern || '';
  const cleanedMoat = rawMoat.replace(/^【.*?】/g, '').trim();
  const incumbentDilemma = entity.strategy?.incumbentDilemma || legacyText(entity, 'incumbentDilemma') || '';

  // ペインがwhatItDoesと同一の場合のフォールバック防波堤
  const effectivePain = (painRelief && painRelief !== whatItDoes)
    ? painRelief
    : (entity.targetPainWallet && entity.targetPainWallet !== whatItDoes)
      ? entity.targetPainWallet
      : targetCustomer.includes('恐怖') || targetCustomer.includes('痛み') || targetCustomer.includes('悩み')
        ? targetCustomer.replace(/^.*?が直撃する顧客急所：/u, '')
        : '';

  // 4. 冷徹な実績数字
  const monthlyRev = entity.pnl?.isRevenueUnconfirmed
    ? null
    : entity.pnl?.monthlyRevenue
      ? formatMoney(entity.pnl.monthlyRevenue)
      : null;
  const monthlyProfit = entity.pnl?.isOperatingProfitUnconfirmed
    ? null
    : entity.pnl?.operatingProfit
      ? formatMoney(entity.pnl.operatingProfit)
      : null;
  const margin = entity.pnl?.isMarginUnconfirmed || entity.pnl?.operatingMargin === undefined
    ? null
    : `${entity.pnl.operatingMargin.toFixed(1)}%`;

  // 立ち上げ初期人数 ＆ 組織規模（読者のサバンナOSを刺激する最重要キラーデータ）
  const isSolo = entity.scale === 'SOLO' || entity.tags?.some(t => t.includes('1人') || t.includes('一人') || t.includes('ソロ'));
  const rawCurrentTeam = entity.operations?.currentTeamSize ?? entity.operations?.teamSize ?? legacyNumber(entity, 'teamSize');
  const currentTeamText = entity.operations?.isTeamSizeUnconfirmed
    ? '未確認'
    : rawCurrentTeam
      ? `${rawCurrentTeam.toLocaleString()}名`
      : isSolo
        ? '1名'
        : '未確認';

  return (
    <div id="section-summary" className="space-y-4 select-text">
      {/* ========================================================= */}
      {/* 【最上段：一撃フック（ユーザー指定の絶対デザイン）】 */}
      {/* ========================================================= */}
      <div className={`rounded-xl border p-4 sm:p-5 shadow-2xl relative overflow-hidden transition-all ${
        isHazardMode
          ? 'bg-gradient-to-r from-red-950/40 via-[#120B0E] to-[#0A0D14] border-red-500/40 shadow-[0_0_30px_rgba(239,68,68,0.08)]'
          : 'bg-gradient-to-r from-[#0C1322] via-[#0E1626] to-[#080B10] border-cyan-500/40 shadow-[0_0_30px_rgba(6,182,212,0.08)]'
      }`}>
        <div className="flex items-start gap-3 relative z-10">
          <div className="shrink-0 mt-0.5 p-2 rounded-lg bg-white/[0.05] border border-white/[0.1]">
            {isHazardMode ? (
              <Flame className="w-5 h-5 text-red-400" />
            ) : (
              <Building2 className="w-5 h-5 text-cyan-400" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span className={`text-[11px] font-mono font-bold tracking-wider uppercase px-2 py-0.5 rounded border ${
                isHazardMode
                  ? 'text-red-400 bg-red-950/50 border-red-500/30'
                  : 'text-cyan-300 bg-cyan-950/50 border-cyan-500/30'
              }`}>
                {isHazardMode ? '【破綻の正体】' : '【正体】'}
              </span>
            </div>
            <p className="text-sm sm:text-base md:text-lg font-bold text-white leading-snug tracking-wide">
              {strongHeadline}
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 【淡々とした明快な3大ブロック】 */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {/* ブロック1: 何をやっているのか */}
        <div className="rounded-xl border border-white/[0.08] bg-[#0A0D14] p-4 flex flex-col justify-between shadow-lg">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2.5 pb-2 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
                <h3 className="text-xs font-bold text-zinc-200 font-mono tracking-wider uppercase">
                  1. 何をやっているのか（事業の正体）
                </h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950/60 border border-blue-500/30 text-blue-300 shrink-0">
                {entity.founder ? `主体: ${entity.founder}` : entity.scale === 'SOLO' ? '完全1人運営' : entity.scale === 'SMALL_TEAM' ? '少数精鋭' : entity.scale === 'ENTERPRISE' ? '大企業' : '自立事業者'}
              </span>
            </div>
            <p className="text-xs sm:text-[13.5px] text-zinc-100 leading-relaxed font-sans mb-3 font-semibold">
              {whatItDoes}
            </p>
            {(targetCustomer || effectivePain) && (
              <div className="space-y-1.5 pt-1">
                {targetCustomer && (
                  <div className="text-[11px] text-zinc-300 bg-white/[0.02] p-2.5 rounded border border-white/[0.04]">
                    <strong className="text-blue-400 font-mono font-semibold">【誰の財布か（対象客）】:</strong>{' '}
                    <span className="text-zinc-200">{targetCustomer}</span>
                  </div>
                )}
                {effectivePain && (
                  <div className="text-[11px] text-zinc-300 bg-white/[0.02] p-2.5 rounded border border-white/[0.04]">
                    <strong className="text-amber-400 font-mono font-semibold">【直撃ペイン（客の痛み）】:</strong>{' '}
                    <span className="text-zinc-200">{effectivePain}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ブロック2: どうやって儲けているのか（儲けのカラクリ） */}
        <div className="rounded-xl border border-white/[0.08] bg-[#0A0D14] p-4 flex flex-col justify-between shadow-lg">
          <div>
            <div className="flex items-center gap-2 mb-2.5 pb-2 border-b border-white/[0.06]">
              <span className={`w-2 h-2 rounded-full shrink-0 ${isHazardMode ? 'bg-red-400' : 'bg-emerald-400'}`} />
              <h3 className="text-xs font-bold text-zinc-200 font-mono tracking-wider uppercase">
                {isHazardMode ? '2. なぜ破綻したのか（死因の核心）' : '2. どうやって儲けているのか（儲けのカラクリ）'}
              </h3>
            </div>
            <p className="text-xs sm:text-[13.5px] text-zinc-100 leading-relaxed font-sans mb-3 font-semibold">
              {cleanedMoat || monetization || '独自のビジネスモデルと参入障壁によって競合を排除し超過利潤を確保'}
            </p>
            <div className="space-y-1.5 pt-1">
              {incumbentDilemma && (
                <div className="text-[11px] text-zinc-300 bg-white/[0.02] p-2.5 rounded border border-white/[0.04]">
                  <strong className="text-cyan-400 font-mono font-semibold">【大手が真似できない理由】:</strong>{' '}
                  <span className="text-zinc-300">{incumbentDilemma}</span>
                </div>
              )}
              {monetization && monetization !== cleanedMoat && (
                <div className="text-[11px] text-zinc-300 bg-white/[0.02] p-2 rounded border border-white/[0.04]">
                  <strong className="text-emerald-400 font-mono font-semibold">【現金の抜き方（課金構造）】:</strong>{' '}
                  <span className="text-zinc-300">{monetization}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ブロック3: 実際の数字（冷徹な通信簿） */}
      <div className="rounded-xl border border-white/[0.08] bg-[#070A0F] p-3.5 shadow-lg">
        <div className="flex items-center gap-2 mb-2.5 pb-2 border-b border-white/[0.06]">
          <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
          <h3 className="text-[11px] font-bold text-zinc-200 font-mono tracking-wider uppercase">
            3. 実際の数字（冷徹な通信簿）
          </h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
          <div className="bg-white/[0.03] p-2.5 rounded border border-white/[0.05]">
            <div className="text-[10px] text-zinc-400 font-mono">月商規模</div>
            <div className="text-xs sm:text-sm font-bold font-mono text-zinc-100 mt-0.5">
              {monthlyRev || '未公開'}
            </div>
          </div>
          <div className="bg-white/[0.03] p-2.5 rounded border border-white/[0.05]">
            <div className="text-[10px] text-zinc-400 font-mono">純手残り（営業利益）</div>
            <div className={`text-xs sm:text-sm font-bold font-mono mt-0.5 ${
              isHazardMode ? 'text-red-400' : 'text-emerald-400'
            }`}>
              {monthlyProfit || '未公開'}
            </div>
          </div>
          <div className="bg-white/[0.03] p-2.5 rounded border border-white/[0.05]">
            <div className="text-[10px] text-zinc-400 font-mono">利益率</div>
            <div className={`text-xs sm:text-sm font-bold font-mono mt-0.5 ${
              isHazardMode ? 'text-red-400' : 'text-emerald-400'
            }`}>
              {margin || '未公開'}
            </div>
          </div>
          <div className="bg-white/[0.03] p-2.5 rounded border border-white/[0.05]">
            <div className="text-[10px] text-zinc-400 font-mono">組織規模</div>
            <div className="text-xs sm:text-sm font-bold font-mono text-zinc-200 mt-0.5">
              {currentTeamText}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
