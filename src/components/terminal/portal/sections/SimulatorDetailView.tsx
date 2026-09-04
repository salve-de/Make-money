'use client';

import React, { useState } from 'react';
import { CompanyRecord } from '@/types/terminal';

interface SimulatorDetailViewProps {
  companies: CompanyRecord[];
  onSelectCompany: (id: string) => void;
  onNavigateToTerminal: () => void;
  onBackToPortal: () => void;
}

type CapitalLevel = 'ZERO' | 'LOW' | 'HIGH';
type TimeCommitment = 'WEEKEND' | 'NIGHTS' | 'FULL';
type StrengthType = 'AI_PC' | 'SALES' | 'FIELD';

export const SimulatorDetailView: React.FC<SimulatorDetailViewProps> = ({
  companies,
  onSelectCompany,
  onNavigateToTerminal,
  onBackToPortal,
}) => {
  const [capital, setCapital] = useState<CapitalLevel>('ZERO');
  const [time, setTime] = useState<TimeCommitment>('WEEKEND');
  const [strength, setStrength] = useState<StrengthType>('AI_PC');

  const getRecommendation = () => {
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
        modelName: '空き家・空きガレージの転貸無人ストレージ',
        badge: '地方特化 / 実業レバレッジ',
        expectedMonthlyProfit: '30万〜100万円',
        grossMargin: '70%〜80%',
        timeToFirstRevenue: '30日〜45日',
        rationale: '使われていない親族や知人の空き倉庫・車庫を「固定資産税分（月1万〜2万）」で借り、スマート南京錠を付けて月額5,000円で近隣住民へ貸し出す。初期費用ほぼゼロで毎月家賃が自動入金。',
        firstStepAction: '実家の近所や知人で空いているガレージや物置がないか声をかける。',
        suggestedCompanyId: 'niche-bolt-storage',
      };
    }
    if (capital === 'LOW' && strength === 'AI_PC') {
      return {
        modelName: '海外バズ動画の日本ローカライズ・特化メディア',
        badge: '低元手×高収益',
        expectedMonthlyProfit: '100万〜400万円',
        grossMargin: '85%〜90%',
        timeToFirstRevenue: '14日〜21日',
        rationale: '海外の最新AIツールやガジェット情報を日本語で短尺動画・ニュースレター化。無料サンプルを獲得しながらTikTok Shopやアフィリエイト、純広告で収益化。',
        firstStepAction: 'Beehiivでニュースレターを開設し、海外の急上昇ツールまとめを週2回配信する。',
        suggestedCompanyId: 'solo-boilerplate',
      };
    }
    if (strength === 'FIELD') {
      return {
        modelName: '地方特化 外壁高圧洗浄・不用品回収のWeb集客DX',
        badge: '高単価・低競合',
        expectedMonthlyProfit: '100万〜500万円',
        grossMargin: '55%〜65%',
        timeToFirstRevenue: '14日〜30日',
        rationale: 'ペラサイトとGoogleマップMEOで地域1位を獲り、実際の作業は地元の暇な職人に外注。自分は電話・LINE見積もりだけで中抜き利益を毎月手堅く回収。',
        firstStepAction: '「市町村名 + 外壁洗浄」のLPをペライチやSTUDIOで1日で作成する。',
        suggestedCompanyId: 'local-clean-dx',
      };
    }
    return {
      modelName: 'ニッチB2B特化 マイクロSaaS・有料ディレクトリ',
      badge: '高LTV・継続課金',
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
            <span className="text-zinc-300 font-medium">勝率最大化ビジネス診断シミュレーター</span>
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-zinc-800 text-zinc-300 border border-zinc-700">
              OPPORTUNITY REVERSE FINDER
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              手札から逆引き：あなたの勝率最大化ビジネス診断シミュレーター
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-3xl leading-relaxed font-normal">
              「何をやるべきか」ではなく「自分の手札（資金・時間・得意領域）で何が最も勝てるか」から逆算。
              条件を切り替えることで、最も負けにくく初期キャッシュを最大化できる最適ビジネスモデルをリアルタイム算出。
            </p>
          </div>
        </div>
      </div>

      {/* メインコントローラーと結果 */}
      <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">
        {/* 選択コントローラー */}
        <div className="p-6 rounded-lg bg-[#0E1015] border border-zinc-800 space-y-4">
          <h2 className="text-sm font-bold text-white font-mono uppercase">
            手札パラメーター設定
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. 軍資金 */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-zinc-400 font-medium">1. 投入できる軍資金</label>
              <div className="grid grid-cols-3 gap-1">
                {[
                  { id: 'ZERO', label: '0円 (元手ゼロ)' },
                  { id: 'LOW', label: '10万円以下' },
                  { id: 'HIGH', label: '100万円以上' },
                ].map((btn) => (
                  <button
                    key={btn.id}
                    onClick={() => setCapital(btn.id as CapitalLevel)}
                    className={`h-8 px-2 rounded text-[11px] font-mono transition-colors ${
                      capital === btn.id
                        ? 'bg-zinc-200 text-zinc-950 font-bold'
                        : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                    }`}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. 投下時間 */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-zinc-400 font-medium">2. 投下できる時間</label>
              <div className="grid grid-cols-3 gap-1">
                {[
                  { id: 'WEEKEND', label: '週末5時間' },
                  { id: 'NIGHTS', label: '平日夜20時間' },
                  { id: 'FULL', label: 'フルコミット' },
                ].map((btn) => (
                  <button
                    key={btn.id}
                    onClick={() => setTime(btn.id as TimeCommitment)}
                    className={`h-8 px-2 rounded text-[11px] font-mono transition-colors ${
                      time === btn.id
                        ? 'bg-zinc-200 text-zinc-950 font-bold'
                        : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                    }`}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. 頼りにする手札武器 */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-zinc-400 font-medium">3. 頼りにする手札武器</label>
              <div className="grid grid-cols-3 gap-1">
                {[
                  { id: 'AI_PC', label: 'AI・PC作業' },
                  { id: 'SALES', label: '営業・対人' },
                  { id: 'FIELD', label: '現場・泥臭い実業' },
                ].map((btn) => (
                  <button
                    key={btn.id}
                    onClick={() => setStrength(btn.id as StrengthType)}
                    className={`h-8 px-2 rounded text-[11px] font-mono transition-colors ${
                      strength === btn.id
                        ? 'bg-zinc-200 text-zinc-950 font-bold'
                        : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                    }`}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 診断結果カード */}
        <div className="p-6 sm:p-7 rounded-lg bg-[#0E1015] border border-zinc-800 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-zinc-800/80 pb-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-zinc-800 text-zinc-300 border border-zinc-700">
                  {rec.badge}
                </span>
                <span className="text-xs font-mono text-zinc-400">
                  初収益化目安: {rec.timeToFirstRevenue}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white leading-tight">
                推奨モデル: {rec.modelName}
              </h2>
            </div>

            <div className="text-left sm:text-right font-mono shrink-0">
              <div className="text-[10px] text-zinc-500">期待月利規模</div>
              <div className="text-base font-bold text-emerald-400">{rec.expectedMonthlyProfit}</div>
              <div className="text-[10px] text-zinc-500">粗利率: {rec.grossMargin}</div>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-md bg-zinc-900/60 border border-zinc-800/60 space-y-1.5">
              <span className="text-[10px] font-mono text-zinc-400 font-bold block">
                【なぜこの手札でこのモデルが最強なのか（勝率最大化の理由）】
              </span>
              <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-normal">
                {rec.rationale}
              </p>
            </div>

            <div className="p-4 rounded-md bg-zinc-900/90 border border-zinc-800/80 space-y-1.5">
              <span className="text-[10px] font-mono text-emerald-400 font-bold block">
                【明日取るべき最初のアクション (DAY 1)】
              </span>
              <p className="text-xs sm:text-sm text-zinc-100 font-medium leading-relaxed">
                {rec.firstStepAction}
              </p>
            </div>
          </div>

          {/* 参考にすべき実在ビジネス台帳 */}
          {matchedCompany && (
            <div className="pt-3 border-t border-zinc-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-0.5 min-w-0">
                <span className="text-[10px] font-mono text-zinc-400 block">
                  参考にすべき実在ビジネス台帳:
                </span>
                <div className="text-xs font-bold text-white truncate">
                  {matchedCompany.japaneseName}
                </div>
                <div className="text-[11px] text-zinc-400 truncate">
                  {matchedCompany.tagline}
                </div>
              </div>

              <button
                onClick={() => onSelectCompany(matchedCompany.id)}
                className="h-9 px-4 rounded-md bg-zinc-100 hover:bg-white text-zinc-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shrink-0 shadow-sm"
              >
                <span>台帳レントゲンを見る</span>
                <span>→</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
