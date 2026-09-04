'use client';

import React from 'react';

interface TierData {
  level: string;
  roleTitle: string;
  badge: string;
  badgeColor: string;
  marginRate: string;
  reality: string;
  actionAdvice: string;
}

const PYRAMID_TIERS: TierData[] = [
  {
    level: 'TIER 01 / 最上層',
    roleTitle: 'ルールメイカー・決済基盤の元締め (Apple, Google, Stripe)',
    badge: '絶対的支配者',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    marginRate: '手数料 3%〜30% 自動徴収',
    reality: '世界中のトランザクションから一切の汗を流さずに課金。誰もこの基盤から逃れることはできない。',
    actionAdvice: '個人がここを目指すのは不可能。このインフラを「最も安く使い倒す側」に回るのが正解。',
  },
  {
    level: 'TIER 02 / 上層 ★推奨領域',
    roleTitle: '仕組みの所有者・一人オーナー (マイクロSaaS, 無人倉庫, 独自メディア)',
    badge: '狙うべき金塊',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    marginRate: '純利益率 80%〜95%',
    reality: '他人のプラットフォームの上で、自前の顧客リストと決済導線を構築。労働をAIとツールに代替させ、寝ていても着金。',
    actionAdvice: '当台帳に収録されている勝ち組の9割がここに位置する。今すぐここにポジションを取れ。',
  },
  {
    level: 'TIER 03 / 中層',
    roleTitle: '紹介者・アフィリエイター・代理店 (インフルエンサー, レビュー発信者)',
    badge: '中抜きプレイヤー',
    badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    marginRate: '紹介報酬 20%〜40%',
    reality: '自分でプロダクトを持たず、他人の商品を拡散して利ざやを抜く。トラフィックさえあれば元手ゼロで稼げるが、紹介元に首根っこを掴まれている。',
    actionAdvice: '初心者の初動キャッシュ獲得（軍資金作り）としては最適だが、早急にTIER 02へ移行すべし。',
  },
  {
    level: 'TIER 04 / 最下層 ⚠️脱出必須',
    roleTitle: '使い捨て作業員・時間切り売り労働者 (格安受託, 単純データ入力, ギグワーカー)',
    badge: '搾取される側',
    badgeColor: 'bg-zinc-800 text-zinc-400 border-white/5',
    marginRate: '純利益率 ほぼ0% (時給1,000円未満)',
    reality: 'クラウドワークスで1文字0.5円で記事を書き、UberEatsで配達する層。AIの進化によって真っ先に代替され、時間と健康をすり減らす。',
    actionAdvice: 'この階層で「努力」しても絶対に豊かにはなれない。今日この瞬間から仕組み作りにシフトせよ。',
  },
];

export const MoneyFlowPyramid: React.FC = () => {
  return (
    <section className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-white/[0.08] pb-3">
        <div>
          <div className="text-[10px] font-mono text-zinc-400 font-bold uppercase tracking-wider">
            CAPITAL ECOSYSTEM FOOD CHAIN
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-white mt-0.5">
            業界の食物連鎖：誰が誰から金を巻き上げているか（マネーフロー暴露ピラミッド）
          </h2>
        </div>
        <span className="text-xs text-zinc-500 font-mono">
          ※ 自分がどの階層にいるのかを直視せよ
        </span>
      </div>

      <div className="p-6 rounded-2xl bg-[#0F1117] border border-white/10 space-y-3">
        {PYRAMID_TIERS.map((tier, idx) => (
          <div
            key={idx}
            className={`p-4 rounded-xl border transition-all ${
              idx === 1
                ? 'bg-emerald-500/[0.06] border-emerald-500/40 shadow-md ring-1 ring-emerald-500/20'
                : 'bg-[#141620] border-white/5'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-2">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${tier.badgeColor}`}>
                  {tier.level}
                </span>
                <h3 className="font-bold text-sm sm:text-base text-white">
                  {tier.roleTitle}
                </h3>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-400">
                {tier.marginRate}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-xs">
              <div className="space-y-1">
                <span className="text-zinc-500 text-[10px] font-mono">【現実の生態系】:</span>
                <p className="text-zinc-300 leading-relaxed font-normal">{tier.reality}</p>
              </div>
              <div className="space-y-1">
                <span className="text-amber-400/90 text-[10px] font-mono font-bold">【戦略的行動指針】:</span>
                <p className="text-zinc-200 leading-relaxed font-normal">{tier.actionAdvice}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
