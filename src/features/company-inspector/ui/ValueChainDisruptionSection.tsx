import { legacyText } from '../model/legacy-fields';
import React from 'react';
import { Layers, ArrowRight, XCircle, CheckCircle2, ShieldAlert, Cpu, Network, Store, Users, Factory, Building2 } from 'lucide-react';
import type { InspectorSectionProps } from '../model/section-props';

export function ValueChainDisruptionSection({
  entity,
  isHazardMode
}: Pick<InspectorSectionProps, 'entity' | 'isHazardMode'>) {
  const pattern = entity.architecturePattern || '直販・中抜き関所モデル';
  const sector = entity.sector || 'SAAS';
  const moat = legacyText(entity.strategy, 'moat') || '直接顧客接点と独自アセットによる参入障壁';

  // セクターごとの従来の業界中間プレーヤーの動的推定（全7大セクター完全対応）
  const getConventionalIntermediaries = (sec: string) => {
    switch (sec) {
      case 'PHYSICAL_ASSET':
        return {
          tier1: '総合商社・1次問屋',
          tier1Cost: '+15〜20% 卸マージン',
          tier2: '大手百貨店・地域小売',
          tier2Cost: '+30〜40% 棚代・販管費',
          customerPain: '多段階マージンによる店頭価格の高止まり'
        };
      case 'MONOPOLY_MFG':
        return {
          tier1: '専門商社・技術代理店',
          tier1Cost: '+20〜30% マージン',
          tier2: '地域特約店・販売代行',
          tier2Cost: '+15〜25% マージン',
          customerPain: '納期遅延・仕様相談の伝言ゲーム・割高な見積もり'
        };
      case 'FINTECH_INFRA':
        return {
          tier1: 'メガバンク・中継決済網',
          tier1Cost: '+2〜3% 中継手数料',
          tier2: '加盟店代行・ゲートウェイ',
          tier2Cost: '+3〜5% 取引手数料',
          customerPain: '不透明な多重手数料・遅い入金サイクル・厳格な審査'
        };
      case 'CONTENT_MEDIA':
        return {
          tier1: '大手広告代理店・出版社',
          tier1Cost: '+30〜40% 仲介料',
          tier2: 'メディアレップ・配信業者',
          tier2Cost: '+20〜30% マージン',
          customerPain: '広告費の目減り・顧客データのブラックボックス化'
        };
      case 'LOCAL_SERVICES':
        return {
          tier1: 'ポータルサイト・集客PF',
          tier1Cost: '+20〜35% 手数料',
          tier2: '元請け・紹介ブローカー',
          tier2Cost: '+20〜30% 中抜き',
          customerPain: '中間マージンによる品質低下・割高な費用'
        };
      case 'AI_AUTOMATION':
        return {
          tier1: '受託開発・専門コンサル',
          tier1Cost: '+50〜70% 人月マージン',
          tier2: '撮影スタジオ・制作外注',
          tier2Cost: '+100% 人件費上乗せ',
          customerPain: '高額な人件費・納品までの長いリードタイム'
        };
      case 'NICHE_SAAS':
      default:
        return {
          tier1: 'SIer・IT総合商社',
          tier1Cost: '+30〜50% 導入費中抜き',
          tier2: '販売代理店・営業代行',
          tier2Cost: '+20〜30% リベート',
          customerPain: '巨額の初期費用・ベンダーロックイン・機能過剰'
        };
    }
  };

  const intermediaries = getConventionalIntermediaries(sector);
  const hasVerifiedModel = entity.evidenceCards?.some((card) => card.evidenceStatus === 'VERIFIED') === true;

  if (!hasVerifiedModel) {
    return (
      <section
        id="section-value-chain"
        className={`rounded-xl border p-4 sm:p-6 shadow-2xl relative overflow-hidden ${
          isHazardMode
            ? 'bg-[#0A0D14] border-red-500/25'
            : 'bg-[#0A0D14] border-white/[0.10]'
        }`}
      >
        <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-white/[0.08]">
          {isHazardMode ? <ShieldAlert className="w-4 h-4 text-red-400" /> : <Layers className="w-4 h-4 text-zinc-400" />}
          <h3 className={`text-xs font-mono font-bold tracking-wider uppercase ${isHazardMode ? 'text-red-300' : 'text-zinc-100'}`}>
            {isHazardMode ? '産業構造・失敗要因（原本照合待ち）' : 'バリューチェーン比較（原本照合待ち）'}
          </h3>
          <span className="ml-auto text-[9px] font-mono text-zinc-500 bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.08]">
            未確認
          </span>
        </div>
        <div className="rounded-lg border border-amber-500/20 bg-amber-950/10 p-3 text-xs leading-relaxed text-zinc-300">
          この記録について、直販・中間排除・利益転換・顧客データ独占・業界マージンは独立確認できていません。原本と主張の結合後に評価します。
        </div>
      </section>
    );
  }

  return (
    <div id="section-value-chain" className={`rounded-xl border p-4 sm:p-6 shadow-2xl relative overflow-hidden transition-all ${
      isHazardMode
        ? 'bg-[#0A0D14] border-red-500/25 shadow-[0_0_40px_rgba(239,68,68,0.08)]'
        : 'bg-[#0A0D14] border-white/[0.10] shadow-[0_0_40px_rgba(0,0,0,0.6)]'
    }`}>
      {/* 背景アンビエント光 */}
      <div className={`absolute top-0 right-0 w-80 h-48 rounded-full blur-[90px] pointer-events-none ${
        isHazardMode ? 'bg-red-500/8' : 'bg-indigo-500/8'
      }`} />

      {/* ヘッダー */}
      <div className="flex items-center justify-between gap-2 mb-5 pb-3 border-b border-white/[0.08] relative z-10">
        <div className="flex items-center gap-2.5">
          <Layers className={`w-4 h-4 shrink-0 ${isHazardMode ? 'text-red-400' : 'text-indigo-400'}`} />
          <h3 className={`text-xs font-mono font-bold tracking-wider uppercase ${
            isHazardMode ? 'text-red-300' : 'text-zinc-100'
          }`}>
            {isHazardMode ? '産業構造の歪み：逆ザヤ・ユニットエコノミクス破綻の構図' : '産業構造の変革：バリューチェーンの中抜きと直接超過利潤'}
          </h3>
        </div>
        <span className="text-[10px] font-mono text-zinc-400 bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.08]">
          VALUE CHAIN DISRUPTION
        </span>
      </div>

      <div className="space-y-4 relative z-10">
        {/* ========================================================= */}
        {/* 1. 従来の業界構造（多重マージン・非効率） */}
        {/* ========================================================= */}
        <div className="bg-[#0D111A]/90 rounded-lg p-3.5 border border-white/[0.06]">
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-[10px] font-mono font-bold tracking-wider text-rose-400 flex items-center gap-1.5 uppercase">
              <XCircle className="w-3.5 h-3.5 text-rose-400" />
              従来の業界構造：多段階マージン中抜き ＆ 取引摩擦
            </span>
            <span className="text-[9px] font-mono text-rose-300/80 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded">
              累積マージン上乗せ: 約40〜70%
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center text-center">
            {/* 上流 */}
            <div className="bg-black/40 border border-white/[0.06] rounded p-2.5 flex flex-col items-center">
              <Factory className="w-4 h-4 text-zinc-400 mb-1" />
              <span className="text-[11px] font-bold text-zinc-300">上流製造・開発</span>
              <span className="text-[9px] font-mono text-zinc-400 mt-0.5">原価ベース</span>
            </div>

            {/* 中間1 */}
            <div className="bg-rose-950/20 border border-rose-500/20 rounded p-2.5 flex flex-col items-center relative">
              <Building2 className="w-4 h-4 text-rose-400/80 mb-1" />
              <span className="text-[11px] font-bold text-rose-200">{intermediaries.tier1}</span>
              <span className="text-[9px] font-mono text-rose-400 mt-0.5">{intermediaries.tier1Cost}</span>
              <span className="text-[8px] text-zinc-400 line-through mt-0.5">情報格差</span>
            </div>

            {/* 中間2 */}
            <div className="bg-rose-950/20 border border-rose-500/20 rounded p-2.5 flex flex-col items-center">
              <Store className="w-4 h-4 text-rose-400/80 mb-1" />
              <span className="text-[11px] font-bold text-rose-200">{intermediaries.tier2}</span>
              <span className="text-[9px] font-mono text-rose-400 mt-0.5">{intermediaries.tier2Cost}</span>
              <span className="text-[8px] text-zinc-400 line-through mt-0.5">営業利権</span>
            </div>

            {/* 顧客 */}
            <div className="bg-black/40 border border-white/[0.06] rounded p-2.5 flex flex-col items-center">
              <Users className="w-4 h-4 text-zinc-400 mb-1" />
              <span className="text-[11px] font-bold text-zinc-300">最終顧客</span>
              <span className="text-[9px] font-mono text-rose-400/90 mt-0.5">割高・不透明</span>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 2. 当該企業の破壊モデル（直販・中抜き排除・超過利潤独占） */}
        {/* ========================================================= */}
        <div className={`rounded-lg p-3.5 border ${
          isHazardMode
            ? 'bg-red-950/20 border-red-500/30'
            : 'bg-[#0E1524]/90 border-indigo-500/30 shadow-[0_0_25px_rgba(99,102,241,0.06)]'
        }`}>
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className={`text-[10px] font-mono font-bold tracking-wider flex items-center gap-1.5 uppercase ${
              isHazardMode ? 'text-red-400' : 'text-emerald-400'
            }`}>
              {isHazardMode ? (
                <>
                  <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                  当該企業の破綻構造：逆ザヤ補助金によるユニットエコノミクス崩壊
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  {entity.name}の直結モデル：中間マージン全量バイパス ＆ 利益独占
                </>
              )}
            </span>
            <span className={`text-[9px] font-mono px-2 py-0.5 rounded border ${
              isHazardMode
                ? 'text-red-300 bg-red-500/10 border-red-500/20'
                : 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20'
            }`}>
              {isHazardMode ? '限界利益: マイナス' : '中間排除 ➔ 営業利益率へ全量転換'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 items-center">
            {/* 左: 自社独自アセット */}
            <div className="bg-black/50 border border-white/[0.08] rounded p-3 text-center flex flex-col items-center">
              <Cpu className={`w-4 h-4 mb-1 ${isHazardMode ? 'text-red-400' : 'text-cyan-400'}`} />
              <span className="text-[11px] font-bold text-zinc-100">
                自社コアエンジン・直販体制
              </span>
              <span className="text-[9px] font-mono text-zinc-400 mt-1">
                {pattern}
              </span>
            </div>

            {/* 中央: 直結関所・中抜きバイパス */}
            <div className={`rounded p-3 text-center border relative flex flex-col items-center ${
              isHazardMode
                ? 'bg-red-900/20 border-red-500/30'
                : 'bg-emerald-950/30 border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.1)]'
            }`}>
              <Network className={`w-4 h-4 mb-1 ${isHazardMode ? 'text-red-400' : 'text-emerald-400'}`} />
              <span className={`text-[11px] font-mono font-bold ${isHazardMode ? 'text-red-300' : 'text-emerald-300'}`}>
                {isHazardMode ? '逆ザヤ拡大（売るほど赤字）' : '中間多重マージンを完全排除'}
              </span>
              <span className="text-[9px] font-mono text-zinc-300 mt-1">
                {isHazardMode
                  ? 'CAC > LTV の持続不能スパイラル'
                  : '仲介コストを自社の超過利潤（EBIT）へ集約'}
              </span>
            </div>

            {/* 右: 顧客との直接接点 */}
            <div className="bg-black/50 border border-white/[0.08] rounded p-3 text-center flex flex-col items-center">
              <Users className={`w-4 h-4 mb-1 ${isHazardMode ? 'text-red-400' : 'text-emerald-400'}`} />
              <span className="text-[11px] font-bold text-zinc-100">
                エンドユーザー直接取引
              </span>
              <span className="text-[9px] font-mono text-zinc-400 mt-1">
                顧客データ独占 ＆ 即時提供
              </span>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 3. 戦略コンサル視点：構造的参入障壁の総括 */}
        {/* ========================================================= */}
        <div className="bg-black/30 rounded-lg p-3 border border-white/[0.06] flex items-start gap-2.5">
          <ArrowRight className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
          <div className="text-[11px] leading-relaxed text-zinc-300">
            <span className="font-bold text-zinc-100 mr-1.5 font-mono">
              [構造的ディスラプションの要諦]:
            </span>
            {isHazardMode
              ? '巨額資金調達をテコにした過剰な価格破壊や急拡大は、粗利とユニットエコノミクスが成立していない場合、規模の拡大とともにキャッシュバーンが幾何級数的に加速し自滅を招く。'
              : `既存の業界大手が既存の代理店網や下請け構造（カニバリズム）に縛られて身動きが取れない隙を突き、${moat}によって顧客との直接接点を掌握。中間流通コストを自社の高付加価値・高利益率へ転換している。`}
          </div>
        </div>
      </div>
    </div>
  );
}
