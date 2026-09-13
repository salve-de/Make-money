import {
AlertTriangle,
Crosshair,
KeyRound,
Layers,
ShieldCheck,
Skull,
Users,
Zap
} from 'lucide-react';

import type { InspectorSectionProps } from '../model/section-props';

export function PlaybookSections({ entity, onOpenPro, isPro, formatMoney, isHazardMode }: Pick<InspectorSectionProps, 'entity' | 'onOpenPro' | 'isPro' | 'formatMoney' | 'isHazardMode'> & { hasEvidenceCards?: boolean }) {
  return <>
          {/* ------------------------------------------------------- */}
          {/* #09〜#12: 実務Playbook ＆ 初動突破ログ / 死因確定ログ ＆ 崩壊スパイラル (フォールバック) */}
          {/* ------------------------------------------------------- */}
          <div className="space-y-8">
            {/* 高収益事業の真実：初期突破の手口と裏原価 / 致命的死因の客観ログ */}
            {entity.exposureAudit && (
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
                      #09
                    </span>
                    <div className="flex items-center gap-1.5">
                      {isHazardMode ? (
                        <Skull className="w-3.5 h-3.5 text-red-400" />
                      ) : (
                        <Crosshair className="w-3.5 h-3.5 text-zinc-300" />
                      )}
                      <h3 className={`font-mono text-xs font-bold uppercase tracking-wider ${
                        isHazardMode ? 'text-red-200' : 'text-zinc-100'
                      }`}>
                        {isHazardMode ? '失敗に至った客観的な記録' : '初期に客を集めた手口とリアルな原価'}
                      </h3>
                    </div>
                  </div>
                  <span className={`font-mono text-[10px] px-2 py-0.5 rounded border ${
                    isHazardMode
                      ? 'text-red-300 bg-red-950/60 border-red-500/30 font-bold'
                      : 'text-zinc-400 bg-white/[0.04] border-white/[0.06]'
                  }`}>
                    {isHazardMode ? '失敗要因' : '確認済'}
                  </span>
                </div>

                <div className={`divide-y text-xs font-sans ${
                  isHazardMode ? 'divide-red-500/10' : 'divide-white/[0.06]'
                }`}>
                  {/* ① 初期ゲリラ戦・自演ログ / 初期錯覚トラクション */}
                  <div className="p-3.5 space-y-1.5 bg-[#0E131F]">
                    <div className="flex items-center gap-2 font-mono text-xs font-bold">
                      <span className={isHazardMode ? 'text-red-400' : 'text-zinc-400'}>01.</span>
                      <span className={isHazardMode ? 'text-red-200' : 'text-zinc-200'}>
                        {isHazardMode ? '初期の過熱と数字の錯覚' : '創業初期の集客手口'}
                      </span>
                    </div>
                    <p className="text-zinc-300 leading-relaxed font-sans pl-4">
                      {entity.exposureAudit.guerrillaTraction}
                    </p>
                  </div>

                  {/* ② プラットフォーム規約の盲点工夫 / 致命的規約違反・依存 */}
                  <div className="p-3.5 space-y-1.5 bg-[#0E131F]">
                    <div className="flex items-center gap-2 font-mono text-xs font-bold">
                      <span className={isHazardMode ? 'text-red-400' : 'text-zinc-400'}>02.</span>
                      <span className={isHazardMode ? 'text-red-200' : 'text-zinc-200'}>
                        {isHazardMode ? 'プラットフォーム規約への過度な依存' : 'プラットフォームの隙間・規約の穴'}
                      </span>
                    </div>
                    <p className="text-zinc-300 leading-relaxed font-sans pl-4">
                      {entity.exposureAudit.platformGlitch}
                    </p>
                  </div>

                  {/* ③ 死線とピボット魚拓 */}
                  <div className="p-3.5 space-y-1.5 bg-[#0E131F]">
                    <div className="flex items-center gap-2 font-mono text-xs font-bold">
                      <span className={isHazardMode ? 'text-red-400' : 'text-zinc-400'}>03.</span>
                      <span className={isHazardMode ? 'text-red-200' : 'text-zinc-200'}>
                        {isHazardMode ? '事業転換（ピボット）の履歴' : '事業転換（ピボット）の履歴'}
                      </span>
                    </div>
                    <p className="text-zinc-300 leading-relaxed font-sans pl-4">
                      {entity.exposureAudit.pivotSnapshot}
                    </p>
                  </div>

                  {/* ④ 表向き隠された裏原価 / 原価高騰と固定費出血 */}
                  <div className="p-3.5 space-y-1.5 bg-[#0E131F]">
                    <div className="flex items-center gap-2 font-mono text-xs font-bold">
                      <span className={isHazardMode ? 'text-red-400' : 'text-zinc-400'}>04.</span>
                      <span className={isHazardMode ? 'text-red-200' : 'text-zinc-200'}>
                        {isHazardMode ? '想定外にかさんだコスト・固定費' : '実際に使っていたツールと原価の内訳'}
                      </span>
                    </div>
                    <p className="text-zinc-300 leading-relaxed font-sans pl-4">
                      {entity.exposureAudit.hiddenStackCost}
                    </p>
                  </div>
                </div>
              </div>
            )}

          {/* 最初の100人を獲得した手順 / 熱狂の終焉 */}
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
                  #10
                </span>
                <div className="flex items-center gap-1.5">
                  <Users className={`w-3.5 h-3.5 ${isHazardMode ? 'text-red-400' : 'text-zinc-400'}`} />
                  <h3 className={`font-mono text-xs font-bold uppercase tracking-wider ${
                    isHazardMode ? 'text-red-200' : 'text-zinc-100'
                  }`}>
                    {isHazardMode ? '初期の伸びと解約が始まったきっかけ' : '最初の100人を集めた具体的な手順'}
                  </h3>
                </div>
              </div>
              <span className="font-mono text-[10px] text-zinc-400 bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.06]">
                初動獲得
              </span>
            </div>
            <div className="divide-y divide-white/[0.06] bg-[#0E131F]">
              {entity.strategy.initialTraction.map((item, idx) => (
                <div key={idx} className="p-3.5 flex items-start gap-3 text-xs text-zinc-200">
                  <span className={`font-mono text-xs shrink-0 font-bold ${isHazardMode ? 'text-red-400' : 'text-zinc-400'}`}>{idx + 1}.</span>
                  <span className="leading-relaxed">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 再現・実行ステップ / 踏んではいけない地雷チェックリスト */}
          <div
            id="section-playbook"
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
                  #11
                </span>
                <div className="flex items-center gap-1.5">
                  {isHazardMode ? (
                    <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                  ) : (
                    <Layers className="w-3.5 h-3.5 text-zinc-400" />
                  )}
                  <h3 className={`font-mono text-xs font-bold uppercase tracking-wider ${
                    isHazardMode ? 'text-red-200' : 'text-zinc-100'
                  }`}>
                    {isHazardMode ? '避けるべき失敗パターン' : '事業を再現する具体的な手順'}
                  </h3>
                </div>
              </div>
              <span className="font-mono text-[10px] text-zinc-400 bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.06]">
                実行手順
              </span>
            </div>
            <div className={`divide-y ${
              isHazardMode ? 'divide-red-500/10' : 'divide-white/[0.06]'
            } bg-[#0E131F]`}>
              {entity.strategy.actionPlaybook.map((step, idx) => (
                <div key={idx} className="p-3.5 text-xs text-zinc-200 leading-relaxed">
                  {step}
                </div>
              ))}
            </div>
          </div>

          {/* 顧客獲得動線 / 崩壊した獲得動線 */}
          {entity.acquisition && (
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
                    #12
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Zap className={`w-3.5 h-3.5 ${isHazardMode ? 'text-red-400' : 'text-zinc-400'}`} />
                    <h3 className={`font-mono text-xs font-bold uppercase tracking-wider ${
                      isHazardMode ? 'text-red-200' : 'text-zinc-100'
                    }`}>
                      {isHazardMode ? '行き詰まった集客ルート' : '主な集客ルートと獲得コスト'}
                    </h3>
                  </div>
                </div>
                <span className="font-mono text-[11px] text-zinc-300 font-bold">
                  獲得単価 (CAC): <strong className={isHazardMode ? 'text-red-400' : 'text-emerald-400'}>{entity.acquisition.cacJpy === 0 ? '0円' : formatMoney(entity.acquisition.cacJpy)}</strong>
                </span>
              </div>
              <div className="p-3.5 text-xs text-zinc-200 bg-[#0E131F]">
                {entity.acquisition.primaryFunnel}
              </div>
            </div>
          )}
          </div>

          {/* ========================================================= */}
          {/* 【PRO EXCLUSIVE: 儲かり続ける4つの裏構造 / 崩壊を招いた4つの構造的死因 (フォールバック)】 */}
          {/* ========================================================= */}
          {(entity.hasPremiumAnalysis || entity.meta) && (
            <div className={`relative rounded-lg overflow-hidden border shadow-2xl ${
              isHazardMode ? 'border-red-500/30 bg-[#0E131F]' : 'border-white/[0.12] bg-[#0E131F]'
            }`}>
              {/* ヘッダー */}
              <div className={`flex items-center justify-between px-3.5 py-2.5 border-b ${
                isHazardMode ? 'bg-red-950/40 border-red-500/30' : 'bg-[#141A29] border-white/[0.08]'
              }`}>
                <div className="flex items-center gap-2.5">
                  <div className={`w-1 h-3.5 rounded-full ${
                    isHazardMode ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                  }`} />
                  <span className={`font-mono text-xs font-bold px-1.5 py-0.5 rounded border ${
                    isHazardMode
                      ? 'text-red-300 bg-red-900/40 border-red-500/40'
                      : 'text-emerald-300 bg-emerald-950/60 border-emerald-500/40'
                  }`}>
                    PRO
                  </span>
                  <div className="flex items-center gap-1.5">
                    {isHazardMode ? (
                      <Skull className="w-3.5 h-3.5 text-red-400" />
                    ) : (
                      <ShieldCheck className="w-3.5 h-3.5 text-zinc-300" />
                    )}
                    <h3 className={`text-xs font-mono font-bold uppercase tracking-wider ${
                      isHazardMode ? 'text-red-200' : 'text-zinc-100'
                    }`}>
                      {isHazardMode ? '事業が立ち行かなくなった4つの根本原因' : '高収益を維持し続ける4つの仕組み'}
                    </h3>
                  </div>
                </div>
                {isPro && entity.meta ? (
                  <span className={`font-mono text-[10px] border px-2 py-0.5 rounded flex items-center gap-1 font-bold ${
                    isHazardMode
                      ? 'text-red-300 bg-red-950/60 border-red-800/60'
                      : 'text-emerald-300 bg-emerald-950/60 border-emerald-800/60'
                  }`}>
                    <ShieldCheck className="w-3 h-3" />
                    解錠済
                  </span>
                ) : (
                  <span className="text-[10px] font-mono text-zinc-400 bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.06]">
                    詳細分析
                  </span>
                )}
              </div>

              {/* サーバー取得済みのPRO本文だけを描画。未契約では本文をDOMへ入れない。 */}
              <div className="relative p-3.5 bg-[#0E131F]">
                {isPro && entity.meta && (
                <div className="space-y-3 text-xs font-sans text-zinc-100">
                  {/* #01 なぜ大手が手を出せないのか / 大手による直接圧殺 */}
                  <div className="p-3 rounded-md bg-[#141A28] border border-white/[0.06] space-y-1.5">
                    <div className="flex items-center gap-2 text-zinc-200 font-mono text-xs font-bold">
                      <span className={isHazardMode ? "text-red-400" : "text-zinc-400"}>01.</span>
                      <span>{isHazardMode ? '大手の直接参入と市場の奪取' : '大手が手を出せない理由（大手のジレンマ）'}</span>
                    </div>
                    <div className="space-y-1 text-[11px] text-zinc-300 leading-relaxed font-sans">
                      <div><strong className="text-zinc-200 font-mono">大手のジレンマ:</strong> {entity.meta.incumbentDilemma.cannibalizationBarrier}</div>
                      <div><strong className="text-zinc-200 font-mono">大企業が狙えない市場規模:</strong> {entity.meta.incumbentDilemma.scaleMismatchReason}</div>
                      <div><strong className="text-zinc-200 font-mono">スピードの差:</strong> {entity.meta.incumbentDilemma.decisionSpeedAdvantage}</div>
                    </div>
                  </div>

                  {/* #02 なぜ暴利でも客が群がるのか / 値付けの破綻 */}
                  <div className="p-3 rounded-md bg-[#141A28] border border-white/[0.06] space-y-1.5">
                    <div className="flex items-center gap-2 text-zinc-200 font-mono text-xs font-bold">
                      <span className={isHazardMode ? "text-red-400" : "text-zinc-400"}>02.</span>
                      <span>{isHazardMode ? '価格設定の失敗と収益化の挫折' : '高い価格でも客が買う理由（価格設定の工夫）'}</span>
                    </div>
                    <div className="space-y-1 text-[11px] text-zinc-300 leading-relaxed font-sans">
                      <div><strong className="text-zinc-200 font-mono">比較の基準:</strong> {entity.meta.pricingPower.anchorComparison}</div>
                      <div><strong className="text-zinc-200 font-mono">失うことへの恐怖:</strong> {entity.meta.pricingPower.lossAversionTrigger}</div>
                      <div><strong className="text-zinc-200 font-mono">痛まない予算（企業の経費等）:</strong> {entity.meta.pricingPower.budgetCategory}</div>
                    </div>
                  </div>

                  {/* #03 なぜ客が一生辞められないのか / 顧客離脱の激痛 */}
                  <div className="p-3 rounded-md bg-[#141A28] border border-white/[0.06] space-y-1.5">
                    <div className="flex items-center gap-2 text-zinc-200 font-mono text-xs font-bold">
                      <span className={isHazardMode ? "text-red-400" : "text-zinc-400"}>03.</span>
                      <span>{isHazardMode ? '防壁の欠落と解約の急増' : '客が解約しない理由（解約の手間・乗り換えの壁）'}</span>
                    </div>
                    <div className="space-y-1 text-[11px] text-zinc-300 leading-relaxed font-sans">
                      <div><strong className="text-zinc-200 font-mono">データの蓄積:</strong> {entity.meta.lockInMechanism.dataHostage}</div>
                      <div><strong className="text-zinc-200 font-mono">日々の業務への定着:</strong> {entity.meta.lockInMechanism.workflowIntegration}</div>
                      <div><strong className="text-zinc-200 font-mono">乗り換えの手間:</strong> {entity.meta.lockInMechanism.switchingFriction}</div>
                    </div>
                  </div>

                  {/* #04 なぜ無借金で現金が膨らみ続けるのか / 資金枯渇のカラクリ */}
                  <div className="p-3 rounded-md bg-[#141A28] border border-white/[0.06] space-y-1.5">
                    <div className="flex items-center gap-2 text-zinc-200 font-mono text-xs font-bold">
                      <span className={isHazardMode ? "text-red-400" : "text-zinc-400"}>04.</span>
                      <span>{isHazardMode ? '資金繰りの破綻と資金枯渇' : '手元に現金が残り続ける理由（資金繰りの有利さ・高い粗利）'}</span>
                    </div>
                    <div className="space-y-1 text-[11px] text-zinc-300 leading-relaxed font-sans">
                      <div><strong className="text-zinc-200 font-mono">前金受け取り（資金繰りの有利さ）:</strong> {entity.meta.capitalEfficiency.cashConversionCycle}</div>
                      <div><strong className="text-zinc-200 font-mono">高い粗利率:</strong> {entity.meta.capitalEfficiency.incrementalMargin}</div>
                      <div><strong className="text-zinc-200 font-mono">手元に現金が残る仕組み:</strong> {entity.meta.capitalEfficiency.workingCapitalStrategy}</div>
                    </div>
                  </div>
                </div>

                )}
                {isPro && !entity.meta && (
                  <p role="status" className="text-xs text-zinc-300 p-3">
                    PRO分析を取得できていません。企業を選び直して再取得してください。
                  </p>
                )}
                {/* 本文を含まない契約案内 */}
                {!isPro && (
                  <div className="flex flex-col items-center justify-center bg-black/80 rounded gap-2.5 p-4 text-center">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                      <KeyRound className={`w-4 h-4 ${isHazardMode ? 'text-red-400' : 'text-emerald-400'}`} />
                      <span>{isHazardMode ? '事業が失敗・撤退に至った「4つの根本原因」' : '大手が参入できず、客が離れない「4つの高収益構造」'}</span>
                    </div>
                    <p className="text-xs text-zinc-300 max-w-sm font-sans leading-normal">
                      {isHazardMode
                        ? 'なぜ競合に敗れたのか、どこで資金が尽きたのか、事業が崩壊した内訳をすべて公開'
                        : '高い利益率を維持できる理由、顧客が乗り換えない理由、手元に現金が残る仕組みをすべて公開'}
                    </p>
                    <button
                      onClick={onOpenPro}
                      className="text-xs font-mono font-bold text-zinc-950 bg-white hover:bg-zinc-200 px-4 py-2 rounded transition-colors shadow-2xl cursor-pointer"
                    >
                      PROプランの内容を確認する
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}


  </>;
}
