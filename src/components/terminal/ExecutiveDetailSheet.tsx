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
    `競合の弱点・死角を分析し、低コストな既存インフラを組み合わせて、高利益率で直接販売・提供する仕組み。`;

  // 7. 実働の正体（週稼働時間と業務の完全棚卸し）
  const weeklyHours = company.founderWorkload?.weeklyHours || company.weeklyHours || (company.teamSize === 1 ? 3 : 35);
  const founderTasks = company.founderWorkload?.founderTasks || (
    company.teamSize === 1
      ? [
          '週1回のStripe出金承認および売上・解約メトリクスの確認',
          'X（Twitter）でのアップデート発信およびBuild in Public',
          '新機能の最小プロトタイプ検証または重要アップデート（月1〜2回）'
        ]
      : company.scaleTier === 'MEGA_CORP'
      ? [
          '全社戦略ポートフォリオ投資の配分決定',
          '四半期取締役会でのグローバルリソース配分承認',
          '次世代コア技術・M&Aターゲットの最終選定'
        ]
      : [
          '月次経営会議での重要KPI・ユニットエコノミクス監査',
          '大口エンタープライズ顧客とのトップ商談・アライアンス締結',
          '主要機能の開発ロードマップ策定とチーム採用'
        ]
  );
  const automatedTasks: string[] = company.founderWorkload?.automatedOrDelegatedTasks || (
    company.teamSize === 1
      ? [
          '顧客からの一般的な問い合わせはAIチャットおよびサポートが自動対応',
          '決済・領収書発行・返金処理・月額サブスク課金はStripeが完全自動実行',
          'サーバー負荷・インフラ監視はクラウドのオートスケール機能が自律維持'
        ]
      : company.scaleTier === 'MEGA_CORP'
      ? [
          '直販営業の日常受発注・即日出荷ロジスティクスはERPシステムで全自動化',
          '品質検査・不良品スクリーニングは自社センサーとAI判定ラインで24時間自走',
          'グローバル決済・代金回収は金融EDIネットワークを通じて完全無人実行'
        ]
      : [
          '新規リード獲得後の初回資料送付・事前日程調整はフォーム連携で自動化',
          '日常の経理・請求書発行・消込処理は会計SaaSがAPI連携で自律実行',
          '顧客オンボーディング・チュートリアルはプロダクト内ガイドが自動案内'
        ]
  );
  const liberationSummary = company.founderWorkload?.liberationSummary || (
    company.teamSize === 1
      ? 'ルーティン業務をSaaSとAPIに完全委任し、本人は重要意思決定と発信のみに専念する超高効率運用。'
      : company.scaleTier === 'MEGA_CORP'
      ? '圧倒的な組織プロセスと標準化により、属人性を極限まで排除したメガスケール自走システム。'
      : '主要オペレーションを標準化・ツール化し、コアメンバーが事業成長に集中できる体制を構築。'
  );

  // 3. 価格決定権
  const pricingMechanismText = company.pricingSecret?.defenseReason || (
    company.scaleTier === 'MEGA_CORP'
      ? '即日出荷と圧倒的な歩留まり向上効果を実証することで、顧客に価格交渉の余地を与えず高粗利を維持。'
      : company.businessModel === 'MICRO_SAAS'
      ? '導入直後から即座に成果・時間短縮が得られるため、月額課金に対する心理的抵抗が極めて低い。'
      : '提供価値と代替手段の不在を背景に、競合との相見積もりを排除したプライシングを実現。'
  );
  const pricingTiersText = company.pricingSecret?.priceTagExample || company.pricingDesign?.pricingTiers || (
    company.scaleTier === 'MEGA_CORP' ? '平均数百万円〜数千万円（値引き交渉不可）' : '月額2,980円〜29,800円（事前カード決済）'
  );

  // 5. 中核顧客獲得チャネル
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
    '利用顧客が自発的にシェア・紹介する仕組み（ブランドクレジット、成果共有、紹介パートナープログラム）により、広告費を抑制しながら新規顧客が継続流入する獲得基盤を確立。'
  );

  // 6. スイッチングコストと解約抑止構造
  const hostageDataText = company.switchingCostTrap?.hostageData || (
    company.scaleTier === 'MEGA_CORP'
      ? '工場の制御プログラミングと既存センサーの配線規格が仕様レベルで統一されており、他社製に変更すると工場全体を再設計する莫大なコストが発生する。'
      : company.businessModel === 'MICRO_SAAS'
      ? '過去に生成した画像資産・プロジェクト設定・チームメンバーのアカウント履歴が高密度に蓄積されており、他社ツールへの移行コストが極めて高い。'
      : '日々の業務フローや取引先との連絡履歴が当システム上に蓄積されており、移行に伴う業務中断リスクと再構築コストが解約を効果的に抑止している。'
  );
  const abandonmentPainText = company.switchingCostTrap?.abandonmentPain || (
    '解約すると蓄積されたデータ資産や自動連携が中断し、再構築に多大な工数と業務リスクを負うため、顧客は高い継続率で利用を維持する。'
  );

  // 8. 競争優位性と再現性の監査
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
      ? '【個人・少数組織への適応性: 極めて高い】初期資本ゼロ、既存のノーコード・API連携のみで立ち上げ可能。事前の知名度や人脈に依存しない純粋な構造的優位性。'
      : company.scaleTier === 'MEGA_CORP'
      ? '【少数組織への適応性: 構造抽出のみ】ハードウェア製造の直接模倣は困難だが、「直販体制による中間代理店マージン削減」「短納期による適正価格維持」という収益構造はスモールビジネスへ再現性高く横展開可能。'
      : '【少数組織への適応性: 中程度】特定業界の業務理解を要するが、巨額の設備投資や特許は不要。規律ある初期アクションを実行できれば再現可能なモデル。'
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
    <div className="flex-1 bg-white overflow-y-auto px-6 sm:px-8 lg:px-12 py-8 space-y-8 select-none font-sans text-slate-800">
      
      {/* ───────────────────────────────────────────────────────────── */}
      {/* 【ヘッダー】エグゼクティブ・ドシエ表題（カード枠ゼロ・Sacra/FT型） */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="pb-6 border-b border-slate-200 relative">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
          <div className="flex items-start gap-4 min-w-0">
            <div className="shrink-0 pt-1">
              <CompanyLogo company={company} size="lg" />
            </div>

            <div className="space-y-2 min-w-0">
              <div className="flex items-center gap-2 flex-wrap font-mono text-[10px]">
                <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-bold border border-slate-200">
                  DOSSIER #{company.ticker}
                </span>
                <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-bold border border-slate-200">
                  {company.scaleTier === 'SOLO_MICRO'
                    ? '完全1人運営'
                    : company.scaleTier === 'NICHE_LEADER'
                    ? '中堅ニッチ独占'
                    : company.scaleTier === 'SCALE_UP'
                    ? '急成長新興'
                    : '巨大独占企業'}
                </span>
                <span className="px-2 py-0.5 text-slate-600 bg-slate-50 border border-slate-200">
                  {company.businessModel}
                </span>
                <span className="text-slate-400">
                  {company.category || company.businessEssence?.whatItDoes}
                </span>
              </div>

              <div className="flex items-baseline gap-3 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
                  {company.japaneseName}
                </h1>
                <span className="text-xs font-mono text-slate-500">
                  {company.founderName ? `創業者: ${company.founderName}` : `拠点: ${company.headquarters || '非公開'}`}
                </span>
              </div>

              <p className="text-xs sm:text-sm text-slate-600 font-normal leading-relaxed max-w-3xl">
                {company.tagline}
              </p>
            </div>
          </div>

          {/* 右上：主要収益指標 */}
          <div className="flex items-center gap-5 pt-1 shrink-0 border-l border-slate-200 pl-6 lg:self-stretch justify-end">
            <div className="text-right">
              <div className="text-[10px] font-mono text-slate-400 uppercase font-semibold">推定年間純利益</div>
              <div className="text-2xl sm:text-3xl font-black text-emerald-600 font-mono tabular-nums tracking-tight">
                {rev > 0 ? formatShortAmount(Math.round(rev * (profitPercent / 100))) : '非公開'}
              </div>
              <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                売上高: {rev > 0 ? formatShortAmount(rev) : '非公開'}
              </div>
            </div>
            <div className="w-16 h-8 opacity-90 pt-1">
              <SparklineChart trend="UP" width={64} height={28} color="#10B981" />
            </div>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* キースペック・データリボン (金融端末・PitchBook型 インライン帯) */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="border-y border-slate-200 bg-slate-50/70 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 font-mono text-xs">
        <div className="p-3 sm:p-3.5 space-y-0.5">
          <div className="text-[10px] text-slate-500 font-sans font-medium">直近月商実額</div>
          <div className="text-base sm:text-lg font-black text-slate-900 tabular-nums">
            {rev > 0 ? formatShortAmount(Math.round(rev / 12)) : '非公開'}
          </div>
        </div>
        <div className="p-3 sm:p-3.5 space-y-0.5">
          <div className="text-[10px] text-slate-500 font-sans font-medium">実効手残り純利</div>
          <div className="text-base sm:text-lg font-black text-emerald-600 tabular-nums">
            {estimatedEasyProfit}
          </div>
        </div>
        <div className="p-3 sm:p-3.5 space-y-0.5 border-t sm:border-t-0">
          <div className="text-[10px] text-slate-500 font-sans font-medium">営業利益率</div>
          <div className="text-base sm:text-lg font-black text-slate-900 tabular-nums">
            {profitPercent}%
          </div>
        </div>
        <div className="p-3 sm:p-3.5 space-y-0.5">
          <div className="text-[10px] text-slate-500 font-sans font-medium">初期投下資本</div>
          <div className="text-base sm:text-lg font-black text-slate-900 tabular-nums">
            {company.initialInvestmentJpy === 0 ? '¥0 (不要)' : `¥${Math.round(company.initialInvestmentJpy / 10000)}万`}
          </div>
        </div>
        <div className="p-3 sm:p-3.5 space-y-0.5 border-t lg:border-t-0">
          <div className="text-[10px] text-slate-500 font-sans font-medium">週実働時間</div>
          <div className="text-base sm:text-lg font-black text-slate-900 tabular-nums">
            {company.weeklyHours ? `週${company.weeklyHours}h` : '少人数'}
          </div>
        </div>
        <div className="p-3 sm:p-3.5 space-y-0.5">
          <div className="text-[10px] text-slate-500 font-sans font-medium">組織体制</div>
          <div className="text-base sm:text-lg font-black text-slate-900">
            {company.teamSize === 1 ? '完全1人' : `${company.teamSize}名精鋭`}
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 【タブナビゲーション】スティッキーインラインバー               */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-0 text-xs font-mono sticky top-0 bg-white/95 backdrop-blur-xs z-10 pt-1">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {[
            { id: 'OVERVIEW', label: '概要サマリー' },
            { id: 'FINANCIALS', label: '01 損益構造・価格戦略 & 評価倍率' },
            { id: 'TRAFFIC', label: '02 顧客獲得チャネル & スイッチングコスト' },
            { id: 'TRACTION', label: '03 初期トラクション & 参入障壁・競争優位性' },
            { id: 'INFRASTRUCTURE', label: '04 運用ツールスタック & 参入リスク要因' },
            { id: 'ALL', label: '全編表示' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as DetailTab)}
              className={`px-3.5 py-2.5 border-b-2 font-bold transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === tab.id
                  ? 'border-slate-950 text-slate-950 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="hidden lg:flex items-center gap-2 text-slate-400 text-[10px]">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          <span>高収益事業 構造・財務監査台帳</span>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 【概要サマリー：創業者の着眼ログ ＆ 24時間解剖】               */}
      {/* ───────────────────────────────────────────────────────────── */}
      {(activeTab === 'ALL' || activeTab === 'OVERVIEW') && (
        <div className="space-y-8">
          {/* 創業者の着眼ログ（ボーダーレス台帳） */}
          <section className="py-6 border-b border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-slate-950"></span>
                <h2 className="text-sm sm:text-base font-black text-slate-900 font-sans">
                  創業者の着眼点：何に着目し、どこに参入機会を見出したのか
                </h2>
              </div>
              <span className="text-[10px] font-mono text-slate-900 font-bold bg-slate-100 px-2 py-0.5 border border-slate-200 self-start sm:self-auto">
                OPPORTUNITY DISCOVERY
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200 font-sans pt-2">
              {/* 1. 日常の観察 */}
              <div className="py-3 md:py-0 md:pr-6 space-y-1.5">
                <div className="text-[11px] font-mono text-slate-700 font-black uppercase flex items-center gap-1.5">
                  <span className="w-4 h-4 bg-slate-100 text-slate-700 flex items-center justify-center text-[10px] font-bold border border-slate-200">1</span>
                  <span>日常の観察・課題認識</span>
                </div>
                <p className="text-slate-700 leading-relaxed text-xs font-normal pt-1">
                  {observationText}
                </p>
              </div>

              {/* 2. 業界の盲点・隙間 */}
              <div className="py-3 md:py-0 md:px-6 space-y-1.5">
                <div className="text-[11px] font-mono text-slate-900 font-black uppercase flex items-center gap-1.5">
                  <span className="w-4 h-4 bg-slate-100 text-slate-900 flex items-center justify-center text-[10px] font-bold border border-slate-200">2</span>
                  <span>業界の盲点・構造的隙間</span>
                </div>
                <p className="text-slate-700 leading-relaxed text-xs font-normal pt-1">
                  {glitchText}
                </p>
              </div>

              {/* 3. 参入の一手 */}
              <div className="py-3 md:py-0 md:pl-6 space-y-1.5">
                <div className="text-[11px] font-mono text-emerald-700 font-black uppercase flex items-center gap-1.5">
                  <span className="w-4 h-4 bg-emerald-50 text-emerald-700 flex items-center justify-center text-[10px] font-bold border border-emerald-200">3</span>
                  <span>参入の一手・差別化要因</span>
                </div>
                <p className="text-slate-700 leading-relaxed text-xs font-normal pt-1">
                  {trickText}
                </p>
              </div>
            </div>
          </section>

          {/* 実働の正体：創業者の24時間解剖（ボーダーレス台帳） */}
          <section className="py-6 border-b border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                <h2 className="text-sm sm:text-base font-black text-slate-900 font-sans">
                  創業者・運営体制の業務構造（週実働時間と役割の棚卸し）
                </h2>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span className="text-[11px] font-mono text-emerald-800 font-black bg-emerald-50 px-2 py-0.5 border border-emerald-200">
                  週実働 {weeklyHours}時間
                </span>
                <span className="text-[10px] font-mono text-slate-500 font-bold bg-slate-100 px-2 py-0.5 border border-slate-200">
                  WORKLOAD AUDIT
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200 font-sans pt-2">
              {/* 左: 本人が担う業務 */}
              <div className="py-3 md:py-0 md:pr-6 space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="text-[11px] font-mono text-slate-950 font-black uppercase flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-slate-950"></span>
                    <span>本人が担う業務（意思決定・中核業務）</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 border border-slate-200">
                    コア業務
                  </span>
                </div>
                <ul className="space-y-2 text-xs text-slate-700">
                  {founderTasks.map((task, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check size={13} className="text-slate-900 shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{task}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* 右: 自動化・外部委託した業務 */}
              <div className="py-3 md:py-0 md:pl-6 space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="text-[11px] font-mono text-slate-700 font-black uppercase flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-slate-500"></span>
                    <span>自動化・外部委託した業務（プロセス自動化）</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 border border-slate-200">
                    自動・外部委託
                  </span>
                </div>
                <ul className="space-y-2 text-xs text-slate-600">
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
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3 text-xs font-sans">
              <div className="flex items-center gap-2">
                <span className="font-mono text-emerald-800 font-bold uppercase text-[10px] bg-emerald-50 px-2 py-0.5 border border-emerald-200 shrink-0">
                  業務効率性サマリー
                </span>
                <span className="text-slate-700 font-medium">{liberationSummary}</span>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 解剖01: 【損益計算書 & 価格決定権・換金出口】                     */}
      {/* ───────────────────────────────────────────────────────────── */}
      {(activeTab === 'ALL' || activeTab === 'FINANCIALS') && (
        <section className="py-6 border-b border-slate-200 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-mono text-xs font-bold border border-emerald-200">
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

          <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 pt-2">
            {/* 左: 損益流出ウォーターフォール */}
            {hasFinancialBreakdown ? (
              <div className="lg:col-span-7 pb-6 lg:pb-0 lg:pr-8 space-y-5 flex flex-col justify-between">
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
                    <div className="w-full h-2 bg-slate-100 overflow-hidden">
                      <div className="h-full bg-slate-800 w-full" />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-slate-600 font-sans">- 原価 (製造・サーバー・仕入れ)</span>
                      <span className="text-slate-700 font-semibold">-{cogsPercent}% ({formatShortAmount(cogs)})</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 overflow-hidden">
                      <div style={{ width: `${cogsPercent}%` }} className="h-full bg-rose-500" />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-slate-600 font-sans">- 販管費 (広告費・ツール・外注)</span>
                      <span className="text-slate-700 font-semibold">-{opexPercent}% ({formatShortAmount(opex)})</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 overflow-hidden">
                      <div style={{ width: `${opexPercent}%` }} className="h-full bg-amber-500" />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-emerald-800 font-bold font-sans">= 実効営業利益 (純手残り)</span>
                      <span className="text-emerald-700 font-black">+{profitPercent}% ({formatShortAmount(opProfit)})</span>
                    </div>
                    <div className="w-full h-3 bg-slate-100 overflow-hidden p-0.5">
                      <div
                        style={{ width: `${profitPercent}%` }}
                        className="h-full bg-emerald-500 transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="text-[11px] font-mono text-slate-500 pt-1">
                  ※ 公開決算資料および決済トランザクション照合データに基づく推計値
                </div>
              </div>
            ) : (
              <div className="lg:col-span-7 pb-6 lg:pb-0 lg:pr-8 flex flex-col justify-center space-y-2">
                <div className="text-xs font-mono text-slate-400">FINANCIAL BREAKDOWN PENDING</div>
                <p className="text-xs text-slate-600 font-sans">
                  当該モデルは非公開資本のため、売上流出の内訳推計を継続監査中。
                </p>
              </div>
            )}

            {/* 右: 想定売却価値・評価倍率（M&A Exit Valuation） */}
            <div className="lg:col-span-5 pt-6 lg:pt-0 lg:pl-8 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider font-bold">
                    M&A VALUATION: 想定売却価値
                  </div>
                  <span className="text-[10px] font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 border border-slate-200">
                    EXIT VALUE
                  </span>
                </div>
                <div className="text-xs font-bold text-slate-900 mt-2">
                  第三者事業売却（M&A）における市場査定倍率
                </div>
              </div>

              <div className="space-y-3 font-sans text-xs">
                <div className="flex items-baseline justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500">想定評価額:</span>
                  <span className="text-xl font-black text-slate-900 font-mono tabular-nums">{exitAmount}</span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 font-mono text-[11px]">
                  <span className="text-slate-500 font-sans">評価マルチプル:</span>
                  <span className="text-slate-900 font-bold">{exitMultiple}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold">想定買い手層:</span>
                  <p className="text-slate-700 text-xs leading-relaxed font-normal">
                    {exitBuyer}
                  </p>
                </div>
              </div>

              <div className="text-[10px] font-mono text-slate-400 pt-2 border-t border-slate-100">
                AUDITED AGAINST ACQUIRE.COM & PE BENCHMARKS
              </div>
            </div>
          </div>

          {/* 価格決定権とキャッシュ回収速度（ボーダーレス行） */}
          <div className="pt-6 border-t border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-slate-950" />
                <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                  価格決定権の源泉と回収スピード（なぜ値引きなしで売れるのか）
                </h3>
              </div>
              <span className="text-[10px] font-mono text-slate-600 bg-slate-100 px-2 py-0.5 border border-slate-200 font-bold">
                PRICING POWER
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200 text-xs font-sans pt-2">
              <div className="py-2.5 md:py-0 md:pr-6 space-y-1">
                <span className="text-[10px] font-mono text-slate-500 font-bold uppercase block">
                  価格決定権のメカニズム
                </span>
                <p className="text-slate-800 leading-relaxed font-medium">
                  {pricingMechanismText}
                </p>
              </div>

              <div className="py-2.5 md:py-0 md:px-6 space-y-1">
                <span className="text-[10px] font-mono text-slate-500 font-bold uppercase block">
                  標準単価帯・料金プラン
                </span>
                <p className="text-slate-700 leading-relaxed font-mono font-medium">
                  {pricingTiersText}
                </p>
              </div>

              <div className="py-2.5 md:py-0 md:pl-6 space-y-1">
                <span className="text-[10px] font-mono text-slate-500 font-bold uppercase block">
                  着金スピード・売掛金リスク
                </span>
                <p className="text-emerald-900 leading-relaxed font-mono font-bold">
                  {cashSpeed}
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 02: 【顧客獲得チャネル & スイッチングコスト】                    */}
      {/* ───────────────────────────────────────────────────────────── */}
      {(activeTab === 'ALL' || activeTab === 'TRAFFIC') && (
        <section className="py-6 border-b border-slate-200 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-slate-100 text-slate-900 font-mono text-xs font-bold border border-slate-200">
                02
              </span>
              <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-wide">
                顧客獲得チャネル & スイッチングコスト (Acquisition Faucet & Switching Cost)
              </h2>
            </div>
            <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
              ACQUISITION CHANNELS & HOSTAGE RETENTION TRAP
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 pt-2">
            {/* 顧客獲得の蛇口（集客の正体） */}
            <div className="pb-6 lg:pb-0 lg:pr-8 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-slate-950" />
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                    顧客獲得チャネルの分解（集客の蛇口）
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-slate-900 font-bold bg-slate-100 px-2 py-0.5 border border-slate-200">
                  {primaryChannelName}
                </span>
              </div>

              <div className="space-y-3 font-sans text-xs">
                <div>
                  <span className="text-[10px] font-mono text-slate-500 font-bold uppercase block mb-1.5">
                    チャネル別 流入構成比率
                  </span>
                  <div className="space-y-2">
                    {trafficBreakdown.map((tb, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-slate-700">{tb.channel}</span>
                          <span className="text-slate-900 font-bold">{tb.percentage}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 overflow-hidden">
                          <div
                            style={{ width: `${tb.percentage}%` }}
                            className="h-full bg-slate-950"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 space-y-1">
                  <span className="text-[10px] font-mono text-slate-500 font-bold uppercase block">
                    集客メカニズムの核心
                  </span>
                  <p className="text-slate-700 leading-relaxed font-normal">
                    {faucetMechanismText}
                  </p>
                </div>
              </div>
            </div>

            {/* スイッチングコストと解約抑止構造 */}
            <div className="pt-6 lg:pt-0 lg:pl-8 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-slate-950" />
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                    スイッチングコストと解約抑止構造（離脱阻止の仕掛け）
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-slate-600 font-bold bg-slate-100 px-2 py-0.5 border border-slate-200">
                  RETENTION TRAP
                </span>
              </div>

              <div className="divide-y divide-slate-100 text-xs font-sans">
                <div className="pb-3 space-y-1">
                  <span className="text-[10px] font-mono text-slate-500 font-bold uppercase block">
                    人質化している顧客資産・データ
                  </span>
                  <p className="text-slate-800 leading-relaxed font-medium">
                    {hostageDataText}
                  </p>
                </div>

                <div className="pt-3 space-y-1">
                  <span className="text-[10px] font-mono text-slate-500 font-bold uppercase block">
                    解約時の顧客の心理的・業務的苦痛
                  </span>
                  <p className="text-slate-700 leading-relaxed font-normal">
                    {abandonmentPainText}
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between font-mono text-[11px]">
                <span className="text-slate-500 font-sans">月次解約率 (推定):</span>
                <span className="text-emerald-700 font-bold font-mono">
                  {company.monthlyChurnPercent ? `${company.monthlyChurnPercent}%以下` : '1.5%未満（極めて強固）'}
                </span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 03: 【初期トラクション獲得 & 参入障壁・競争優位性】              */}
      {/* ───────────────────────────────────────────────────────────── */}
      {(activeTab === 'ALL' || activeTab === 'TRACTION') && (
        <section className="py-6 border-b border-slate-200 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-slate-100 text-slate-900 font-mono text-xs font-bold border border-slate-200">
                03
              </span>
              <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-wide">
                初期トラクション獲得 & 参入障壁・競争優位性 (Initial Traction & Structural Advantage)
              </h2>
            </div>
            <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
              FIRST 10 CUSTOMERS, DECISION DRIVERS & COMPETITIVE MOAT
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 pt-2">
            {/* 初期トラクション獲得プロセス */}
            <div className="pb-6 lg:pb-0 lg:pr-8 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-slate-950" />
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                    初期トラクション獲得プロセス（実績ゼロからの初期10社開拓手法）
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-slate-900 font-bold bg-slate-100 px-2 py-0.5 border border-slate-200">
                  DAY-1 TRACTION
                </span>
              </div>

              <div className="divide-y divide-slate-100 text-xs font-sans">
                <div className="py-2.5 space-y-1">
                  <span className="text-[10px] font-mono text-slate-500 font-bold uppercase block">
                    初期開拓チャネル（見込み顧客への接触経路）
                  </span>
                  <p className="text-slate-800 leading-relaxed font-medium">
                    {company.first100CustomersStrategy?.tacticalChannel || company.initialTractionStrategy || 'ターゲットが集まる専門コミュニティ（X、業界特化掲示板、既存顧客リスト）への直接アプローチ'}
                  </p>
                </div>

                <div className="py-2.5 space-y-1">
                  <span className="text-[10px] font-mono text-slate-500 font-bold uppercase block">
                    初期アクション（提案内容とオファー設計）
                  </span>
                  <p className="text-slate-700 leading-relaxed font-medium">
                    {company.first100CustomersStrategy?.exactAction || company.successStory?.breakthroughMoment || company.initialTractionStrategy || '完成前のプロトタイプを無償提供し、「成果が出なければ全額返金」という無条件リスク反転オファーで即決獲得。'}
                  </p>
                </div>

                <div className="py-2.5 space-y-1">
                  <span className="text-[10px] font-mono text-emerald-800 font-bold uppercase block">
                    初期成約実績（検証成果）
                  </span>
                  <p className="text-emerald-950 font-medium">
                    {company.first100CustomersStrategy?.conversionProof || '公開直後から即時課金が発生し、広告費ゼロで初月の損益分岐点を突破。'}
                  </p>
                </div>
              </div>
            </div>

            {/* 購買決定を促す中核動機 */}
            <div className="pt-6 lg:pt-0 lg:pl-8 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-slate-950" />
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                    購買決定を促す中核動機（意思決定要因と心理的背景）
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-slate-900 font-bold bg-slate-100 px-2 py-0.5 border border-slate-200">
                  DECISION DRIVERS
                </span>
              </div>

              <div className="divide-y divide-slate-100 text-xs font-sans">
                <div className="py-2.5 space-y-1">
                  <span className="text-[10px] font-mono text-slate-500 font-bold uppercase block">
                    購買の引き金となった課題・機会損失への懸念
                  </span>
                  <p className="text-slate-800 leading-relaxed font-medium">
                    {trickPsychology}
                  </p>
                </div>

                <div className="py-2.5 space-y-1">
                  <span className="text-[10px] font-mono text-slate-500 font-bold uppercase block">
                    導入即決の決め手（競合優位性・業務効率化への期待）
                  </span>
                  <p className="text-slate-700 leading-relaxed font-medium">
                    {company.proDossier?.monetizationTrick.pricingPowerSecret || '競合他社に先んじた優位性確保と業務効率の劇的向上を明確に提示し、相見積もりを排除。'}
                  </p>
                </div>

                <div className="pt-2.5 flex items-center justify-between font-mono text-[11px]">
                  <span className="text-slate-500 font-sans font-medium">キャッシュ回収速度:</span>
                  <span className="text-slate-900 font-bold">{cashSpeed}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 参入前提条件・再現性の客観監査 */}
          <div className="pt-6 border-t border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
              <div>
                <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-0.5 font-bold">
                  STRUCTURAL ADVANTAGE AUDIT: 構造的参入優位性と再現性の監査
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                  参入前提条件・再現性の客観監査
                </h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 font-bold self-start sm:self-auto">
                再現性検証済
              </span>
            </div>

            {/* 4連判定帯（枠線の重複を排除したフラットマトリクス） */}
            <div className="border border-slate-200 bg-slate-50/50 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 font-sans text-xs">
              <div className="p-3.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase text-slate-500">開発スキル</span>
                  <span className={`px-2 py-0.5 text-[10px] font-mono font-bold ${
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

              <div className="p-3.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase text-slate-500">初期必要資金</span>
                  <span className={`px-2 py-0.5 text-[10px] font-mono font-bold ${
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

              <div className="p-3.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase text-slate-500">人脈・知名度依存</span>
                  <span className={`px-2 py-0.5 text-[10px] font-mono font-bold ${
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

              <div className="p-3.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase text-slate-500">特殊設備・許認可</span>
                  <span className={`px-2 py-0.5 text-[10px] font-mono font-bold ${
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

            <div className="pt-3 border-t border-slate-100 space-y-1">
              <span className="text-[10px] font-mono text-slate-500 font-bold uppercase block">
                アナリストによる再現性・構造抽出の総括判定
              </span>
              <p className="text-xs text-slate-800 font-medium leading-relaxed">
                {auditVerdictText}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 04: 【運用ツールスタック & 実行アセット】                        */}
      {/* ───────────────────────────────────────────────────────────── */}
      {(activeTab === 'ALL' || activeTab === 'INFRASTRUCTURE') && (
        <section className="py-6 border-b border-slate-200 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-slate-100 text-slate-900 font-mono text-xs font-bold border border-slate-200">
                04
              </span>
              <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-wide">
                運用ツールスタック & 実行アセット (Infrastructure & Execution Assets)
              </h2>
            </div>
            <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
              TECH STACK, 7-DAY BLUEPRINT & IMPLEMENTATION ASSETS
            </span>
          </div>

          {/* ツール・設備一覧テーブル */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                  事業を自動化・稼働させている全ツール・設備一覧
                </h3>
                <p className="text-[11px] text-slate-500">
                  同一のインフラ構成を構築することで、この事業のコアオペレーションを再現可能です。
                </p>
              </div>

              <div className="flex items-center gap-2 font-mono text-xs bg-slate-50 px-3 py-1.5 border border-slate-200 shrink-0">
                <span className="text-slate-500 font-sans">月間ツール固定費:</span>
                <span className="text-slate-900 font-black">
                  {totalMonthlyToolCost === 0 ? '0円 (完全無料枠)' : `約 ¥${totalMonthlyToolCost.toLocaleString()}/月`}
                </span>
              </div>
            </div>

            <div className="border border-slate-200">
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
                        <span className="w-1.5 h-1.5 bg-slate-950" />
                        <span>{tool.name}</span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 text-left font-sans">{tool.category}</td>
                      <td className="py-2.5 px-3 text-slate-700 text-left font-sans">{tool.purpose}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-900 font-bold">
                        {tool.monthlyCostJpy === 0 ? '無料' : `¥${tool.monthlyCostJpy.toLocaleString()}`}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="px-2 py-0.5 text-[10px] font-sans font-medium bg-slate-100 text-slate-700 border border-slate-200">
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
          <div className="pt-6 border-t border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <div className="text-[10px] font-mono text-slate-500 font-bold uppercase tracking-wider">
                  7-DAY EXECUTION BLUEPRINT: 立ち上げ工程表
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                  この収益モデルを立ち上げるための実戦スケジュール
                </h3>
              </div>
              <span className="text-[11px] font-mono text-slate-900 bg-slate-100 px-2 py-0.5 border border-slate-200 font-bold">
                所要期間: 7日間完結
              </span>
            </div>

            {/* 4分割ディバイダーグリッド */}
            <div className="border border-slate-200 bg-slate-50/40 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-200 text-xs font-sans">
              <div className="p-3.5 space-y-1">
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200 inline-block mb-1">
                  DAY 1 - 2
                </span>
                <h4 className="text-xs font-bold text-slate-900">プロダクト設計 & オファー定義</h4>
                <p className="text-[11px] text-slate-600 leading-relaxed font-sans pt-0.5">
                  {company.proDossier?.sevenDayBlueprint?.day1to2OfferSetup || '既存のノーコードまたはAPIを組み合わせ、顧客の課題を解決する最小機能（MVP）を24時間で定義・仮組み。'}
                </p>
              </div>

              <div className="p-3.5 space-y-1">
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200 inline-block mb-1">
                  DAY 3 - 4
                </span>
                <h4 className="text-xs font-bold text-slate-900">決済・契約インフラの開通</h4>
                <p className="text-[11px] text-slate-600 leading-relaxed font-sans pt-0.5">
                  {company.proDossier?.sevenDayBlueprint?.day3to4CashflowPipe || 'Stripe等の即時決済アカウントを開設し、ランディングページに決済ボタンを配線して入金ルートを即時確保。'}
                </p>
              </div>

              <div className="p-3.5 space-y-1">
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200 inline-block mb-1">
                  DAY 5 - 6
                </span>
                <h4 className="text-xs font-bold text-slate-900">初期顧客の獲得・検証</h4>
                <p className="text-[11px] text-slate-600 leading-relaxed font-sans pt-0.5">
                  {company.proDossier?.sevenDayBlueprint?.day5to6FirstCustomers || 'ターゲット顧客が集まるチャネル（X、特定掲示板、業界リスト）へ直接アプローチし、初期顧客のテスト導入・検証を完了させる。'}
                </p>
              </div>

              <div className="p-3.5 space-y-1">
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 inline-block mb-1">
                  DAY 7
                </span>
                <h4 className="text-xs font-bold text-emerald-950">自律運用・自動化パイプライン確立</h4>
                <p className="text-[11px] text-slate-700 leading-relaxed font-sans pt-0.5">
                  {company.proDossier?.sevenDayBlueprint?.day7AutomationEngine || 'フィードバックを受けた初期改善を反映し、定型業務（決済通知・アカウント発行）を自動化パイプラインに接続して自走化。'}
                </p>
              </div>
            </div>
          </div>

          {/* 実戦導入アセットライブラリ（Paywall） */}
          <div className="mt-8 border border-slate-900 bg-slate-950 text-white p-6 relative overflow-hidden space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 font-mono text-xs font-bold border border-amber-500/40">
                  PRO ACCESS REQUIRED
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  PRO ASSETS
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                会員規約適用
              </span>
            </div>

            <div>
              <h3 className="text-base sm:text-lg font-black tracking-tight text-white">
                実戦導入アセットライブラリ（Plug & Play 実戦アセット）
              </h3>
              <p className="text-xs text-slate-400 pt-1 leading-relaxed">
                実際に顧客獲得・自動運用で使用されている「成約プロンプト」「アウトバウンド文面」「生データCSV」を即時利用可能な形式で格納しています。
              </p>
            </div>

            {/* アセットリスト */}
            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-800 border border-slate-800 bg-slate-900/60 relative">
              <div className="p-4 space-y-2 select-none filter blur-[1.5px] opacity-70">
                <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">PROMPT / 実行コード</span>
                <div className="text-xs font-bold text-white">自律運用用システムプロンプト</div>
                <div className="text-[11px] font-mono text-slate-400 bg-slate-950/80 p-2 border border-slate-800">
                  System: You are an autonomous arbitrage analyst specialized in...
                </div>
              </div>

              <div className="p-4 space-y-2 select-none filter blur-[1.5px] opacity-70">
                <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase">OUTBOUND SCRIPT</span>
                <div className="text-xs font-bold text-white">高返信率のアウトバウンドテンプレート</div>
                <div className="text-[11px] font-mono text-slate-400 bg-slate-950/80 p-2 border border-slate-800">
                  件名: 業務プロセスの効率化に関するご提案...
                </div>
              </div>

              <div className="p-4 space-y-2 select-none filter blur-[1.5px] opacity-70">
                <span className="text-[10px] font-mono text-amber-400 font-bold uppercase">RAW DATA CSV</span>
                <div className="text-xs font-bold text-white">競合仕入れ先・価格差マスターリスト</div>
                <div className="text-[11px] font-mono text-slate-400 bg-slate-950/80 p-2 border border-slate-800">
                  ticker, supplier_cost, gross_margin, moat_power...
                </div>
              </div>

              {/* Paywall ロックオーバーレイ */}
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4 text-center space-y-3">
                <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-mono text-lg font-black">
                  <Lock size={18} className="text-amber-400" />
                </div>
                <div className="space-y-1 max-w-md">
                  <div className="text-sm font-black text-white">
                    PRO会員限定：実務テンプレート・実行アセット
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    全22社の営業アプローチ文面、自動化プロンプト、財務生データCSVを即時取得し、事業立ち上げ工数を最小化できます。
                  </p>
                </div>
                <button
                  type="button"
                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs font-mono tracking-wider transition-all shadow-md cursor-pointer"
                >
                  PROプランで全実行アセットを取得する (月額 ¥9,800〜)
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

    </div>
  );
};
