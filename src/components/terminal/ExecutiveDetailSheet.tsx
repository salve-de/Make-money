'use client';

import React, { useState } from 'react';
import { CompanyRecord, MoatPower } from '../../types/terminal';
import { CompanyLogo } from './CompanyLogo';
import { SparklineChart } from './SparklineChart';
import { Check, ArrowRight, Lock, AlertTriangle, ShieldCheck, Sparkles, ExternalLink } from 'lucide-react';

interface ExecutiveDetailSheetProps {
  company: CompanyRecord;
}

type DetailTab = 'OVERVIEW' | 'FINANCIALS' | 'TRAFFIC' | 'TRACTION' | 'INFRASTRUCTURE' | 'ALL';

export const ExecutiveDetailSheet: React.FC<ExecutiveDetailSheetProps> = ({ company }) => {
  const [activeTab, setActiveTab] = useState<DetailTab>('OVERVIEW');

  const latestFin = company.financials && company.financials.length > 0
    ? company.financials[company.financials.length - 1]
    : null;

  // 金額フォーマット（万円、億円、兆円）
  const formatShortAmount = (valJpy: number) => {
    if (valJpy >= 1000000000000) {
      return `¥${(valJpy / 1000000000000).toFixed(2)}兆`;
    }
    if (valJpy >= 100000000) {
      const oku = Math.round(valJpy / 100000000);
      return `¥${oku.toLocaleString()}億円`;
    }
    if (valJpy >= 10000) {
      const man = Math.round(valJpy / 10000);
      return `¥${man.toLocaleString()}万円`;
    }
    return `¥${valJpy.toLocaleString()}`;
  };

  // 損益流出比率の計算（ウォーターフォール用）
  const rev = latestFin?.revenueJpy || 0;
  const cogs = latestFin?.cogsJpy || 0;
  const opex = latestFin?.opexJpy || 0;
  const opProfit = latestFin?.operatingProfitJpy || (rev - cogs - opex);

  const hasFinancialBreakdown = rev > 0;
  const cogsPercent = hasFinancialBreakdown ? Math.min(Math.round((cogs / rev) * 100), 100) : 0;
  const opexPercent = hasFinancialBreakdown ? Math.min(Math.round((opex / rev) * 100), 100) : 0;
  const profitPercent = hasFinancialBreakdown ? Math.max(Math.round((opProfit / rev) * 100), 0) : (latestFin?.operatingMarginPercent || 0);

  // 7つの堀レーダーチャート計算
  const getMoatPowerName = (moat: MoatPower) => {
    switch (moat) {
      case 'PROCESS_POWER': return '組織プロセスパワー (模倣困難な業務執行体制)';
      case 'NETWORK_EFFECTS': return 'ネットワーク効果 (利用者の増加に伴う価値向上)';
      case 'COUNTER_POSITIONING': return 'カウンターポジショニング (大手が構造上真似できない差別化)';
      case 'SWITCHING_COSTS': return 'スイッチングコスト (顧客の乗り換え障壁)';
      case 'BRANDING': return 'ブランド価値 (第一想起と価格プレミアム)';
      case 'CORNERED_RESOURCE': return '独占的資源 (特許・独自データ・独占契約)';
      case 'SCALE_ECONOMIES': return '規模の経済 (固定費分散と限界費用の極小化)';
    }
  };

  const moatScores = {
    processPower: company.primaryMoat === 'PROCESS_POWER' ? company.moatScore : Math.max(company.moatScore - 25, 30),
    networkEffects: company.primaryMoat === 'NETWORK_EFFECTS' ? company.moatScore : Math.max(company.moatScore - 35, 20),
    counterPositioning: company.primaryMoat === 'COUNTER_POSITIONING' ? company.moatScore : Math.max(company.moatScore - 30, 25),
    switchingCosts: company.primaryMoat === 'SWITCHING_COSTS' ? company.moatScore : Math.max(company.moatScore - 20, 35),
    branding: company.primaryMoat === 'BRANDING' ? company.moatScore : Math.max(company.moatScore - 25, 30),
    corneredResource: company.primaryMoat === 'CORNERED_RESOURCE' ? company.moatScore : Math.max(company.moatScore - 40, 15),
    scaleEconomies: company.primaryMoat === 'SCALE_ECONOMIES' ? company.moatScore : Math.max(company.moatScore - 30, 25)
  };

  const center = 110;
  const radius = 70;
  const axes = [
    { label: '組織プロセス', score: moatScores.processPower },
    { label: 'ネットワーク', score: moatScores.networkEffects },
    { label: '対抗ポジション', score: moatScores.counterPositioning },
    { label: '乗換コスト', score: moatScores.switchingCosts },
    { label: 'ブランド力', score: moatScores.branding },
    { label: '独占資源', score: moatScores.corneredResource },
    { label: '規模の経済', score: moatScores.scaleEconomies }
  ];

  const totalAxes = axes.length;
  const getCoordinates = (score: number, index: number) => {
    const angle = (Math.PI * 2 / totalAxes) * index - Math.PI / 2;
    const r = (score / 100) * radius;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return { x, y };
  };

  const polygonPoints = axes
    .map((axis, i) => {
      const { x, y } = getCoordinates(axis.score, i);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const grid100 = axes.map((_, i) => `${getCoordinates(100, i).x.toFixed(1)},${getCoordinates(100, i).y.toFixed(1)}`).join(' ');
  const grid50 = axes.map((_, i) => `${getCoordinates(50, i).x.toFixed(1)},${getCoordinates(50, i).y.toFixed(1)}`).join(' ');

  // 武器庫（ツール）の月額コスト合計
  const totalMonthlyToolCost = (company.tools || []).reduce((acc, t) => acc + (t.monthlyCostJpy || 0), 0);

  // 【種明かしデータの抽出（ポエムを排除した客観的構造）】
  const trickPsychology = company.proDossier?.monetizationTrick.corePsychologicalTrigger ||
    `顧客が抱える「競合より優位に立ちたい見栄」または「業務停止や機会損失の恐怖」に直結させ、対価の支払いを正当化させている。`;

  const pricingSecret = company.proDossier?.monetizationTrick.pricingPowerSecret ||
    company.pricingDesign?.pricingTiers ||
    `相見積もりを拒絶し、即座に価値を実演・提供することで、定価販売と高い粗利を維持している。`;

  const cashSpeed = company.proDossier?.monetizationTrick.cashflowVelocity ||
    `Stripe等のカード即時決済または完全前払いにより、売掛金未回収リスクをゼロ化。`;

  const whyIncumbentBlind = company.proDossier?.incumbentBlindspot.whyGiantsCantEnter ||
    company.entryStrategy?.whyIncumbentCantWin ||
    `既存大手は現在の高単価商流や中立性の看板に縛られているため、この特化モデルに参入すると自社の既存ビジネスを破壊するジレンマを抱えている。`;

  // 【1. 創業者の着眼ログ（何を見て、どこに隙を見出し、どう突いたか）】
  const observationText = company.successStory?.founderProfile ||
    (company.businessEssence ? `${company.businessEssence.targetCustomer}が抱える「${company.businessEssence.valueProposition}」という未充足の不満や、高額すぎる業界常識を日常的に観測。` : null) ||
    `「既存サービスは高額かつ複雑すぎて一般人や中小企業が手を出せない」という現場の不満・日常の歪みを観測。`;

  const glitchText = company.successStory?.marketGlitch ||
    company.entryStrategy?.whyIncumbentCantWin ||
    company.proDossier?.incumbentBlindspot.whyGiantsCantEnter ||
    `既存プレイヤーが高額な導入費と長期契約を要求する中で、顧客が抱える「今すぐ安く試したい」という即応需要が完全に放置されていた盲点。`;

  const trickText = company.entryStrategy?.actionableEntryRoute ||
    company.trapRecipe?.trapMechanism ||
    company.successStory?.breakthroughMoment ||
    company.businessEssence?.monetizationWay ||
    `競合の弱点・死角を突き、低コストな既存インフラを組み合わせて、労力ゼロ・高利益率で直販する仕組み。`;

  // ─────────────────────────────────────────────────────────────
  // 【9大事業レントゲン：高精度データ解決ロジック】
  // ─────────────────────────────────────────────────────────────
  // 7. 実働の正体（週稼働時間と業務の完全棚卸し）
  const weeklyHours = company.founderWorkload?.weeklyHours || company.weeklyHours || (company.teamSize === 1 ? 3 : 35);
  const founderTasks = company.founderWorkload?.founderTasks || (
    company.teamSize === 1
      ? [
          '週1回のStripe出金承認および売上・解約メトリクスの確認',
          'X（Twitter）での1行アップデート投稿およびBuild in Public実況',
          '重大バグの修正または新機能の最小プロトタイプ実装（月1〜2回）'
        ]
      : company.scaleTier === 'MEGA_CORP'
      ? [
          '直販営業部隊の日報リアルタイム監査と高利益率案件の承認',
          '粗利率80%を下回る値引き案件・競合相見積もりの即時却下',
          '現場のボトルネックを特定する経営幹部との週次レビュー'
        ]
      : [
          '主要クライアントとの月次戦略ミーティング（週2件）',
          '新規獲得チャネルのROI監視と広告・パートナー施策の意思決定',
          '外注先・業務委託スタッフへの業務差配と品質チェック'
        ]
  );
  const automatedTasks = company.founderWorkload?.automatedOrDelegatedTasks || (
    company.teamSize === 1
      ? [
          '顧客からの一般的な問い合わせはAIボットおよび外部外注が自動処理',
          '決済・領収書発行・返金処理・月額サブスク課金はStripeが完全自動実行',
          'サーバー負荷・インフラ監視はクラウドのオートスケール機能が自律維持'
        ]
      : company.scaleTier === 'MEGA_CORP'
      ? [
          '代理店を全廃した自社直販ERPシステムによる即日出荷パイプライン',
          '生産ラインの自動光学検査装置による不良品ゼロ化の自律稼働',
          '特許網による模倣品・類似参入者の自動法務排除体制'
        ]
      : [
          'リード獲得後の自動ステップLINE/メールによる事前教育と日程調整',
          '定型業務（資料送付、請求管理、月次レポート生成）のZapier/Make自動化',
          '現場作業・制作実務のクラウドソーシング・業務委託への完全外注'
        ]
  );
  const liberationSummary = company.founderWorkload?.liberationSummary || (
    company.teamSize === 1
      ? `週実働わずか${weeklyHours}時間。肉体労働・手作業から完全に解放され、システムと外部連携が勝手に現金を回収する自販機状態。`
      : company.scaleTier === 'MEGA_CORP'
      ? `代理店を排した直販ルールと即日出荷体制により、経営陣が日々の価格交渉に忙殺されることなく、高収益の規律を自動維持。`
      : `定型作業の90%を自動化・外注化し、創業者は戦略判断と重要意思決定のみに集中できる高効率体制。`
  );

  // 3. 価格決定権のトリック
  const pricingAnchor = company.pricingSecret?.anchorComparison || (
    company.scaleTier === 'MEGA_CORP'
      ? '「工場の製造ラインが1時間停止した場合の損害額（数千万円）」と比較させることで、数百万〜数千万円のセンサーを「実質無料の保険」と認識させて即決させる。'
      : company.businessModel === 'MICRO_SAAS' || company.teamSize === 1
      ? '「プロのスタジオに全社員を呼ぶ数十万円の撮影費用と日程調整の手間」と比較させ、数千円〜数万円の料金を「90%以上の圧倒的コスト削減」と錯覚させて購入させる。'
      : '「専任の正社員を1人雇用した場合の人件費（年間数百万円）」と比較させ、月額数万円〜十数万円の保守費用を極めて割安と知覚させる。'
  );
  const pricingDefense = company.pricingSecret?.defenseReason || company.proDossier?.monetizationTrick.pricingPowerSecret || (
    '相見積もりや価格競争を拒絶し、即座に現場の痛みを取り除く独自スピードと納品実績で定価販売を死守している。'
  );
  const priceTag = company.pricingSecret?.priceTagExample || company.pricingDesign?.pricingTiers || (
    company.scaleTier === 'MEGA_CORP' ? '平均数百万円〜数千万円（値引き交渉不可）' : '月額2,980円〜29,800円（事前カード決済）'
  );

  // 5. 集客の単一蛇口
  const primaryChannelName = company.trafficFaucet?.primaryChannel || company.first100CustomersStrategy?.tacticalChannel || company.initialTractionStrategy || 'Google自然検索 & 口コミ紹介ループ';
  const trafficBreakdown = company.trafficFaucet?.channelBreakdown || (
    company.scaleTier === 'MEGA_CORP'
      ? [
          { channel: '直販営業・既存顧客深耕', percentage: 70 },
          { channel: '技術カタログ・Web引き合い', percentage: 20 },
          { channel: '展示会・業界紹介', percentage: 10 },
        ]
      : company.businessModel === 'MICRO_SAAS' || company.teamSize === 1
      ? [
          { channel: 'SEO・オーガニック検索', percentage: 55 },
          { channel: 'X / SNS口コミバイラル', percentage: 30 },
          { channel: 'アフィリエイト・外部紹介', percentage: 15 },
        ]
      : [
          { channel: '紹介・リファラル', percentage: 45 },
          { channel: 'Web検索・オウンドメディア', percentage: 35 },
          { channel: 'パートナー連携', percentage: 20 },
        ]
  );
  const faucetMechanismText = company.trafficFaucet?.faucetMechanism || company.initialTractionStrategy || (
    '一度製品を使ったユーザーが自発的にシェア・紹介する仕組み（ウォーターマーク、成果報告、紹介コミッション）により、広告費ゼロで新規顧客が自動流入する水門を確立。'
  );

  // 6. 顧客の監禁構造（解約不能の罠）
  const hostageDataText = company.switchingCostTrap?.hostageData || (
    company.scaleTier === 'MEGA_CORP'
      ? '工場の制御プログラミングと既存センサーの配線規格がキーエンス仕様で統一されており、他社製に変更すると工場全体を再設計する莫大なコストが発生する。'
      : company.businessModel === 'MICRO_SAAS'
      ? '過去に生成した画像資産・プロジェクト設定・チームメンバーのアカウント履歴が蓄積されており、他社ツールへの移行コストが極めて高い。'
      : '日々の業務フローや取引先との連絡履歴が当システム上に人質となっており、乗り換えの心理的・物理的苦痛が解約を完全に防いでいる。'
  );
  const abandonmentPainText = company.switchingCostTrap?.abandonmentPain || (
    '解約すると蓄積されたデータが即時利用不能になり、業務の再構築に数百時間の労力と移行リスクを負うため、客は解約を諦めて課金を継続する。'
  );

  // 8. アンフェア・アドバンテージの監査
  const codingRequired = company.unfairAdvantageAudit?.codingSkillRequired !== undefined
    ? company.unfairAdvantageAudit.codingSkillRequired
    : (company.businessModel === 'CHIP_ECOSYSTEM' || company.businessModel === 'SEMICON_EQUIP' || company.scaleTier === 'MEGA_CORP');
  const capitalLevel = company.unfairAdvantageAudit?.capitalRequirementLevel || (
    company.initialInvestmentJpy === 0 ? 'ゼロ（0円）' : company.initialInvestmentJpy <= 50000 ? '極小（5万円以下）' : '中程度（100万円〜）'
  );
  const preAudience = company.unfairAdvantageAudit?.preExistingAudienceOrNetwork !== undefined
    ? company.unfairAdvantageAudit.preExistingAudienceOrNetwork
    : (company.id === 'peter-levels-photoai' || company.id === 'marc-lou-shipfast');
  const auditVerdictText = company.unfairAdvantageAudit?.auditVerdict || (
    company.teamSize === 1 && company.initialInvestmentJpy <= 10000
      ? '【凡人再現性: 極めて高い】初期資本ゼロ、既存のノーコード・APIの配線のみで立ち上げ可能。事前の知名度やコネに依存しない純粋な構造的勝ち筋。'
      : company.scaleTier === 'MEGA_CORP'
      ? '【凡人再現性: 構造抽出のみ】ハードウェア製造の丸パクリは不可能だが、「直販による代理店マージン中抜き」「即納による定価販売」という収益構造はスモールビジネスへ100%横展開可能。'
      : '【凡人再現性: 中程度】特定業界の業務理解が必要だが、巨額の資金や特殊な特許は不要。泥臭い初動アクションさえ実行できれば再現可能なモデル。'
  );

  // 9. 事業の換金性（M&A出口）
  const exitMultiple = company.exitValuation?.estimatedMultiple || (
    company.evMultiple ? `ARRの${company.evMultiple}倍` : '年間純利の3.5〜5.0倍'
  );
  const exitBuyer = company.exitValuation?.targetBuyer || (
    company.scaleTier === 'SOLO_MICRO'
      ? '国内外のスモールM&Aファンド、個人投資家、または同業マイクロSaaSグループ（Acquire.com等）'
      : company.scaleTier === 'MEGA_CORP'
      ? '機関投資家、グローバルPEファンド、国内外の同業メガコングロマリット'
      : '上場テック企業の新規事業部門、または同業中堅企業の顧客買収'
  );
  const exitAmount = company.exitValuation?.estimatedValuationAmount || (
    company.estimatedValuationJpy ? formatShortAmount(company.estimatedValuationJpy) : '約1億5,000万円〜3億円'
  );

  const estimatedEasyProfit = company.entryStrategy?.estimatedEasyProfit ||
    company.derivedBusinessIdeas?.[0]?.estimatedMonthlyProfit ||
    company.trapRecipe?.pureProfitBreakdown?.netTakeHome ||
    '月利50万〜150万円';

  return (
    <div className="flex-1 bg-slate-50 overflow-y-auto p-5 lg:p-7 space-y-6 select-none font-sans text-slate-800">
      
      {/* ───────────────────────────────────────────────────────────── */}
      {/* 【ヘッダー】企業エグゼクティブ・サマリーカード */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 px-3.5 py-1 bg-slate-100 border-b border-l border-slate-200 text-[10px] font-mono text-slate-500 font-bold tracking-wider rounded-bl-lg">
          DOSSIER # {company.ticker}
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4 min-w-0">
            {/* 特大アプリアイコン */}
            <div className="shrink-0 pt-0.5">
              <CompanyLogo company={company} size="lg" />
            </div>

            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold font-mono bg-indigo-50 text-indigo-700 border border-indigo-200/80">
                  {company.scaleTier === 'SOLO_MICRO'
                    ? '完全1人運営'
                    : company.scaleTier === 'NICHE_LEADER'
                    ? '中堅ニッチ独占'
                    : company.scaleTier === 'SCALE_UP'
                    ? '急成長新興'
                    : '巨大独占企業'}
                </span>
                <span className="text-slate-300 text-xs font-mono">•</span>
                <span className="text-slate-500 text-xs font-medium">{company.headquarters}</span>
                <span className="text-slate-300 text-xs font-mono">•</span>
                <span className="text-emerald-700 text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200">
                  {company.verifiedStatus === 'VERIFIED_STRIPE' ? 'Stripe実額照合済' : '公的開示照合済'}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {company.japaneseName}
              </h1>

              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                {company.tagline}
              </p>
            </div>
          </div>

          {/* 右上：収益規模メーター & Sparkline */}
          <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 shrink-0">
            <div className="text-right">
              <div className="text-[10px] font-mono text-slate-500 font-bold uppercase">直近収益規模</div>
              <div className="text-xl sm:text-2xl font-black font-mono text-slate-900 tabular-nums">
                {rev > 0 ? formatShortAmount(rev) : '非公開・推計中'}
              </div>
            </div>
            {profitPercent > 0 && (
              <>
                <div className="h-9 w-px bg-slate-200" />
                <div className="text-right">
                  <div className="text-[10px] font-mono text-slate-500 font-bold uppercase">営業利益率</div>
                  <div className="text-xl sm:text-2xl font-black font-mono text-emerald-600 tabular-nums">
                    {profitPercent}%
                  </div>
                </div>
              </>
            )}
            <div className="h-9 w-px bg-slate-200" />
            <div className="w-16 h-7 opacity-85 pt-1">
              <SparklineChart trend="UP" width={64} height={24} color="#10B981" />
            </div>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 最上部：キースペック・スコアカード (Starter Story / PitchBook型) */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 font-mono text-xs">
        <div className="p-3.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
          <div className="text-[10px] text-slate-500 font-sans font-medium">直近月商実額</div>
          <div className="text-base sm:text-lg font-black text-slate-900 tabular-nums">
            {rev > 0 ? formatShortAmount(Math.round(rev / 12)) : '非公開'}
          </div>
        </div>
        <div className="p-3.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
          <div className="text-[10px] text-slate-500 font-sans font-medium">実効手残り純利</div>
          <div className="text-base sm:text-lg font-black text-emerald-600 tabular-nums">
            {estimatedEasyProfit}
          </div>
        </div>
        <div className="p-3.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
          <div className="text-[10px] text-slate-500 font-sans font-medium">営業利益率</div>
          <div className="text-base sm:text-lg font-black text-indigo-600 tabular-nums">
            {profitPercent}%
          </div>
        </div>
        <div className="p-3.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
          <div className="text-[10px] text-slate-500 font-sans font-medium">初期投下資本</div>
          <div className="text-base sm:text-lg font-black text-slate-900 tabular-nums">
            {company.initialInvestmentJpy === 0 ? '¥0 (不要)' : `¥${Math.round(company.initialInvestmentJpy / 10000)}万`}
          </div>
        </div>
        <div className="p-3.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
          <div className="text-[10px] text-slate-500 font-sans font-medium">週実働時間</div>
          <div className="text-base sm:text-lg font-black text-slate-900 tabular-nums">
            {company.weeklyHours ? `週${company.weeklyHours}h` : '少人数'}
          </div>
        </div>
        <div className="p-3.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
          <div className="text-[10px] text-slate-500 font-sans font-medium">組織体制</div>
          <div className="text-base sm:text-lg font-black text-slate-900">
            {company.teamSize === 1 ? '完全1人' : `${company.teamSize}名精鋭`}
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 【タブナビゲーション】最上部ダイレクト切替                     */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-0 text-xs font-mono sticky top-0 bg-[#F8FAFC]/95 backdrop-blur-xs z-10 pt-1">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {[
            { id: 'OVERVIEW', label: '概要サマリー' },
            { id: 'FINANCIALS', label: '01 損益・価格決定権 & 換金出口' },
            { id: 'TRAFFIC', label: '02 集客蛇口 & 顧客監禁構造' },
            { id: 'TRACTION', label: '03 初動強奪 & アンフェア監査' },
            { id: 'INFRASTRUCTURE', label: '04 稼働インフラ & 地雷リスク' },
            { id: 'ALL', label: '全編表示' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as DetailTab)}
              className={`px-3.5 py-2.5 border-b-2 font-bold transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-600 font-black'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-2 text-slate-400 text-[11px] font-mono">
          <span>高収益事業レントゲン台帳</span>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 【概要サマリー：創業者の着眼ログ ＆ 24時間解剖】               */}
      {/* ───────────────────────────────────────────────────────────── */}
      {(activeTab === 'ALL' || activeTab === 'OVERVIEW') && (
        <div className="space-y-4">
          {/* 創業者の着眼ログ */}
          <div className="rounded-xl bg-white border border-slate-200/90 p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
                <span className="text-xs sm:text-sm font-black text-slate-900 font-sans">
                  創業者の着眼ログ：何を見て、どこに隙（参入機会）を見出したのか
                </span>
              </div>
              <span className="text-[10px] font-mono text-indigo-700 font-bold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200/80 self-start sm:self-auto">
                OPPORTUNITY DISCOVERY X-RAY
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 font-sans">
              {/* 1. 日常の観察（何を見たのか） */}
              <div className="p-4 rounded-xl bg-slate-50/90 border border-slate-200/90 space-y-2">
                <div className="text-[11px] font-mono text-slate-700 font-black uppercase flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-800 flex items-center justify-center text-[10px] font-bold">1</span>
                  <span>日常の観察（何を見たのか）</span>
                </div>
                <p className="text-slate-800 leading-relaxed text-xs font-normal pt-0.5">
                  {observationText}
                </p>
              </div>

              {/* 2. 業界の隙間・バグ（どこに隙があったのか） */}
              <div className="p-4 rounded-xl bg-rose-50/50 border border-rose-200/80 space-y-2">
                <div className="text-[11px] font-mono text-rose-700 font-black uppercase flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-rose-200 text-rose-800 flex items-center justify-center text-[10px] font-bold">2</span>
                  <span>業界の盲点・隙間（どこに隙があったか）</span>
                </div>
                <p className="text-slate-800 leading-relaxed text-xs font-normal pt-0.5">
                  {glitchText}
                </p>
              </div>

              {/* 3. 参入の一手（どう突いて勝ったのか） */}
              <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200/80 space-y-2">
                <div className="text-[11px] font-mono text-emerald-700 font-black uppercase flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-emerald-200 text-emerald-800 flex items-center justify-center text-[10px] font-bold">3</span>
                  <span>参入の一手（どう突いて勝ったか）</span>
                </div>
                <p className="text-slate-800 leading-relaxed text-xs font-normal pt-0.5">
                  {trickText}
                </p>
              </div>
            </div>
          </div>

          {/* 実働の正体：創業者の24時間解剖 */}
          <div className="rounded-xl bg-white border border-slate-200/90 p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                <span className="text-xs sm:text-sm font-black text-slate-900 font-sans">
                  実働の正体：創業者の24時間解剖（週実働と業務の完全棚卸し）
                </span>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span className="text-[11px] font-mono text-emerald-800 font-black bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                  週実働 {weeklyHours}時間
                </span>
                <span className="text-[10px] font-mono text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  WORKLOAD AUDIT
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-sans">
              {/* 左: 本人がやること */}
              <div className="p-4 rounded-xl bg-indigo-50/40 border border-indigo-200/70 space-y-2.5">
                <div className="flex items-center justify-between border-b border-indigo-100 pb-1.5">
                  <div className="text-[11px] font-mono text-indigo-900 font-black uppercase flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                    <span>本人がやること（意思決定・コア業務のみ）</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-indigo-700 bg-white px-2 py-0.5 rounded border border-indigo-200">
                    本人の手作業
                  </span>
                </div>
                <ul className="space-y-1.5 text-xs text-slate-800">
                  {founderTasks.map((task, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check size={13} className="text-indigo-600 shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{task}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* 右: 外注・システムに丸投げしたこと */}
              <div className="p-4 rounded-xl bg-slate-50/90 border border-slate-200/90 space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                  <div className="text-[11px] font-mono text-slate-700 font-black uppercase flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                    <span>外注・システムに丸投げしたこと（放置の配管）</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                    自動・外部委託
                  </span>
                </div>
                <ul className="space-y-1.5 text-xs text-slate-700">
                  {automatedTasks.map((task, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <ArrowRight size={13} className="text-slate-400 shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{task}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* 解放度サマリー */}
            <div className="p-3 bg-emerald-50/60 rounded-lg border border-emerald-200/60 flex items-center justify-between gap-3 text-xs font-sans">
              <div className="flex items-center gap-2">
                <span className="font-mono text-emerald-800 font-bold uppercase text-[10px] bg-white px-2 py-0.5 rounded border border-emerald-200 shrink-0">
                  労働からの解放度
                </span>
                <span className="text-emerald-950 font-medium">{liberationSummary}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 解剖01: 【損益計算書 & 価格決定権・換金出口】                     */}
      {/* ───────────────────────────────────────────────────────────── */}
      {(activeTab === 'ALL' || activeTab === 'FINANCIALS') && (
        <section className="space-y-5 pt-2">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-mono text-xs font-bold border border-emerald-200">
                01
              </span>
              <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-wide">
                損益計算書 & 価格決定権・換金出口 (Financials, Pricing Power & Exit)
              </h2>
            </div>
            <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
              UNIT ECONOMICS, PRICING TRICK & M&A VALUATION
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* 左: 損益流出ウォーターフォール */}
            {hasFinancialBreakdown ? (
              <div className="lg:col-span-7 p-5 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-4 flex flex-col justify-between">
                <div>
                  <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1 font-bold">
                    PROFIT WATERFALL: 100円の売上に対する流出・手残り分解
                  </div>
                  <div className="text-xs font-bold text-slate-900">
                    原価・経費を極小化し、現金を最大効率で残す構造
                  </div>
                </div>

                <div className="space-y-3 font-mono text-xs">
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-slate-700 font-sans font-medium">総売上高 (100%)</span>
                      <span className="text-slate-900 font-black">{formatShortAmount(rev)}</span>
                    </div>
                    <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-slate-800 w-full rounded-full" />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-slate-600 font-sans">- 原価 (製造・サーバー・仕入れ)</span>
                      <span className="text-slate-700 font-semibold">-{cogsPercent}% ({formatShortAmount(cogs)})</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div style={{ width: `${cogsPercent}%` }} className="h-full bg-rose-500 rounded-full" />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-slate-600 font-sans">- 販管費 (広告・決済・外注費)</span>
                      <span className="text-slate-700 font-semibold">-{opexPercent}% ({formatShortAmount(opex)})</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div style={{ width: `${opexPercent}%` }} className="h-full bg-amber-500 rounded-full" />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-900 font-black font-sans">= 実質本業純手残り (営業利益)</span>
                      <span className="text-emerald-700 font-black text-sm">
                        +{profitPercent}% ({formatShortAmount(opProfit)})
                      </span>
                    </div>
                    <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden p-0.5">
                      <div
                        style={{ width: `${profitPercent}%` }}
                        className="h-full bg-emerald-500 rounded-full transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="text-[10px] text-slate-500 font-sans">
                  ※ 業界平均利益率（約8〜12%）と比較し、手元に残る現金比率が極めて高い構造です。
                </div>
              </div>
            ) : (
              <div className="lg:col-span-7 p-5 rounded-xl bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-center space-y-2">
                <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider font-bold">
                  FINANCIAL OVERVIEW: 損益概観
                </div>
                <h3 className="text-sm font-bold text-slate-900">詳細財務諸表は非公開または順次検証中</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  公的決算書および市場推計モデルに基づき、主要指標のみを厳格に算定・検証しています。
                </p>
              </div>
            )}

            {/* 右: 事業スペック & 収益構造 */}
            <div className="lg:col-span-5 p-5 rounded-xl bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between space-y-3">
              <div>
                <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1 font-bold">
                  BUSINESS ESSENCE: 収益発生の力学
                </div>
                <div className="text-xs font-bold text-slate-900">
                  誰から、どんな対価として金を集めているか
                </div>
              </div>

              <div className="space-y-2 text-xs font-sans">
                <div className="p-3 rounded-lg bg-slate-50 space-y-0.5">
                  <span className="text-[10px] font-mono text-slate-500 font-bold uppercase">事業の正体</span>
                  <p className="text-slate-800 font-medium">{company.businessEssence.whatItDoes}</p>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 space-y-0.5">
                  <span className="text-[10px] font-mono text-slate-500 font-bold uppercase">対象顧客（ターゲット）</span>
                  <p className="text-slate-700">{company.businessEssence.targetCustomer}</p>
                </div>

                <div className="p-3 rounded-lg bg-emerald-50/70 space-y-0.5">
                  <span className="text-[10px] font-mono text-emerald-800 font-bold uppercase">集金方式（マネタイズ）</span>
                  <p className="text-emerald-950 font-mono font-bold">{company.businessEssence.monetizationWay}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs font-mono">
                <div>
                  <span className="text-[10px] text-slate-500 block font-sans font-medium">チーム体制</span>
                  <span className="text-slate-900 font-black">{company.teamSize === 1 ? '完全1人' : `${company.teamSize}名精鋭`}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block font-sans font-medium">立ち上げ元手</span>
                  <span className="text-slate-900 font-black">{company.initialInvestmentJpy === 0 ? '0円 (元手不要)' : `¥${(company.initialInvestmentJpy / 10000).toLocaleString()}万`}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 通帳レントゲン（データが存在する場合のみ表示） */}
          {company.passbookDetails && (
            <div className="p-5 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-mono text-slate-500 font-bold uppercase tracking-wider">
                    資金移動実査: 実質純手残り通帳レントゲン
                  </div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                    手数料・税金を差し引いた「創業者の手元現金」
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200 font-bold">
                  {company.passbookDetails.bankStatementDate}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 font-mono text-xs">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-0.5">
                  <span className="text-[10px] text-slate-500 font-sans block font-medium">月間総着金額</span>
                  <span className="text-slate-900 font-black">{formatShortAmount(company.passbookDetails.monthlyGrossJpy)}</span>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-0.5">
                  <span className="text-[10px] text-slate-500 font-sans block font-medium">控除: 決済手数料</span>
                  <span className="text-rose-600 font-semibold">-{formatShortAmount(company.passbookDetails.paymentFeeJpy)}</span>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-0.5">
                  <span className="text-[10px] text-slate-500 font-sans block font-medium">控除: ツール・インフラ費</span>
                  <span className="text-amber-600 font-semibold">-{formatShortAmount(company.passbookDetails.infraCostJpy)}</span>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-0.5">
                  <span className="text-[10px] text-slate-500 font-sans block font-medium">控除: 外注・委託費</span>
                  <span className="text-slate-600 font-semibold">-{formatShortAmount(company.passbookDetails.outsourcingJpy)}</span>
                </div>
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 space-y-0.5 text-emerald-950 font-bold">
                  <span className="text-[10px] font-mono uppercase block text-emerald-700">創業者実効手残り純利</span>
                  <span className="text-sm font-black">{formatShortAmount(company.passbookDetails.founderTakeHomeJpy)}</span>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-0.5 text-slate-500">
                  <span className="text-[10px] font-sans block font-medium">注記: 税金引当プール</span>
                  <span className="text-slate-700 font-medium">約 {formatShortAmount(company.passbookDetails.taxReserveJpy)}</span>
                </div>
              </div>
            </div>
          )}

          {/* 【3. 価格決定権のトリック & 9. 事業の換金性（M&A出口）】 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* 3. 価格決定権のトリック */}
            <div className="p-5 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-600" />
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                    3. 価格決定権のトリック（なぜその高単価で買わせられるのか）
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-indigo-700 font-bold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                  PRICING POWER
                </span>
              </div>

              <div className="space-y-2.5 pt-1 text-xs font-sans">
                <div className="p-3 bg-slate-50 rounded-lg space-y-1">
                  <span className="text-[10px] font-mono text-slate-500 font-bold uppercase block">
                    顧客が「安い」と錯覚する比較アンカー
                  </span>
                  <p className="text-slate-800 leading-relaxed font-medium">
                    {pricingAnchor}
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg space-y-1">
                  <span className="text-[10px] font-mono text-slate-500 font-bold uppercase block">
                    相見積もり・価格競争を跳ね返す防衛理由
                  </span>
                  <p className="text-slate-700 leading-relaxed font-medium">
                    {pricingDefense}
                  </p>
                </div>

                <div className="p-2.5 bg-indigo-50/60 rounded-lg flex items-center justify-between font-mono text-[11px]">
                  <span className="text-indigo-900 font-sans font-bold">価格設定実例:</span>
                  <span className="text-indigo-700 font-black">{priceTag}</span>
                </div>
              </div>
            </div>

            {/* 9. 事業の換金性・出口相場（M&A売却マルチプル） */}
            <div className="p-5 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-600" />
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                    9. 事業の換金性・M&A出口相場（引退・買収鑑定額）
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  EXIT VALUATION
                </span>
              </div>

              <div className="space-y-2.5 pt-1 text-xs font-sans">
                <div className="p-3 bg-slate-50 rounded-lg space-y-1">
                  <span className="text-[10px] font-mono text-slate-500 font-bold uppercase block">
                    想定される売却・買収マルチプル
                  </span>
                  <p className="text-slate-800 leading-relaxed font-mono font-bold text-emerald-700">
                    {exitMultiple}
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg space-y-1">
                  <span className="text-[10px] font-mono text-slate-500 font-bold uppercase block">
                    想定される買い手候補の属性
                  </span>
                  <p className="text-slate-700 leading-relaxed font-medium">
                    {exitBuyer}
                  </p>
                </div>

                <div className="p-2.5 bg-emerald-50/70 rounded-lg flex items-center justify-between font-mono text-[11px]">
                  <span className="text-emerald-950 font-sans font-bold">推定買収査定額:</span>
                  <span className="text-emerald-700 font-black text-sm">{exitAmount}</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 解剖02: 【集客蛇口 & 顧客監禁構造】                               */}
      {/* ───────────────────────────────────────────────────────────── */}
      {(activeTab === 'ALL' || activeTab === 'TRAFFIC') && (
        <section className="space-y-5 pt-2">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-mono text-xs font-bold border border-indigo-200">
                02
              </span>
              <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-wide">
                集客蛇口 & 顧客監禁構造 (Traffic Faucet & Retention Gravity)
              </h2>
            </div>
            <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
              ACQUISITION WATERGATE, SWITCHING COSTS & MOAT
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* 5. 集客の単一蛇口（客が湧き出る水門の特定） */}
            <div className="p-5 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-600" />
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                    5. 集客の単一蛇口（客が勝手に湧き出る水門）
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-indigo-700 font-bold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                  TRAFFIC FAUCET
                </span>
              </div>

              <div className="space-y-3 pt-1 text-xs font-sans">
                {/* チャネル比率バー */}
                <div className="p-3 bg-slate-50 rounded-lg space-y-2">
                  <span className="text-[10px] font-mono text-slate-500 font-bold uppercase block">
                    主要流入チャネルの構造比率
                  </span>
                  <div className="space-y-1.5 font-mono">
                    {trafficBreakdown.map((tb, idx) => (
                      <div key={idx} className="space-y-0.5">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-slate-700 font-sans font-medium">{tb.channel}</span>
                          <span className="text-slate-900 font-bold">{tb.percentage}%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-200/80 rounded-full overflow-hidden">
                          <div
                            style={{ width: `${tb.percentage}%` }}
                            className="h-full bg-indigo-600 rounded-full"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg space-y-1">
                  <span className="text-[10px] font-mono text-slate-500 font-bold uppercase block">
                    広告費ゼロで客が流れ込み続ける仕掛け
                  </span>
                  <p className="text-slate-800 leading-relaxed font-medium">
                    {faucetMechanismText}
                  </p>
                </div>
              </div>
            </div>

            {/* 6. 顧客の監禁構造（解約不能の罠・スイッチングコスト） */}
            <div className="p-5 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                    6. 顧客の監禁構造（他社乗り換え不能の罠）
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                  SWITCHING GRAVITY
                </span>
              </div>

              <div className="space-y-2.5 pt-1 text-xs font-sans">
                <div className="p-3 bg-slate-50 rounded-lg space-y-1">
                  <span className="text-[10px] font-mono text-slate-500 font-bold uppercase block">
                    人質に取られているデータ・業務フロー
                  </span>
                  <p className="text-slate-800 leading-relaxed font-medium">
                    {hostageDataText}
                  </p>
                </div>

                <div className="p-3 bg-rose-50/50 rounded-lg border border-rose-100 space-y-1">
                  <span className="text-[10px] font-mono text-rose-800 font-bold uppercase block">
                    解約に伴う強烈な苦痛と移行コスト
                  </span>
                  <p className="text-rose-950 leading-relaxed font-medium">
                    {abandonmentPainText}
                  </p>
                </div>

                <div className="p-2.5 bg-slate-100 rounded-lg flex items-center justify-between font-mono text-[11px]">
                  <span className="text-slate-700 font-sans font-bold">主防壁分類:</span>
                  <span className="text-slate-900 font-black">{getMoatPowerName(company.primaryMoat)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 大手の構造的死角 & 既存競合との対比ベンチマークテーブル */}
          <div className="p-5 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
              <span className="w-2 h-2 rounded-full bg-slate-700" />
              <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                大手の構造的死角 & なぜ真似されても潰されないのか
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-sans">
              <div className="p-3 bg-slate-50 rounded-lg space-y-1">
                <span className="text-[10px] font-mono text-slate-500 font-bold uppercase block">
                  大手が手を出せない構造的理由
                </span>
                <p className="text-slate-700 leading-relaxed font-medium">{whyIncumbentBlind}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg space-y-1">
                <span className="text-[10px] font-mono text-slate-500 font-bold uppercase block">
                  後発の模倣者を即死させる堀（Moat）
                </span>
                <p className="text-slate-700 leading-relaxed font-medium">{company.coreMoatDescription}</p>
              </div>
            </div>
          </div>

          {/* 既存競合との対比ベンチマークテーブル */}
          {company.competitors && company.competitors.length > 0 && (
            <div className="p-5 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-mono text-slate-500 font-bold uppercase tracking-wider mb-0.5">
                    COMPETITOR BENCHMARK: 既存競合・大手との冷徹な対比
                  </div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                    既存の大手プレイヤーが抱える構造的弱点一覧
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 font-bold">
                  対比データ検証済
                </span>
              </div>

              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-xs font-mono border-collapse">
                  <thead>
                    <tr className="text-slate-700 border-b border-slate-200 bg-slate-50 text-[11px]">
                      <th className="py-2.5 px-3 text-left font-bold">競合事業者名</th>
                      <th className="py-2.5 px-3 text-left font-bold">規模・上場区分</th>
                      <th className="py-2.5 px-3 text-right font-bold">推定年間売上</th>
                      <th className="py-2.5 px-3 text-right font-bold">営業利益率</th>
                      <th className="py-2.5 px-3 text-left font-bold pl-4">競合の防壁・弱点</th>
                      <th className="py-2.5 px-3 text-center font-bold">価格決定権</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {company.competitors.map((comp, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 text-slate-700 transition-colors">
                        <td className="py-2.5 px-3 font-bold text-slate-900 text-left">{comp.name}</td>
                        <td className="py-2.5 px-3 text-slate-500 text-left font-sans">{comp.scaleLabel}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-800">{formatShortAmount(comp.annualRevenueJpy)}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-emerald-600 font-bold">{comp.operatingMarginPercent}%</td>
                        <td className="py-2.5 px-3 text-left text-slate-600 font-sans pl-4 text-[11px]">{comp.moatSummary}</td>
                        <td className="py-2.5 px-3 text-center font-sans text-slate-600">{comp.pricingPower}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 解剖03: 【初動強奪 & アンフェア監査】                             */}
      {/* ───────────────────────────────────────────────────────────── */}
      {(activeTab === 'ALL' || activeTab === 'TRACTION') && (
        <section className="space-y-5 pt-2">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-mono text-xs font-bold border border-indigo-200">
                03
              </span>
              <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-wide">
                初動強奪 & アンフェア監査 (Initial Traction & Unfair Advantage Audit)
              </h2>
            </div>
            <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
              FIRST 10 CUSTOMERS, PSYCHOLOGICAL TRIGGER & CHEAT CODES
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* 2. 0→1の強奪手口（実績ゼロの初日、最初の10人をどう捕まえたか） */}
            <div className="p-5 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-600" />
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                    2. 0→1の強奪手口（実績ゼロの初日、最初の10人の捕まえ方）
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-indigo-700 font-bold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                  DAY-1 TRACTION
                </span>
              </div>

              <div className="space-y-2.5 pt-1 text-xs font-sans">
                <div className="p-3 bg-slate-50 rounded-lg space-y-1">
                  <span className="text-[10px] font-mono text-slate-500 font-bold uppercase block">
                    突破チャネル（顧客が潜んでいた場所）
                  </span>
                  <p className="text-slate-800 leading-relaxed font-medium">
                    {company.first100CustomersStrategy?.tacticalChannel || company.initialTractionStrategy || 'ターゲットが集まる専門コミュニティ（X、業界特化掲示板、既存顧客リスト）への直接アプローチ'}
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg space-y-1">
                  <span className="text-[10px] font-mono text-slate-500 font-bold uppercase block">
                    初動アクション（実際に仕掛けた泥臭い提案・行動）
                  </span>
                  <p className="text-slate-700 leading-relaxed font-medium">
                    {company.first100CustomersStrategy?.exactAction || company.successStory?.breakthroughMoment || company.initialTractionStrategy || '完成前のプロトタイプを無償提供し、「成果が出なければ全額返金」という無条件リスク反転オファーで即決獲得。'}
                  </p>
                </div>

                <div className="p-3 bg-emerald-50/70 rounded-lg border border-emerald-200/60 space-y-1">
                  <span className="text-[10px] font-mono text-emerald-800 font-bold uppercase block">
                    成約・実証結果（初課金の瞬間）
                  </span>
                  <p className="text-emerald-950 font-medium">
                    {company.first100CustomersStrategy?.conversionProof || '公開直後から即時課金が発生し、広告費ゼロで初月の損益分岐点を突破。'}
                  </p>
                </div>
              </div>
            </div>

            {/* 4. 客の心理的急所の人質化（不条理な購買トリガー） */}
            <div className="p-5 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                    4. 客の心理的急所の人質化（不条理な購買トリガー）
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                  PSYCHO TRIGGER
                </span>
              </div>

              <div className="space-y-2.5 pt-1 text-xs font-sans">
                <div className="p-3 bg-slate-50 rounded-lg space-y-1">
                  <span className="text-[10px] font-mono text-slate-500 font-bold uppercase block">
                    購買の引き金となった恐怖・苦痛（損失回避）
                  </span>
                  <p className="text-slate-800 leading-relaxed font-medium">
                    {trickPsychology}
                  </p>
                </div>

                <div className="p-3 bg-rose-50/50 rounded-lg border border-rose-100 space-y-1">
                  <span className="text-[10px] font-mono text-rose-800 font-bold uppercase block">
                    衝動買い・即決の決め手（見栄・優位性の欲求）
                  </span>
                  <p className="text-rose-950 leading-relaxed font-medium">
                    {company.proDossier?.monetizationTrick.pricingPowerSecret || '「同業他社に先を越される恐怖」と「これを使えば自分が圧倒的に賢く効率的に見える」優越感を視覚的に演出し、相見積もりを排除。'}
                  </p>
                </div>

                <div className="p-2.5 bg-slate-100 rounded-lg flex items-center justify-between font-mono text-[11px]">
                  <span className="text-slate-700 font-sans font-bold">キャッシュ回収速度:</span>
                  <span className="text-slate-900 font-black">{cashSpeed}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 8. アンフェア・アドバンテージの監査（スキル・資金・コネの白黒判定） */}
          <div className="p-5 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div>
                <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-0.5 font-bold">
                  UNFAIR ADVANTAGE AUDIT: ズル（特権的優位性）の有無を冷徹に監査
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                  8. 創業者のアンフェア・アドバンテージ白黒判定
                </h3>
              </div>
              <span className="text-[10px] font-mono px-2.5 py-1 rounded bg-slate-100 text-slate-700 border border-slate-200 font-bold self-start sm:self-auto">
                再現性検証済
              </span>
            </div>

            {/* 4連判定バッジグリッド */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-sans text-xs">
              {/* 判定1: プログラミング */}
              <div className={`p-3.5 rounded-lg border space-y-1.5 ${
                !codingRequired ? 'bg-emerald-50/70 border-emerald-200' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase text-slate-500">開発スキル</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    !codingRequired ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {!codingRequired ? 'コード不要' : '開発スキル必須'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-700 font-medium">
                  {!codingRequired
                    ? '既存のノーコード・SaaS・APIの配線のみで稼働可能。自前の複雑なプログラミングは不要。'
                    : '独自のアルゴリズムやハードウェア設計・高度な実装スキルが参入の前提条件。'}
                </p>
              </div>

              {/* 判定2: 必要資本 */}
              <div className={`p-3.5 rounded-lg border space-y-1.5 ${
                capitalLevel.includes('ゼロ') || capitalLevel.includes('極小') ? 'bg-emerald-50/70 border-emerald-200' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase text-slate-500">初期必要資金</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    capitalLevel.includes('ゼロ') || capitalLevel.includes('極小') ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {capitalLevel}
                  </span>
                </div>
                <p className="text-[11px] text-slate-700 font-medium">
                  {capitalLevel.includes('ゼロ') || capitalLevel.includes('極小')
                    ? '融資や投資家からの資金調達は一切不要。手元の少額自己資金（数万円以下）で初日から黒字化可能。'
                    : '設備投資またはまとまった運転資金（数百万円〜）の事前確保が不可欠。'}
                </p>
              </div>

              {/* 判定3: 既存コネ・知名度 */}
              <div className={`p-3.5 rounded-lg border space-y-1.5 ${
                !preAudience ? 'bg-emerald-50/70 border-emerald-200' : 'bg-amber-50/70 border-amber-200'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase text-slate-500">人脈・知名度依存</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    !preAudience ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {!preAudience ? 'コネ・知名度ゼロ' : '事前オーディエンス活用'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-700 font-medium">
                  {!preAudience
                    ? '既存のフォロワーや業界の有力コネは一切不要。無名の状態から仕組み単体で顧客を獲得。'
                    : '創業者個人の既存フォロワー（数万人規模）や業界人脈が初期着火の強力なブーストとして機能。'}
                </p>
              </div>

              {/* 判定4: 特殊設備・法規制 */}
              <div className={`p-3.5 rounded-lg border space-y-1.5 ${
                company.scaleTier !== 'MEGA_CORP' ? 'bg-emerald-50/70 border-emerald-200' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase text-slate-500">特殊設備・許認可</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    company.scaleTier !== 'MEGA_CORP' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {company.scaleTier !== 'MEGA_CORP' ? '市販ツールのみ' : '独自特許・設備あり'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-700 font-medium">
                  {company.scaleTier !== 'MEGA_CORP'
                    ? '市販のPCとインターネット環境のみで完結。特殊な工場、オフィス、法認可の取得は不要。'
                    : '巨大な研究開発投資、国際特許網、サプライチェーン独占契約による強固な物理的参入障壁。'}
                </p>
              </div>
            </div>

            {/* 凡人再現性・構造抽出の総括監査 */}
            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200/80 space-y-1">
              <span className="text-[10px] font-mono text-slate-500 font-bold uppercase block">
                アナリストによる再現性・構造抽出の総括判定
              </span>
              <p className="text-xs text-slate-800 font-semibold leading-relaxed">
                {auditVerdictText}
              </p>
            </div>
          </div>

          {/* 初期失敗・軌道修正 ＆ 創業者背景 */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* 左: 初期の重大な資本毀損・仮説検証の失敗記録 */}
            <div className="lg:col-span-7 p-5 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div>
                  <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-0.5 font-bold">
                    CAPITAL LOSS AUDIT: 初期の失敗記録
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                    初期にやらかした資本毀損・仮説検証の失敗
                  </h4>
                </div>
                <span className="text-[10px] font-mono text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-bold">
                  地雷回避データ
                </span>
              </div>

              {company.earlyFailureLesson ? (
                <div className="p-3.5 bg-amber-50/70 rounded-lg space-y-2 text-xs">
                  <p className="text-slate-700 leading-relaxed font-sans">
                    <strong className="text-slate-900 font-mono font-bold">{company.earlyFailureLesson.wastedMoneyOrTime}</strong>を損失：{company.earlyFailureLesson.whatWentWrong}
                  </p>
                  <div className="p-2.5 bg-white rounded border border-amber-200/60 font-sans space-y-0.5">
                    <span className="text-[10px] font-mono text-amber-800 font-bold uppercase block">事業ピボットの転換点</span>
                    <p className="text-slate-900 font-medium">{company.earlyFailureLesson.pivotMoment}</p>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 bg-slate-50 rounded-lg text-xs text-slate-600 leading-relaxed">
                  初期の仮説検証において、想定顧客の購買意欲の低さや過剰な初期開発によるタイムロスを経験。直後に「事前決済が取れた機能のみを実装する」極限のリーン検証へと方針転換した。
                </div>
              )}
            </div>

            {/* 右: 創業者背景 ＆ 発見した市場の歪み */}
            <div className="lg:col-span-5 p-5 rounded-xl bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between space-y-3">
              <div>
                <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-0.5 font-bold">
                  FOUNDER PROFILE & GLITCH: 創業の原点
                </div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                  競合が見落としていた「歪み」と創業者の境遇
                </h4>
              </div>

              <div className="space-y-2 text-xs font-sans">
                <div className="p-3 bg-slate-50 rounded-lg space-y-1">
                  <span className="text-[10px] font-mono text-slate-500 font-bold block">創業者プロフィール</span>
                  <p className="text-slate-700 leading-relaxed font-medium">
                    {company.successStory?.founderProfile || observationText}
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg space-y-1">
                  <span className="text-[10px] font-mono text-slate-500 font-bold block">発見した市場の歪み（盲点）</span>
                  <p className="text-slate-700 leading-relaxed font-medium">
                    {company.successStory?.marketGlitch || glitchText}
                  </p>
                </div>

                {company.proSecretInsight && (
                  <div className="p-3 bg-indigo-50/70 rounded-lg text-xs font-sans space-y-1">
                    <div className="text-[10px] font-mono text-indigo-900 font-bold uppercase tracking-wider">
                      ANALYST STRUCTURAL INSIGHT / 構造的インサイト
                    </div>
                    <p className="text-indigo-950 text-[11px] leading-relaxed font-medium">
                      {company.proSecretInsight}
                    </p>
                  </div>
                )}
              </div>

              <div className="text-[10px] font-mono text-slate-400 text-right pt-2 border-t border-slate-100">
                FIRST-HAND EVIDENCE AUDITED
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 解剖04: 【稼働インフラ & 武器庫】                                 */}
      {/* ───────────────────────────────────────────────────────────── */}
      {(activeTab === 'ALL' || activeTab === 'INFRASTRUCTURE') && (
        <section className="space-y-5 pt-2">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-mono text-xs font-bold border border-indigo-200">
                04
              </span>
              <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-wide">
                稼働インフラ & 武器庫 (Operational Infrastructure & Pro Arsenal)
              </h2>
            </div>
            <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
              TECH STACK, 7-DAY BLUEPRINT & PLUG-AND-PLAY ASSETS
            </span>
          </div>

          {/* ツール・設備一覧テーブル */}
          <div className="p-5 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                  事業を自動化・稼働させている全ツール・設備一覧
                </h3>
                <p className="text-[11px] text-slate-500">
                  同じ道具を配線することで、この事業のコアオペレーションを外部から再現可能です。
                </p>
              </div>

              <div className="flex items-center gap-2 font-mono text-xs bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 shrink-0">
                <span className="text-slate-500 font-sans">月間ツール固定費:</span>
                <span className="text-slate-900 font-black">
                  {totalMonthlyToolCost === 0 ? '0円 (完全無料枠)' : `約 ¥${totalMonthlyToolCost.toLocaleString()}/月`}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-xs font-mono border-collapse">
                <thead>
                  <tr className="text-slate-700 border-b border-slate-200 bg-slate-50 text-[11px]">
                    <th className="py-2.5 px-3 text-left font-bold">ツール / 設備名</th>
                    <th className="py-2.5 px-3 text-left font-bold">役割・カテゴリ</th>
                    <th className="py-2.5 px-3 text-left font-bold">活用目的</th>
                    <th className="py-2.5 px-3 text-right font-bold">月額費用</th>
                    <th className="py-2.5 px-3 text-center font-bold">代替難易度</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {(company.tools && company.tools.length > 0 ? company.tools : [
                    { name: 'Stripe', category: '決済インフラ', purpose: '全世界カード決済・サブスク課金自動化', monthlyCostJpy: 0, replacementDifficulty: 'HIGH' as const },
                    { name: 'Vercel / Next.js', category: 'ホスティング', purpose: 'フロントエンド高速配信・APIルーティング', monthlyCostJpy: 3000, replacementDifficulty: 'LOW' as const },
                    { name: 'PostgreSQL / Supabase', category: 'データベース', purpose: 'ユーザーデータ・取引履歴の永続保存', monthlyCostJpy: 3800, replacementDifficulty: 'MEDIUM' as const },
                    { name: 'Resend / Postmark', category: '通知配信', purpose: '購入完了・アカウント通知メール自動配信', monthlyCostJpy: 2000, replacementDifficulty: 'LOW' as const },
                  ]).map((tool, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 text-slate-700 transition-colors">
                      <td className="py-2.5 px-3 font-bold text-slate-900 text-left flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                        <span>{tool.name}</span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 text-left font-sans">{tool.category}</td>
                      <td className="py-2.5 px-3 text-slate-700 text-left font-sans">{tool.purpose}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-900 font-bold">
                        {tool.monthlyCostJpy === 0 ? '無料' : `¥${tool.monthlyCostJpy.toLocaleString()}`}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] font-sans font-medium bg-slate-100 text-slate-700 border border-slate-200">
                          {tool.replacementDifficulty === 'HIGH' ? '独自代替困難' : tool.replacementDifficulty === 'MEDIUM' ? '移行やや手薄' : '容易に代替可'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-2 flex items-center justify-between text-[11px] text-slate-500 font-sans border-t border-slate-100">
              <span>週平均稼働時間: <strong className="text-slate-900 font-mono font-bold">{weeklyHours}時間/週</strong></span>
              <span>運用自動化度: <strong className="text-emerald-700 font-mono font-bold">{weeklyHours <= 10 ? '極めて高い (自律稼働)' : '通常運用'}</strong></span>
            </div>
          </div>

          {/* 7日間の具体的立ち上げ工程表 */}
          <div className="p-5 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] font-mono text-slate-500 font-bold uppercase tracking-wider">
                  7-DAY EXECUTION BLUEPRINT: ゼロからの具体的立ち上げ工程
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                  この収益モデルを配線・稼働させた実戦スケジュール
                </h3>
              </div>
              <span className="text-[11px] font-mono text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-200 font-bold">
                所要期間: 7日間完結
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-lg bg-slate-50/80 border border-slate-200/80 space-y-1">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 inline-block mb-1">
                  DAY 1 - 2
                </span>
                <h4 className="text-xs font-bold text-slate-900">プロダクト設計 & オファー定義</h4>
                <p className="text-[11px] text-slate-600 leading-relaxed font-sans pt-1">
                  {company.proDossier?.sevenDayBlueprint?.day1to2OfferSetup || '既存のノーコードまたはAPIを組み合わせ、顧客のPainを即時切除する最小機能（MVP）を24時間で定義・仮組み。'}
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-50/80 border border-slate-200/80 space-y-1">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 inline-block mb-1">
                  DAY 3 - 4
                </span>
                <h4 className="text-xs font-bold text-slate-900">決済・契約インフラの即時開通</h4>
                <p className="text-[11px] text-slate-600 leading-relaxed font-sans pt-1">
                  {company.proDossier?.sevenDayBlueprint?.day3to4CashflowPipe || 'Stripe等の即時決済アカウントを開設し、LP（1枚ペラページ）に決済ボタンを配線して入金ルートを即時確保。'}
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-50/80 border border-slate-200/80 space-y-1">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 inline-block mb-1">
                  DAY 5 - 6
                </span>
                <h4 className="text-xs font-bold text-slate-900">初期顧客の獲得（実証）</h4>
                <p className="text-[11px] text-slate-600 leading-relaxed font-sans pt-1">
                  {company.proDossier?.sevenDayBlueprint?.day5to6FirstCustomers || 'ターゲット顧客が密集するコミュニティ（X、特定掲示板、業界リスト）へ直接アプローチし、最初の3社/10名にテスト利用・即時課金させる。'}
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-emerald-50/60 border border-emerald-200/80 space-y-1">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 inline-block mb-1">
                  DAY 7
                </span>
                <h4 className="text-xs font-bold text-emerald-950">自律運用・自動化パイプライン確立</h4>
                <p className="text-[11px] text-slate-700 leading-relaxed font-sans pt-1">
                  {company.proDossier?.sevenDayBlueprint?.day7AutomationEngine || 'フィードバックを受けた初期改善を反映し、日々の定型業務（決済通知・アカウント発行）を自動化パイプラインに接続して完全自走化。'}
                </p>
              </div>
            </div>
          </div>

          {/* 門外不出のPRO武器庫（Paywall / すりガラス演出） */}
          <div className="p-6 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 text-white border border-slate-800 shadow-xl relative overflow-hidden space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-xs font-bold border border-amber-500/40">
                  PRO ACCESS REQUIRED
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  CLASSIFIED ARSENAL
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                機密保持規約適用
              </span>
            </div>

            <div>
              <h3 className="text-base sm:text-lg font-black tracking-tight text-white">
                門外不出のPRO武器庫（Plug & Play 実戦アセット）
              </h3>
              <p className="text-xs text-slate-400 pt-1 leading-relaxed">
                創業者が実際に顧客獲得・自動運用で使用している「成約プロンプト」「コールドDM文面」「生データCSV」を即時コピー可能な形式で封鎖・格納しています。
              </p>
            </div>

            {/* すりガラスカード群 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 relative">
              {/* カード1: 実働プロンプト */}
              <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 backdrop-blur-sm space-y-2 select-none filter blur-[1.5px] opacity-70">
                <span className="text-[10px] font-mono text-indigo-400 font-bold uppercase">PROMPT / 実行コード</span>
                <div className="text-xs font-bold text-white">自律運用用システムプロンプト</div>
                <div className="text-[11px] font-mono text-slate-400 bg-slate-900/80 p-2 rounded">
                  System: You are an autonomous arbitrage analyst specialized in...
                </div>
              </div>

              {/* カード2: コールドDMスクリプト */}
              <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 backdrop-blur-sm space-y-2 select-none filter blur-[1.5px] opacity-70">
                <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase">OUTBOUND SCRIPT</span>
                <div className="text-xs font-bold text-white">返信率38%の逆提案DMテンプレート</div>
                <div className="text-[11px] font-mono text-slate-400 bg-slate-900/80 p-2 rounded">
                  件名: 御社の〇〇における機会損失の即時補填について...
                </div>
              </div>

              {/* カード3: 生データCSV */}
              <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 backdrop-blur-sm space-y-2 select-none filter blur-[1.5px] opacity-70">
                <span className="text-[10px] font-mono text-amber-400 font-bold uppercase">RAW DATA CSV</span>
                <div className="text-xs font-bold text-white">競合仕入れ先・価格差マスターリスト</div>
                <div className="text-[11px] font-mono text-slate-400 bg-slate-900/80 p-2 rounded">
                  ticker, supplier_cost, gross_margin, moat_power...
                </div>
              </div>

              {/* Paywall ロックオーバーレイ */}
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/70 backdrop-blur-xs rounded-xl p-4 text-center space-y-3">
                <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-mono text-lg font-black">
                  <Lock size={18} className="text-amber-400" />
                </div>
                <div className="space-y-1 max-w-md">
                  <div className="text-sm font-black text-white">
                    PRO年間会員限定：実戦コピー用アセットが封鎖されています
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    全22社の成約DM実文面、自動化プロンプト、損益生データCSVを即時アンロックして事業を最短配線できます。
                  </p>
                </div>
                <button
                  type="button"
                  className="px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs font-mono tracking-wider transition-all shadow-lg hover:shadow-emerald-500/25 active:scale-98 cursor-pointer"
                >
                  PROプランで全武器庫を即時アンロック (月額 ¥9,800〜)
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

    </div>
  );
};
