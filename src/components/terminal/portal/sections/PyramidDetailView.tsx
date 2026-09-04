'use client';

import React from 'react';

interface PyramidDetailViewProps {
  onBackToPortal: () => void;
  onNavigateToTerminal: () => void;
}

export const PyramidDetailView: React.FC<PyramidDetailViewProps> = ({
  onBackToPortal,
  onNavigateToTerminal,
}) => {
  const tiers = [
    {
      level: 'TIER 01 / 最上層',
      roleTitle: 'ルールメイカー・決済基盤の元締め (Apple, Google, Stripe)',
      badge: '絶対的支配者',
      marginRate: '手数料 3%〜30% 自動徴収',
      whoPays: '世界中のすべてのアプリ開発者、EC事業者、消費者',
      reality: '世界中のトランザクションから一切の汗を流さずに課金。規約1つで他社のビジネスを一瞬で消滅させる特権階級。',
      howToSurvive: '個人がここを目指すのは不可能。このインフラを「最も安く使い倒す側」に回るのが唯一の正解。',
    },
    {
      level: 'TIER 02 / 上層 ★推奨領域',
      roleTitle: '仕組みの所有者・一人オーナー (マイクロSaaS, 無人倉庫, 独自メディア)',
      badge: '狙うべき金塊',
      marginRate: '純利益率 80%〜95%',
      isRecommended: true,
      whoPays: '業務効率化や売上増を求める企業・個人',
      reality: '他人のプラットフォーム（Stripe、Vercel等）の上で、自前の顧客リストと決済導線を構築。労働をAIとツールに代替させ、寝ていても口座に着金。',
      howToSurvive: '当台帳に収録されている勝ち組の9割がここに位置する。プログラミング不要の特化ツールや、地方の無人化実業など、今すぐここにポジションを取れ。',
    },
    {
      level: 'TIER 03 / 中層',
      roleTitle: '紹介者・アフィリエイター・代理店 (インフルエンサー, レビュー発信者)',
      badge: '中抜きプレイヤー',
      marginRate: '紹介報酬 20%〜40%',
      whoPays: '顧客獲得を急ぎたいTIER 01/02の事業者',
      reality: '自分でプロダクトを持たず、他人の商品を拡散して利ざやを抜く。トラフィックさえあれば元手ゼロで稼げるが、紹介元に首根っこを掴まれており規約変更で即死するリスクあり。',
      howToSurvive: '初心者の初動キャッシュ獲得（軍資金作り）としては最適だが、そこで得たフォロワーやリストを元手に、早急にTIER 02（自社プロダクト所有）へ移行すべし。',
    },
    {
      level: 'TIER 04 / 最下層 ⚠️脱出必須',
      roleTitle: '使い捨て作業員・時間切り売り労働者 (格安受託, 単純データ入力, ギグワーカー)',
      badge: '搾取される側',
      marginRate: '純利益率 ほぼ0% (時給1,000円未満)',
      whoPays: '人件費を削りたいTIER 02/03の事業者',
      reality: 'クラウドワークスで1文字0.5円で記事を書き、UberEatsで配達する層。AIの進化によって真っ先に代替され、時間と健康をすり減らすだけの消耗戦。',
      howToSurvive: 'この階層でどれだけ「真面目に努力」しても絶対に豊かにはなれない。今日この瞬間から「時間売り」を捨て、「仕組み作り」にシフトせよ。',
    },
  ];

  return (
    <div className="flex-1 bg-[#090A0D] overflow-y-auto font-sans text-zinc-100">
      {/* ヘッダー */}
      <div className="border-b border-zinc-800/80 bg-[#0D0E12] px-6 py-8">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
            <button
              onClick={onBackToPortal}
              className="hover:text-white transition-colors flex items-center gap-1"
            >
              <span>←</span>
              <span>ポータル・トップに戻る</span>
            </button>
            <span className="text-zinc-600">/</span>
            <span className="text-zinc-300 font-medium">業界の食物連鎖ピラミッド</span>
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-zinc-800 text-zinc-300 border border-zinc-700">
              CAPITAL ECOSYSTEM ANATOMY
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              業界の食物連鎖：誰が誰から金を巻き上げているか（マネーフロー暴露ピラミッド）
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-3xl leading-relaxed font-normal">
              資本主義のマネーフローを4階層に完全分解。
              自分が今どの階層にいて、誰に富を吸い取られているか、そしてどの階層にポジションを取るべきかの冷徹な力学。
            </p>
          </div>
        </div>
      </div>

      {/* ピラミッド詳細リスト */}
      <div className="max-w-4xl mx-auto px-6 py-10 space-y-6">
        {tiers.map((t, idx) => (
          <div
            key={idx}
            className={`p-6 sm:p-7 rounded-lg border transition-all space-y-5 ${
              t.isRecommended
                ? 'bg-[#10131B] border-zinc-700 shadow-lg ring-1 ring-white/10'
                : 'bg-[#0E1015] border-zinc-800'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-zinc-800/80 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-zinc-800 text-zinc-300 border border-zinc-700">
                    {t.level}
                  </span>
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                    t.isRecommended ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800' : 'bg-zinc-800 text-zinc-400'
                  }`}>
                    {t.badge}
                  </span>
                </div>
                <h2 className="text-base sm:text-lg font-bold text-white leading-snug">
                  {t.roleTitle}
                </h2>
              </div>
              <span className="text-xs font-mono font-bold text-zinc-200 shrink-0">
                {t.marginRate}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-md bg-zinc-900/60 border border-zinc-800/60 space-y-1">
                <span className="text-[10px] font-mono text-zinc-500 block">搾取・集金の対象（誰の財布か）:</span>
                <p className="text-zinc-300 font-normal">{t.whoPays}</p>
              </div>

              <div className="p-3.5 rounded-md bg-zinc-900/60 border border-zinc-800/60 space-y-1">
                <span className="text-[10px] font-mono text-zinc-500 block">階層の冷酷な現実:</span>
                <p className="text-zinc-300 font-normal">{t.reality}</p>
              </div>
            </div>

            <div className="pt-3 border-t border-zinc-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-0.5">
                <span className="text-[10px] font-mono text-zinc-400 font-bold block">
                  【この階層での立ち回り・戦略指針】
                </span>
                <p className="text-zinc-200 font-normal">
                  {t.howToSurvive}
                </p>
              </div>

              {t.isRecommended && (
                <button
                  onClick={onNavigateToTerminal}
                  className="px-4 py-2 rounded-md bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-bold font-mono shrink-0 transition-colors shadow-sm"
                >
                  TIER 02の実在企業台帳を見る →
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
