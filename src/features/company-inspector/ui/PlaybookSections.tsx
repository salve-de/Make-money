import React from 'react';
import { KeyRound, ShieldCheck } from 'lucide-react';
import type { InspectorSectionProps } from '../model/section-props';

export function PlaybookSections({
  entity,
  onOpenPro,
  isPro,
  formatMoney,
  isHazardMode,
}: Pick<InspectorSectionProps, 'entity' | 'onOpenPro' | 'isPro' | 'formatMoney' | 'isHazardMode'> & {
  hasEvidenceCards?: boolean;
}) {
  const hasExposureAudit = Boolean(entity.exposureAudit);
  const hasInitialTraction = Boolean(entity.strategy.initialTraction && entity.strategy.initialTraction.length > 0);
  const hasPlaybook = Boolean(entity.strategy.actionPlaybook && entity.strategy.actionPlaybook.length > 0);
  const hasAcquisition = Boolean(entity.acquisition);
  const hasProAnalysis = Boolean(entity.hasPremiumAnalysis || entity.meta);

  return (
    <section id="section-playbook" className="scroll-mt-4">
      {/* 統合実行調書サーフェス */}
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
              EXECUTION PLAYBOOK // {isHazardMode ? '破綻経緯 ＆ 致命的死線ログ' : '初動突破 ＆ 再現手順'}
            </span>
          </div>
          <span className="font-mono text-[10px] text-zinc-400">
            ACTION DOSSIER
          </span>
        </div>

        <div className="divide-y divide-white/[0.06]">
          {/* 1. 初動獲得・集客ルート（INITIAL TRACTION & ACQUISITION） */}
          {(hasInitialTraction || hasAcquisition) && (
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    isHazardMode ? 'text-red-400 bg-red-950/40 border border-red-500/30' : 'text-zinc-300 bg-white/[0.06] border border-white/[0.10]'
                  }`}>
                    PHASE 01
                  </span>
                  <span className="font-mono text-[11px] font-semibold tracking-wider text-zinc-300 uppercase">
                    {isHazardMode ? 'TRACTION & CHURN INCEPTION' : 'INITIAL 100 CUSTOMERS & FUNNEL'}
                  </span>
                </div>
                {hasAcquisition && entity.acquisition && (
                  <div className="flex items-center gap-2 font-mono text-[11px]">
                    <span className="text-zinc-400">獲得単価 (CAC):</span>
                    <span className={`font-semibold ${isHazardMode ? 'text-red-400' : 'text-emerald-400'}`}>
                      {entity.acquisition.cacJpy === 0 ? '0円' : formatMoney(entity.acquisition.cacJpy)}
                    </span>
                  </div>
                )}
              </div>

              {/* CACファネル説明 */}
              {hasAcquisition && entity.acquisition?.primaryFunnel && (
                <div className="text-xs text-zinc-300 font-sans leading-relaxed pb-1">
                  <span className="text-zinc-400 font-mono text-[11px] mr-1.5">[主要チャネル]</span>
                  {entity.acquisition.primaryFunnel}
                </div>
              )}

              {/* 初動手順リスト */}
              {hasInitialTraction && (
                <div className="space-y-1.5 pt-1">
                  {entity.strategy.initialTraction.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-xs text-zinc-300">
                      <span className={`font-mono text-[10px] font-bold px-1 py-0.2 rounded mt-0.5 shrink-0 ${
                        isHazardMode ? 'text-red-400 bg-red-950/30' : 'text-zinc-400 bg-white/[0.04]'
                      }`}>
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <span className="leading-relaxed font-sans flex-1">{item}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 2. 客観的現場ログ・監査（EXPOSURE AUDIT） */}
          {hasExposureAudit && entity.exposureAudit && (
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  isHazardMode ? 'text-red-400 bg-red-950/40 border border-red-500/30' : 'text-zinc-300 bg-white/[0.06] border border-white/[0.10]'
                }`}>
                  PHASE 02
                </span>
                <span className="font-mono text-[11px] font-semibold tracking-wider text-zinc-300 uppercase">
                  {isHazardMode ? 'FATAL LOGS & BLEEDING AUDIT' : 'DEEP FIELD AUDIT & UNDERGROUND LOGS'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* ゲリラ集客 */}
                <div className="p-3 rounded bg-white/[0.02] border border-white/[0.04] space-y-1">
                  <div className="font-mono text-[11px] font-semibold text-zinc-300 flex items-center gap-1.5">
                    <span className={isHazardMode ? 'text-red-400' : 'text-zinc-400'}>{'//'}</span>
                    <span>{isHazardMode ? '初期の過熱と数字の錯覚' : '創業初期の集客手口'}</span>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                    {entity.exposureAudit.guerrillaTraction}
                  </p>
                </div>

                {/* 規約の隙間 */}
                <div className="p-3 rounded bg-white/[0.02] border border-white/[0.04] space-y-1">
                  <div className="font-mono text-[11px] font-semibold text-zinc-300 flex items-center gap-1.5">
                    <span className={isHazardMode ? 'text-red-400' : 'text-zinc-400'}>{'//'}</span>
                    <span>{isHazardMode ? '規約変更・依存の代償' : 'プラットフォーム規約の隙間'}</span>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                    {entity.exposureAudit.platformGlitch}
                  </p>
                </div>

                {/* ピボット・死線 */}
                <div className="p-3 rounded bg-white/[0.02] border border-white/[0.04] space-y-1">
                  <div className="font-mono text-[11px] font-semibold text-zinc-300 flex items-center gap-1.5">
                    <span className={isHazardMode ? 'text-red-400' : 'text-zinc-400'}>{'//'}</span>
                    <span>事業転換（ピボット）と死線</span>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                    {entity.exposureAudit.pivotSnapshot}
                  </p>
                </div>

                {/* 裏原価 */}
                <div className="p-3 rounded bg-white/[0.02] border border-white/[0.04] space-y-1">
                  <div className="font-mono text-[11px] font-semibold text-zinc-300 flex items-center gap-1.5">
                    <span className={isHazardMode ? 'text-red-400' : 'text-zinc-400'}>{'//'}</span>
                    <span>{isHazardMode ? '原価高騰と固定費出血' : '実際に使っていたツールと原価'}</span>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                    {entity.exposureAudit.hiddenStackCost}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 3. 再現・実行ステップ（REPLICATION STEPS） */}
          {hasPlaybook && (
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  isHazardMode ? 'text-red-400 bg-red-950/40 border border-red-500/30' : 'text-zinc-300 bg-white/[0.06] border border-white/[0.10]'
                }`}>
                  PHASE 03
                </span>
                <span className="font-mono text-[11px] font-semibold tracking-wider text-zinc-300 uppercase">
                  {isHazardMode ? 'AVOIDANCE PLAYBOOK' : 'REPLICATION PLAYBOOK'}
                </span>
              </div>

              <div className="space-y-2">
                {entity.strategy.actionPlaybook.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-3 text-xs text-zinc-300 p-2 rounded hover:bg-white/[0.01]">
                    <span className={`font-mono text-[11px] font-bold shrink-0 mt-0.5 ${
                      isHazardMode ? 'text-red-400' : 'text-zinc-400'
                    }`}>
                      STEP {String(idx + 1).padStart(2, '0')}
                    </span>
                    <span className="leading-relaxed font-sans flex-1">{step}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. PRO分析（DEEP STRUCTURAL MECHANISMS） */}
          {hasProAnalysis && (
            <div className="p-4 space-y-3 bg-white/[0.01]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    isHazardMode ? 'text-red-300 bg-red-950/60 border border-red-500/40' : 'text-emerald-300 bg-emerald-950/60 border border-emerald-500/40'
                  }`}>
                    PRO INTELLIGENCE
                  </span>
                  <span className="font-mono text-[11px] font-semibold tracking-wider text-zinc-300 uppercase">
                    {isHazardMode ? '4 CAUSES OF FATAL COLLAPSE' : '4 STRUCTURAL PROFIT DRIVERS'}
                  </span>
                </div>
                {isPro && entity.meta && (
                  <span className="font-mono text-[10px] text-emerald-400 flex items-center gap-1 font-bold">
                    <ShieldCheck className="w-3 h-3" />
                    解錠済
                  </span>
                )}
              </div>

              {isPro && entity.meta ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  {/* #01 大手のジレンマ */}
                  <div className="p-3 rounded bg-[#0D1017] border border-white/[0.06] space-y-1.5">
                    <div className="font-mono text-[11px] font-bold text-zinc-200">
                      01. {isHazardMode ? '大手の参入・市場奪取' : '大手が参入できない構造'}
                    </div>
                    <div className="text-[11px] text-zinc-400 space-y-1 font-sans">
                      <div><span className="text-zinc-300 font-mono">障壁:</span> {entity.meta.incumbentDilemma.cannibalizationBarrier}</div>
                      <div><span className="text-zinc-300 font-mono">規模不一致:</span> {entity.meta.incumbentDilemma.scaleMismatchReason}</div>
                      <div><span className="text-zinc-300 font-mono">速度優位:</span> {entity.meta.incumbentDilemma.decisionSpeedAdvantage}</div>
                    </div>
                  </div>

                  {/* #02 価格決定力 */}
                  <div className="p-3 rounded bg-[#0D1017] border border-white/[0.06] space-y-1.5">
                    <div className="font-mono text-[11px] font-bold text-zinc-200">
                      02. {isHazardMode ? '値付け失敗と挫折' : '高い価格でも購入される理由'}
                    </div>
                    <div className="text-[11px] text-zinc-400 space-y-1 font-sans">
                      <div><span className="text-zinc-300 font-mono">比較基準:</span> {entity.meta.pricingPower.anchorComparison}</div>
                      <div><span className="text-zinc-300 font-mono">損失回避:</span> {entity.meta.pricingPower.lossAversionTrigger}</div>
                      <div><span className="text-zinc-300 font-mono">財布区分:</span> {entity.meta.pricingPower.budgetCategory}</div>
                    </div>
                  </div>

                  {/* #03 解約防止 */}
                  <div className="p-3 rounded bg-[#0D1017] border border-white/[0.06] space-y-1.5">
                    <div className="font-mono text-[11px] font-bold text-zinc-200">
                      03. {isHazardMode ? '防壁欠落と解約急増' : '顧客が解約できない仕組み'}
                    </div>
                    <div className="text-[11px] text-zinc-400 space-y-1 font-sans">
                      <div><span className="text-zinc-300 font-mono">人質データ:</span> {entity.meta.lockInMechanism.dataHostage}</div>
                      <div><span className="text-zinc-300 font-mono">業務統合:</span> {entity.meta.lockInMechanism.workflowIntegration}</div>
                      <div><span className="text-zinc-300 font-mono">乗換摩擦:</span> {entity.meta.lockInMechanism.switchingFriction}</div>
                    </div>
                  </div>

                  {/* #04 資本効率 */}
                  <div className="p-3 rounded bg-[#0D1017] border border-white/[0.06] space-y-1.5">
                    <div className="font-mono text-[11px] font-bold text-zinc-200">
                      04. {isHazardMode ? '資金繰り破綻・枯渇' : '現金が手元に残り続ける理由'}
                    </div>
                    <div className="text-[11px] text-zinc-400 space-y-1 font-sans">
                      <div><span className="text-zinc-300 font-mono">入金サイクル:</span> {entity.meta.capitalEfficiency.cashConversionCycle}</div>
                      <div><span className="text-zinc-300 font-mono">限界粗利:</span> {entity.meta.capitalEfficiency.incrementalMargin}</div>
                      <div><span className="text-zinc-300 font-mono">運転資本:</span> {entity.meta.capitalEfficiency.workingCapitalStrategy}</div>
                    </div>
                  </div>
                </div>
              ) : !isPro ? (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded bg-white/[0.02] border border-white/[0.06]">
                  <div className="space-y-0.5 text-center sm:text-left">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-200 justify-center sm:justify-start">
                      <KeyRound className="w-3.5 h-3.5 text-zinc-400" />
                      <span>{isHazardMode ? '事業破綻の4大根本原因（深層解剖）' : '大手が手を出せない4つの裏構造（深層解剖）'}</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 font-sans">
                      {isHazardMode ? '競合圧殺・資金枯渇の内訳と死線ログを完全公開' : '大手のジレンマ、価格決定力、解約阻止、資本効率の完全調書'}
                    </p>
                  </div>
                  <button
                    onClick={onOpenPro}
                    className="shrink-0 text-xs font-mono font-medium text-zinc-200 bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.12] px-3 py-1.5 rounded transition-colors cursor-pointer"
                  >
                    PROプランの内容を確認する
                  </button>
                </div>
              ) : (
                <p className="text-xs text-zinc-400">PRO分析を取得できていません。企業を選び直して再取得してください。</p>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
