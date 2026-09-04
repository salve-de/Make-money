'use client';

import React, { useState } from 'react';
import { CompanyRecord } from '../../../types/terminal';

interface OpportunitySimulatorProps {
  companies: CompanyRecord[];
  onSelectCompany: (id: string) => void;
  onNavigateToTerminal: () => void;
}

type CapitalLevel = 'ZERO' | 'LOW' | 'HIGH';
type TimeCommitment = 'WEEKEND' | 'NIGHTS' | 'FULL';
type StrengthType = 'AI_PC' | 'SALES' | 'FIELD';

interface RecommendationResult {
  modelName: string;
  badge: string;
  expectedMonthlyProfit: string;
  grossMargin: string;
  timeToFirstRevenue: string;
  rationale: string;
  firstStepAction: string;
  suggestedCompanyId: string;
}

export const OpportunitySimulator: React.FC<OpportunitySimulatorProps> = ({
  companies,
  onSelectCompany,
  onNavigateToTerminal,
}) => {
  const [capital, setCapital] = useState<CapitalLevel>('ZERO');
  const [time, setTime] = useState<TimeCommitment>('WEEKEND');
  const [strength, setStrength] = useState<StrengthType>('AI_PC');

  // 手札に基づく最適ビジネス逆引きロジック
  const getRecommendation = (): RecommendationResult => {
    if (capital === 'ZERO' && strength === 'AI_PC') {
      return {
        modelName: 'AIラッパー・デジタルプロダクト販売',
        badge: '勝率最優先 / 元手ゼロ',
        expectedMonthlyProfit: '30万〜150万円',
        grossMargin: '92%〜97%',
        timeToFirstRevenue: '7日〜14日',
        rationale: '在庫も仕入れも一切不要。既存のAI（OpenAI/Replicate）に1つの特化プロンプトやUIを被せ、GumroadやStripeで販売。初期投資0円で限界費用がゼロのため、赤字のリスクが物理的に存在しません。',
        firstStepAction: '売れているNotionテンプレやマイクロツールの「特定業界版」をCursorで週末に1本組む。',
        suggestedCompanyId: 'solo-easlo',
      };
    }

    if (capital === 'ZERO' && strength === 'SALES') {
      return {
        modelName: '地方中小企業向け 助成金・補助金AI申請代行',
        badge: '高単価成果報酬 / 元手ゼロ',
        expectedMonthlyProfit: '50万〜300万円',
        grossMargin: '95%',
        timeToFirstRevenue: '14日〜30日',
        rationale: '公的書類の作成をAIで半自動化し、商工会議所周辺の中小企業に「着手金0円・採択時のみ成功報酬30%」でテレアポ・DM。顧客側に金銭リスクがないため成約率が異常に高く、1案件で数十万〜数百万円が手元に残ります。',
        firstStepAction: '自社の地元の中小企業リストを30社抽出し、助成金診断シートを無料で送付する。',
        suggestedCompanyId: 'b2b-clay-outbound',
      };
    }

    if (capital === 'ZERO' && strength === 'FIELD') {
      return {
        modelName: '不用品回収・特殊清掃の現場マッチング（仲介DX）',
        badge: '即日現金化 / 元手ゼロ',
        expectedMonthlyProfit: '40万〜120万円',
        grossMargin: '50%〜60%',
        timeToFirstRevenue: '3日〜7日',
        rationale: '自分ではトラックも倉庫も持たず、チラシやジモティーで集客し、実際の作業は提携した地元の個人職人に70%で丸投げ。差額の30%を利ざやとして抜く無在庫仲介型。',
        firstStepAction: '近隣の個人トラック運送業者・便利屋に「案件を回すので提携しないか」と電話をかける。',
        suggestedCompanyId: 'local-clean-dx',
      };
    }

    if (capital === 'LOW' && strength === 'AI_PC') {
      return {
        modelName: 'TikTok Shop 手元実演アフィリエイト（顔出し不要）',
        badge: '爆発的バズ / 少額仕入れ',
        expectedMonthlyProfit: '80万〜250万円',
        grossMargin: '30%〜40%',
        timeToFirstRevenue: '10日〜20日',
        rationale: 'AmazonやAliExpressで月数万円分の便利ガジェットを仕入れ、スマホの手元だけで開封・実演する15秒動画を毎日3本投稿。動画がバズった瞬間に自動でアフィリエイト報酬が雪だるま式に積み上がります。',
        firstStepAction: 'TikTokで現在急上昇中の物販実演アカウントを3つ特定し、カット割り構成を完全コピーする。',
        suggestedCompanyId: 'solo-boilerplate',
      };
    }

    if (capital === 'LOW' && strength === 'SALES') {
      return {
        modelName: 'AIコールドメール・商談獲得代行（B2B成果報酬）',
        badge: '高LTV / B2B特化',
        expectedMonthlyProfit: '100万〜400万円',
        grossMargin: '85%',
        timeToFirstRevenue: '21日〜30日',
        rationale: 'ClayやInstantly等の営業自動化SaaS（月額3万円程度）を契約し、資金調達直後のスタートアップに対して「成果報酬でアポを供給する」契約を締結。1アポ3万〜5万円で月30アポ供給すれば月利100万円超。',
        firstStepAction: 'WantedlyやPR TIMESで最近資金調達した企業をリストアップし、営業責任者に直接LinkedInで連絡。',
        suggestedCompanyId: 'b2b-clay-outbound',
      };
    }

    if (capital === 'HIGH' || strength === 'FIELD') {
      return {
        modelName: '地方休眠不動産×スマートロック無人貸倉庫DX',
        badge: '不労ストック型 / 資産形成',
        expectedMonthlyProfit: '150万〜500万円',
        grossMargin: '60%〜75%',
        timeToFirstRevenue: '30日〜60日',
        rationale: '使われていない空き倉庫や古いガレージを格安で借り受け、スマートロックを設置して「24時間セルフ貸倉庫」に改装。LINE自動応答で無人集金し、月額5,000円〜2万円の家賃を毎月不労所得として回収。',
        firstStepAction: '地元の不動産業者を回り「車庫や物置として放置されている空き物件」のオーナー情報を聞き出す。',
        suggestedCompanyId: 'niche-bolt-storage',
      };
    }

    // デフォルト
    return {
      modelName: 'ニッチ特化型マイクロSaaS / 有料ランキングメディア',
      badge: '高利益率 / 不労所得',
      expectedMonthlyProfit: '50万〜200万円',
      grossMargin: '90%',
      timeToFirstRevenue: '14日〜30日',
      rationale: '特定の狭い業界に特化した有料ツールまたはランキング掲載サイトを構築し、掲載料や月額課金で集金。競合が少なく、参入障壁の高いニッチを狙うことで1人で長期の利益を確保します。',
      firstStepAction: '自分が詳しい業界で「毎月手作業で面倒なエクセル集計」をしている業務を1つ特定する。',
      suggestedCompanyId: 'outbid-lol',
    };
  };

  const rec = getRecommendation();
  const matchedCompany = companies.find((c) => c.id === rec.suggestedCompanyId) || companies[0];

  return (
    <section className="p-5 sm:p-6 rounded-lg bg-[#0E1015] border border-zinc-800/80 space-y-5">
      
      {/* 見出し */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-zinc-800 pb-3">
        <div>
          <div className="text-[10px] font-mono text-zinc-400 font-bold uppercase tracking-wider">
            OPPORTUNITY REVERSE FINDER
          </div>
          <h2 className="text-base sm:text-lg font-bold text-white mt-0.5">
            手札から逆引き：あなたの勝率最大化ビジネス診断シミュレーター
          </h2>
        </div>
        <span className="text-xs text-zinc-500 font-mono">
          ※ 資金・時間・得意武器を選択すると即座に最適解を算出
        </span>
      </div>

      {/* 選択コントローラー */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        
        {/* 1. 軍資金 */}
        <div className="space-y-1.5">
          <label className="text-xs font-mono text-zinc-400 font-medium flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full bg-zinc-400" />
            <span>1. 投入できる軍資金</span>
          </label>
          <div className="grid grid-cols-3 gap-1">
            {[
              { id: 'ZERO', label: '0円 (元手ゼロ)' },
              { id: 'LOW', label: '10万円以下' },
              { id: 'HIGH', label: '100万円以上' },
            ].map((btn) => (
              <button
                key={btn.id}
                onClick={() => setCapital(btn.id as CapitalLevel)}
                className={`py-2 px-1 text-center rounded text-xs font-mono transition-all border ${
                  capital === btn.id
                    ? 'bg-zinc-800 border-zinc-600 text-white font-bold shadow-xs'
                    : 'bg-zinc-900/80 border-zinc-800/80 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        {/* 2. 稼働時間 */}
        <div className="space-y-1.5">
          <label className="text-xs font-mono text-zinc-400 font-medium flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full bg-zinc-400" />
            <span>2. 投下できる時間</span>
          </label>
          <div className="grid grid-cols-3 gap-1">
            {[
              { id: 'WEEKEND', label: '週末5時間' },
              { id: 'NIGHTS', label: '平日夜20時間' },
              { id: 'FULL', label: 'フルコミット' },
            ].map((btn) => (
              <button
                key={btn.id}
                onClick={() => setTime(btn.id as TimeCommitment)}
                className={`py-2 px-1 text-center rounded text-xs font-mono transition-all border ${
                  time === btn.id
                    ? 'bg-zinc-800 border-zinc-600 text-white font-bold shadow-xs'
                    : 'bg-zinc-900/80 border-zinc-800/80 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        {/* 3. 得意武器 */}
        <div className="space-y-1.5">
          <label className="text-xs font-mono text-zinc-400 font-medium flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full bg-zinc-400" />
            <span>3. 頼りにする手札武器</span>
          </label>
          <div className="grid grid-cols-3 gap-1">
            {[
              { id: 'AI_PC', label: 'AI・PC作業' },
              { id: 'SALES', label: '営業・対人' },
              { id: 'FIELD', label: '現場・泥臭い実業' },
            ].map((btn) => (
              <button
                key={btn.id}
                onClick={() => setStrength(btn.id as StrengthType)}
                className={`py-2 px-1 text-center rounded text-xs font-mono transition-all border ${
                  strength === btn.id
                    ? 'bg-zinc-800 border-zinc-600 text-white font-bold shadow-xs'
                    : 'bg-zinc-900/80 border-zinc-800/80 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* 診断結果表示カード */}
      <div className="p-4 sm:p-5 rounded-md bg-zinc-900/60 border border-zinc-800/80 space-y-3.5">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/80 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-zinc-800 text-zinc-300 border border-zinc-700">
              {rec.badge}
            </span>
            <h3 className="text-sm sm:text-base font-bold text-white">
              推奨モデル: {rec.modelName}
            </h3>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="text-zinc-400">期待月利: <strong className="text-white text-sm font-mono tabular-nums">{rec.expectedMonthlyProfit}</strong></span>
            <span className="text-zinc-400">粗利率: <strong className="text-white text-sm font-mono tabular-nums">{rec.grossMargin}</strong></span>
          </div>
        </div>

        <p className="text-xs text-zinc-400 leading-relaxed font-normal">
          {rec.rationale}
        </p>

        {/* アクションガイドと参考企業 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          
          <div className="p-3.5 rounded bg-[#0E1015] border border-zinc-800/60 space-y-1">
            <div className="text-[10px] font-mono text-zinc-400 font-bold uppercase">
              明日取るべき最初のアクション（DAY 1）:
            </div>
            <p className="text-xs text-zinc-200 leading-relaxed font-medium">
              {rec.firstStepAction}
            </p>
            <div className="text-[10px] font-mono text-zinc-500 pt-1">
              初収益化までの目安期間: {rec.timeToFirstRevenue}
            </div>
          </div>

          <div
            onClick={() => onSelectCompany(matchedCompany.id)}
            className="p-3.5 rounded bg-[#0E1015] hover:bg-zinc-800/50 border border-zinc-800/60 hover:border-zinc-700 cursor-pointer transition-all flex items-center justify-between group"
          >
            <div className="space-y-1 min-w-0 pr-3">
              <div className="text-[10px] font-mono text-zinc-400 font-bold uppercase">
                参考にするべき実在ビジネス台帳:
              </div>
              <div className="text-xs font-bold text-white group-hover:text-zinc-200 transition-colors truncate">
                {matchedCompany.japaneseName}
              </div>
              <div className="text-[11px] text-zinc-400 line-clamp-1 font-normal">
                {matchedCompany.tagline}
              </div>
            </div>
            <span className="px-2.5 py-1 rounded bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs font-medium font-mono shrink-0 group-hover:text-white transition-colors">
              台帳を見る →
            </span>
          </div>

        </div>

      </div>

    </section>
  );
};
