import { legacyText, legacyNumber } from '../model/legacy-fields';
import React from 'react';
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
  // 1. 最上段のエレベーター・シシス（事業の本質）
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

  // 3. どうやって儲けているのか（超過利潤の源泉）
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

  // 4. 冷徹な実績数字（4大KPI）
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

  // 組織規模
  const isSolo = entity.scale === 'SOLO' || entity.tags?.some(t => t.includes('1人') || t.includes('一人') || t.includes('ソロ'));
  const rawCurrentTeam = entity.operations?.currentTeamSize ?? entity.operations?.teamSize ?? legacyNumber(entity, 'teamSize');
  const currentTeamText = entity.operations?.isTeamSizeUnconfirmed
    ? '未確認'
    : rawCurrentTeam
      ? `${rawCurrentTeam.toLocaleString()}名`
      : isSolo
        ? '1名'
        : '未確認';

  // 主体ラベル
  const operatorLabel = entity.founder
    ? `主体: ${entity.founder}`
    : entity.scale === 'SOLO'
      ? '完全1人運営'
      : entity.scale === 'SMALL_TEAM'
        ? '少数精鋭'
        : entity.scale === 'ENTERPRISE'
          ? '大企業'
          : '自立事業者';

  return (
    <div id="section-summary" className="select-text">
      {/* ========================================================= */}
      {/* 【PitchBook式 単一テアシード（マトリョーシカ箱の完全解体）】 */}
      {/* ========================================================= */}
      <div className={`rounded-md border overflow-hidden transition-all ${
        isHazardMode
          ? 'border-red-500/30 bg-[#0F0B0E]'
          : 'border-white/[0.12] bg-[#10131C]'
      }`}>
        {/* 1. エレベーター・シシス（事業の本質・白太字） */}
        <div className={`p-5 sm:p-6 border-b ${
          isHazardMode
            ? 'bg-red-950/20 border-red-500/20'
            : 'bg-[#131724] border-white/[0.08]'
        }`}>
          <div className="flex items-center justify-between gap-3 mb-2.5">
            <span className={`text-[10px] font-mono font-bold tracking-wider uppercase px-2 py-0.5 rounded border ${
              isHazardMode
                ? 'text-red-400 bg-red-950/40 border-red-500/30'
                : 'text-zinc-200 bg-white/[0.06] border-white/[0.12]'
            }`}>
              {isHazardMode ? 'FATAL MECHANISM // 破綻の正体' : 'INVESTMENT THESIS // 事業の正体'}
            </span>
            <span className="text-[11px] font-mono text-zinc-400">
              {operatorLabel}
            </span>
          </div>
          <h3 className="text-base sm:text-lg md:text-xl font-bold text-[#F4F5F7] leading-snug tracking-tight font-sans">
            {strongHeadline}
          </h3>
        </div>

        {/* 2. 4大KPI水平ストリップ（枠線なし・等間隔分割・白太字＋変化率アクセント） */}
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-white/[0.08] border-b border-white/[0.08] bg-[#0D1017]">
          <div className="p-3.5 sm:py-4 text-center">
            <span className="text-[11px] font-mono text-zinc-400 block mb-1 font-medium">
              月商規模
            </span>
            <span className="text-base sm:text-lg font-bold font-mono tabular-nums text-[#F4F5F7]">
              {monthlyRev || '未公開'}
            </span>
          </div>
          <div className="p-3.5 sm:py-4 text-center">
            <span className="text-[11px] font-mono text-zinc-400 block mb-1 font-medium">
              純手残り (営業利益)
            </span>
            <span className={`text-base sm:text-lg font-bold font-mono tabular-nums ${
              isHazardMode ? 'text-red-400' : 'text-[#F4F5F7]'
            }`}>
              {monthlyProfit || '未公開'}
            </span>
          </div>
          <div className="p-3.5 sm:py-4 text-center">
            <span className="text-[11px] font-mono text-zinc-400 block mb-1 font-medium">
              営業利益率
            </span>
            <span className={`text-base sm:text-lg font-bold font-mono tabular-nums ${
              isHazardMode ? 'text-red-400' : 'text-[#10B981]'
            }`}>
              {margin || '未公開'}
            </span>
          </div>
          <div className="p-3.5 sm:py-4 text-center">
            <span className="text-[11px] font-mono text-zinc-400 block mb-1 font-medium">
              組織規模
            </span>
            <span className="text-base sm:text-lg font-bold font-mono tabular-nums text-[#E2E4E9]">
              {currentTeamText}
            </span>
          </div>
        </div>

        {/* 3. デューデリジェンス2カラム調書（エディトリアルレイアウト） */}
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/[0.08] bg-[#10131C]">
          {/* 左カラム: 事業の正体 ＆ 顧客ペイン */}
          <div className="p-5 space-y-4">
            <div>
              <span className="text-xs font-mono tracking-wider text-zinc-400 block mb-1.5 font-semibold">
                01. 提供ソリューション // WHAT IT DOES
              </span>
              <p className="text-[13px] text-zinc-100 leading-relaxed font-sans font-medium">
                {whatItDoes}
              </p>
            </div>

            {(targetCustomer || effectivePain) && (
              <div className="space-y-3 pt-3 border-t border-white/[0.06]">
                {targetCustomer && (
                  <div>
                    <span className="text-[11px] font-mono text-zinc-400 block mb-1 font-medium">
                      対象顧客 // TARGET AUDIENCE
                    </span>
                    <p className="text-xs text-zinc-300 font-sans leading-relaxed">
                      {targetCustomer}
                    </p>
                  </div>
                )}
                {effectivePain && (
                  <div>
                    <span className="text-[11px] font-mono text-amber-400 block mb-1 font-semibold">
                      直撃ペイン // CORE PAIN WALLET
                    </span>
                    <p className="text-xs text-zinc-200 font-sans leading-relaxed">
                      {effectivePain}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 右カラム: 超過利潤の源泉 ＆ 課金構造 */}
          <div className="p-5 space-y-4">
            <div>
              <span className="text-xs font-mono tracking-wider text-zinc-400 block mb-1.5 font-semibold">
                {isHazardMode ? '02. 死因の核心 // FATAL BLEED' : '02. 超過利潤の源泉 // COMPETITIVE MOAT'}
              </span>
              <p className="text-[13px] text-zinc-100 leading-relaxed font-sans font-medium">
                {cleanedMoat || monetization || '独自のビジネスモデルと参入障壁によって競合を排除し超過利潤を確保'}
              </p>
            </div>

            {(incumbentDilemma || (monetization && monetization !== cleanedMoat)) && (
              <div className="space-y-3 pt-3 border-t border-white/[0.06]">
                {incumbentDilemma && (
                  <div>
                    <span className="text-[11px] font-mono text-blue-400 block mb-1 font-semibold">
                      大手が真似できない理由 // INCUMBENT DILEMMA
                    </span>
                    <p className="text-xs text-zinc-200 font-sans leading-relaxed">
                      {incumbentDilemma}
                    </p>
                  </div>
                )}
                {monetization && monetization !== cleanedMoat && (
                  <div>
                    <span className="text-[11px] font-mono text-emerald-400 block mb-1 font-semibold">
                      現金の抜き方 // MONETIZATION
                    </span>
                    <p className="text-xs text-zinc-200 font-sans leading-relaxed">
                      {monetization}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
