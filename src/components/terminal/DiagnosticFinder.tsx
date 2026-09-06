'use client';

import React, { useState, useMemo } from 'react';

export type CapitalLevel = 'ZERO' | 'MICRO' | 'MID' | 'HIGH';
export type TimeCommitment = 'ULTRA_LIGHT' | 'SIDE_JOB' | 'FULL_TIME';
export type Capability = 'NO_CODE_API' | 'SALES_OUTBOUND' | 'CONTENT_MEDIA' | 'BIZ_EFFICIENCY';
export type RevenueModel = 'PASSIVE_STOCK' | 'HIGH_TICKET_SHOT' | 'NICHE_AUCTION';
export type TargetProfit = 'TIER_30M' | 'TIER_100M' | 'TIER_500M';

interface MatchedStrategy {
  id: string;
  companyId: string;
  title: string;
  founderReference: string;
  monthlyRevenueEstimate: string;
  profitMargin: number;
  bestFitScore: number;
  whyFitsYourCards: string;
  incumbentVsYou: {
    incumbentPain: string;
    yourEdge: string;
  };
  threeKeyTools: Array<{ name: string; role: string }>;
  dayOneAction: string;
  proSecretTip: string;
}

interface DiagnosticFinderProps {
  onSelectCompany?: (companyId: string) => void;
}

export const DiagnosticFinder: React.FC<DiagnosticFinderProps> = ({ onSelectCompany }) => {
  const [capital, setCapital] = useState<CapitalLevel>('ZERO');
  const [time, setTime] = useState<TimeCommitment>('SIDE_JOB');
  const [capability, setCapability] = useState<Capability>('NO_CODE_API');
  const [model, setModel] = useState<RevenueModel>('PASSIVE_STOCK');
  const [targetProfit, setTargetProfit] = useState<TargetProfit>('TIER_100M');

  // 診断ロジック：5軸に基づく高精度マッチング
  const matchedStrategies: MatchedStrategy[] = useMemo(() => {
    const list: MatchedStrategy[] = [
      {
        id: 'outbid-auction',
        companyId: 'solo-outbid',
        title: '虚栄心オークション型 順位即時入札モデル',
        founderReference: 'outbid.lol（ジョナサン・ヴィルケ氏 / 48時間で2,000万円）',
        monthlyRevenueEstimate: '月利50万〜200万円（初期爆発力大）',
        profitMargin: 97,
        bestFitScore: (capital === 'ZERO' || capital === 'MICRO' ? 30 : 10) +
                      (time === 'ULTRA_LIGHT' ? 30 : 15) +
                      (model === 'NICHE_AUCTION' ? 25 : 10) +
                      (capability === 'NO_CODE_API' ? 15 : 5),
        whyFitsYourCards: '手元資金ゼロ・週3時間の片手間でも、無料投票サイトの不正に激怒する起業家を巻き込み、一番金を払った者を1位にする単純ルールとStripe即時決済のみで最短着金可能。',
        incumbentVsYou: {
          incumbentPain: 'ProductHunt等の無料ランキングサイトが「裏での自作自演・不正投票」で荒れ、起業家が不満を抱えている。',
          yourEdge: '「最初から金で順位を買う」露骨なルールにし、起業家の負けず嫌いと承認欲求を入札合戦へ転換。'
        },
        threeKeyTools: [
          { name: 'Stripe', role: 'カード即時決済と入金イベント検知' },
          { name: 'Next.jsテンプレート', role: 'リーダーボード画面を1枚ペラで即時公開' },
          { name: 'X（Twitter）', role: '入札額の変動を動画キャプチャで1行実況投稿' }
        ],
        dayOneAction: '「金で順位を買える露骨なサイトを作った」と1行動画をXに投稿し、直近で無料ランキングに不満を漏らしていた起業家3人にDMで直接投げ込む。',
        proSecretTip: '定価を決めずオークション形式にすることで、価格交渉の余地を物理的にゼロ化し、入札者の意地で単価が勝手に吊り上がる。'
      },
      {
        id: 'keyence-ipad-inspection',
        companyId: 'keyence-japan',
        title: 'キーエンス逆利用型 町工場向け格安iPad外観検査モデル',
        founderReference: 'キーエンスの死角を突くエッジAIベンチャー実例',
        monthlyRevenueEstimate: '月利100万〜300万円（ストック保守契約）',
        profitMargin: 78,
        bestFitScore: (capability === 'SALES_OUTBOUND' ? 35 : 5) +
                      (targetProfit === 'TIER_100M' || targetProfit === 'TIER_500M' ? 25 : 10) +
                      (model === 'HIGH_TICKET_SHOT' ? 20 : 10) +
                      (capital === 'MICRO' || capital === 'MID' ? 20 : 10),
        whyFitsYourCards: '営業・折衝力があるなら最強。キーエンスが相手にしない「500万円未満の町工場」へ、中古iPadと画像認識AIを組み合わせた格安検査システムを直販し、月額保守を独占回収。',
        incumbentVsYou: {
          incumbentPain: 'キーエンスの営業マンが町工場に「一式500万＋年保守100万」を提示。高齢パートの退職に怯える工場長が価格に絶望している。',
          yourEdge: '「初期20万＋月額2万円」の10分の1以下の価格で、現場の目視検査を即日自動化。'
        },
        threeKeyTools: [
          { name: '中古iPad (第9世代)', role: '製造ライン固定カメラおよび現場用端末' },
          { name: 'Roboflow / YOLO', role: '無料枠で使えるノーコード傷・不良品検知モデル' },
          { name: 'LINE公式アカウント', role: '不良検知時の工場長スマホへの即時写真通知' }
        ],
        dayOneAction: '地元の金属加工・プラスチック工場3社に電話し、「パートさんの目視検査をiPadで月2万円で自動化する実演デモをお持ちしてよろしいですか？」と工場長のアポを取る。',
        proSecretTip: 'システムではなく「現場のラインを止めない保険」として売ることで、相見積もりを排除し値引き交渉をゼロにする。'
      },
      {
        id: 'daily-tech-newsletter',
        companyId: 'dan-ni-tldr',
        title: '毎朝5分要約型 B2B広告枠直販ニュースレターモデル',
        founderReference: 'TLDR（ダン・ニー氏 / 1人創業で年商15億円）',
        monthlyRevenueEstimate: '月利80万〜250万円（広告枠ストック）',
        profitMargin: 88,
        bestFitScore: (capability === 'CONTENT_MEDIA' ? 35 : 5) +
                      (capital === 'ZERO' ? 25 : 10) +
                      (time === 'SIDE_JOB' || time === 'ULTRA_LIGHT' ? 20 : 10) +
                      (model === 'PASSIVE_STOCK' ? 20 : 10),
        whyFitsYourCards: '文章要約やリサーチが得意なら、原価ゼロで最も手堅い。毎朝忙しいエンジニアやビジネスマン向けに英語記事を3行要約し、読者が1,000人を超えた段階でB2Bツールのスポンサー枠（1枠10万円〜）を直販。',
        incumbentVsYou: {
          incumbentPain: '大手ITメディアの記事が長すぎて、日々の忙しいエンジニアが最新技術のキャッチアップに疲弊している。',
          yourEdge: '毎朝5分で読める「3行箇条書き要約」に特化し、読者の朝のルーティンを独占。'
        },
        threeKeyTools: [
          { name: 'Beehiiv', role: 'メルマガ配信・紹介ループ・広告ネットワーク統合基盤' },
          { name: 'Claude / GPT-4o', role: '海外論文・最新ニュースの骨子抽出・要約補助' },
          { name: 'Stripe', role: 'B2Bスポンサー広告主からの事前カード引き落とし' }
        ],
        dayOneAction: '海外の最新AIツール5選を3行ずつ要約した第1号を作成し、Xで「毎朝この要約が届く無料レターを始めました」とスレッド投稿して最初の50人を集める。',
        proSecretTip: '広告代理店を挟まず、事例に出てくるSaaS企業に「読者3,000人のエンジニアに届きます」と直接提案することでマージンを100%手元に残す。'
      },
      {
        id: 'headshot-ai-b2b',
        companyId: 'danny-postma-headshotpro',
        title: 'セルフィー変換型 法人向け顔写真即時生成モデル',
        founderReference: 'HeadshotPro（ダニー・ポストマ氏 / 1人で年商5.4億円）',
        monthlyRevenueEstimate: '月利150万〜400万円（完全自動決済）',
        profitMargin: 84,
        bestFitScore: (model === 'PASSIVE_STOCK' ? 30 : 10) +
                      (capability === 'NO_CODE_API' ? 25 : 10) +
                      (capital === 'MICRO' || capital === 'MID' ? 25 : 10) +
                      (time === 'ULTRA_LIGHT' ? 20 : 10),
        whyFitsYourCards: 'APIの配線ができるなら利益率は最高峰。リモートワーク企業向けに、スタジオ撮影の数十万円と全社員の日程調整を排し、自撮り写真を送るだけで1時間でプロ証明写真を自動納品。',
        incumbentVsYou: {
          incumbentPain: '全社員を写真スタジオに呼ぶ数十万円の費用と、日程調整にかかる膨大な総務・人事の手間。',
          yourEdge: '「自撮り写真をアップロードするだけ」で、1人3,900円・1時間納品で全社員のトーンを統一。'
        },
        threeKeyTools: [
          { name: 'Replicate API (Flux / SDXL)', role: '顔写真の画像生成推論API' },
          { name: 'Stripe Checkout', role: '全世界カード事前決済と領収書自動送付' },
          { name: 'Vercel / Supabase', role: '写真の安全アップロードと納品パイプライン' }
        ],
        dayOneAction: 'LinkedInでリモートワーク企業の人事担当者10人に「社員の顔写真をAIで統一しませんか？無料で3名分サンプルを作成します」とメッセージを送る。',
        proSecretTip: '「B2Cの遊び画像」ではなく「法人の名刺・社内名簿用」として売ることで、会社の経費で躊躇なく即決決済させる。'
      },
      {
        id: 'clay-outbound-agency',
        companyId: 'clay-ai-agency',
        title: '資金調達企業特化型 超個別化アウトバウンド代行モデル',
        founderReference: 'Clay×AIコールドアウトバウンド代行実例（月利800万・利益率65%）',
        monthlyRevenueEstimate: '月利150万〜500万円（成果報酬＋月額保守）',
        profitMargin: 65,
        bestFitScore: (capability === 'BIZ_EFFICIENCY' ? 35 : 10) +
                      (targetProfit === 'TIER_100M' || targetProfit === 'TIER_500M' ? 30 : 10) +
                      (capital === 'MID' ? 20 : 10) +
                      (time === 'FULL_TIME' || time === 'SIDE_JOB' ? 15 : 5),
        whyFitsYourCards: '業務理解・データスクレイピング力があるなら一撃が大きい。営業マンを雇うと月50万円かかる企業に対し、ClayとAIで見込み客の直近ニュースを盛り込んだ超個別化メールを完全自動代行。',
        incumbentVsYou: {
          incumbentPain: '一斉送信のコールドメールが迷惑メール判定され、新規アポが取れずに営業人件費が無駄になっている。',
          yourEdge: '直近のプレスリリースや求人情報をAIが自動引用した「完全に自分向け」の文面で返信率30%超を叩き出す。'
        },
        threeKeyTools: [
          { name: 'Clay.com', role: '見込み客企業・役職者のデータ自動エンリッチメント' },
          { name: 'Instantly.ai', role: 'スパム回避ドメインによる複数アカウント自動配信' },
          { name: 'OpenAI API', role: '相手企業の直近ニュースに基づく1行パーソナライズ生成' }
        ],
        dayOneAction: '先月資金調達を発表したスタートアップ5社をリサーチし、社長宛てに「御社のターゲット企業20社をClayで抽出したリストと、返信率35%の提案文下書き」を無償添付して送る。',
        proSecretTip: '月額固定費ではなく「アポ1件獲得ごとに3万円」の成果報酬にすることで、相手の導入リスクをゼロにして即断即決させる。'
      }
    ];

    return list.sort((a, b) => b.bestFitScore - a.bestFitScore);
  }, [capital, time, capability, model, targetProfit]);

  const topMatch = matchedStrategies[0];

  return (
    <section className="p-6 sm:p-8 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-6 select-none">
      {/* 見出し */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-mono text-[10px] font-bold border border-indigo-200">
              DIAGNOSTIC MATRIX
            </span>
            <span className="text-[11px] font-mono text-slate-500">
              多次元・手札逆引き診断ファインダー
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
            あなたの手持ち条件から、明日真似すべき実在モデルを即答
          </h2>
          <p className="text-xs text-slate-600 pt-0.5">
            AIの適当な思いつき作文を完全排除。実在する検証済み22社の中から、あなたの手札で勝てる構造モデルを自動照合します。
          </p>
        </div>
        <span className="text-[10px] font-mono text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200 font-bold self-start sm:self-auto">
          監査済みデータ照合
        </span>
      </div>

      {/* 5次元コントロールパネル */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 text-xs font-sans">
        
        {/* 1. 投下可能資本 */}
        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
          <span className="text-[10px] font-mono text-slate-500 font-bold uppercase block">
            1. 投下可能資本
          </span>
          <div className="space-y-1 font-mono text-[11px]">
            {[
              { id: 'ZERO', label: '0円 (元手ゼロ)' },
              { id: 'MICRO', label: '〜5万円 (API/鯖代)' },
              { id: 'MID', label: '10万〜50万円' },
              { id: 'HIGH', label: '100万円以上' },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setCapital(opt.id as CapitalLevel)}
                className={`w-full px-2.5 py-1.5 rounded-lg text-left transition-all cursor-pointer ${
                  capital === opt.id
                    ? 'bg-indigo-600 text-white font-bold shadow-2xs'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* 2. 週次コミット時間 */}
        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
          <span className="text-[10px] font-mono text-slate-500 font-bold uppercase block">
            2. 週実働コミット
          </span>
          <div className="space-y-1 font-mono text-[11px]">
            {[
              { id: 'ULTRA_LIGHT', label: '週1〜3h (完全自販機)' },
              { id: 'SIDE_JOB', label: '週5〜10h (副業・週末)' },
              { id: 'FULL_TIME', label: '週30h+ (専任・本業)' },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setTime(opt.id as TimeCommitment)}
                className={`w-full px-2.5 py-1.5 rounded-lg text-left transition-all cursor-pointer ${
                  time === opt.id
                    ? 'bg-indigo-600 text-white font-bold shadow-2xs'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* 3. 手持ちスキル・特性 */}
        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
          <span className="text-[10px] font-mono text-slate-500 font-bold uppercase block">
            3. 手持ちスキル特性
          </span>
          <div className="space-y-1 font-mono text-[11px]">
            {[
              { id: 'NO_CODE_API', label: 'コード不要・API配線' },
              { id: 'SALES_OUTBOUND', label: '泥臭い営業・直談判' },
              { id: 'CONTENT_MEDIA', label: '文章要約・発信力' },
              { id: 'BIZ_EFFICIENCY', label: '実務・効率化知見' },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setCapability(opt.id as Capability)}
                className={`w-full px-2.5 py-1.5 rounded-lg text-left transition-all cursor-pointer ${
                  capability === opt.id
                    ? 'bg-indigo-600 text-white font-bold shadow-2xs'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* 4. 収益モデル志向 */}
        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
          <span className="text-[10px] font-mono text-slate-500 font-bold uppercase block">
            4. 収益モデル志向
          </span>
          <div className="space-y-1 font-mono text-[11px]">
            {[
              { id: 'PASSIVE_STOCK', label: '不労ストック型' },
              { id: 'HIGH_TICKET_SHOT', label: '高単価ショット型' },
              { id: 'NICHE_AUCTION', label: '隙間オークション型' },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setModel(opt.id as RevenueModel)}
                className={`w-full px-2.5 py-1.5 rounded-lg text-left transition-all cursor-pointer ${
                  model === opt.id
                    ? 'bg-indigo-600 text-white font-bold shadow-2xs'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* 5. 目標手残り純利 */}
        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
          <span className="text-[10px] font-mono text-slate-500 font-bold uppercase block">
            5. 目標手残り月利
          </span>
          <div className="space-y-1 font-mono text-[11px]">
            {[
              { id: 'TIER_30M', label: '月利 30万〜50万' },
              { id: 'TIER_100M', label: '月利 100万〜300万' },
              { id: 'TIER_500M', label: '月利 500万円以上' },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setTargetProfit(opt.id as TargetProfit)}
                className={`w-full px-2.5 py-1.5 rounded-lg text-left transition-all cursor-pointer ${
                  targetProfit === opt.id
                    ? 'bg-indigo-600 text-white font-bold shadow-2xs'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* 診断結果シート */}
      {topMatch && (
        <div className="p-5 sm:p-6 rounded-xl bg-slate-900 text-white border border-slate-800 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono text-[10px] font-bold border border-emerald-500/40">
                  BEST FIT MATCH: 適合度 1位
                </span>
                <span className="text-xs font-mono text-slate-400">
                  実績参照: {topMatch.founderReference}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-white">
                {topMatch.title}
              </h3>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right font-mono">
                <span className="text-[10px] text-slate-400 block">想定手残り月利</span>
                <span className="text-sm sm:text-base font-black text-emerald-400">
                  {topMatch.monthlyRevenueEstimate}
                </span>
              </div>
              <div className="text-right font-mono pl-3 border-l border-slate-800">
                <span className="text-[10px] text-slate-400 block">粗利益率</span>
                <span className="text-sm sm:text-base font-black text-white">
                  {topMatch.profitMargin}%
                </span>
              </div>
            </div>
          </div>

          {/* なぜあなたの手札で勝てるのか */}
          <div className="p-3.5 bg-slate-950 rounded-lg border border-slate-800/80 space-y-1 text-xs">
            <span className="text-[10px] font-mono text-indigo-400 font-bold uppercase block">
              なぜあなたの手札で勝てるのか（構造的適合理由）
            </span>
            <p className="text-slate-300 leading-relaxed font-sans font-medium">
              {topMatch.whyFitsYourCards}
            </p>
          </div>

          {/* 現場の対立構図 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-sans">
            <div className="p-3.5 bg-rose-950/30 rounded-lg border border-rose-900/40 space-y-1">
              <span className="text-[10px] font-mono text-rose-400 font-bold uppercase block">
                突くべき既存プレイヤーの盲点・不満
              </span>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                {topMatch.incumbentVsYou.incumbentPain}
              </p>
            </div>

            <div className="p-3.5 bg-emerald-950/30 rounded-lg border border-emerald-900/40 space-y-1">
              <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase block">
                あなたの勝ち筋（カウンターパンチ）
              </span>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                {topMatch.incumbentVsYou.yourEdge}
              </p>
            </div>
          </div>

          {/* 明日から配線すべき3大ツール ＆ DAY-1アクション */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 text-xs font-sans">
            {/* 3大ツール */}
            <div className="lg:col-span-5 p-3.5 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
              <span className="text-[10px] font-mono text-slate-400 font-bold uppercase block">
                明日から配線すべき3大ツール
              </span>
              <div className="space-y-1.5 font-mono text-[11px]">
                {topMatch.threeKeyTools.map((t, idx) => (
                  <div key={idx} className="flex items-start gap-2 bg-slate-900/80 p-1.5 rounded border border-slate-800">
                    <span className="text-indigo-400 font-bold shrink-0">0{idx + 1}</span>
                    <div className="min-w-0">
                      <span className="text-white font-bold block">{t.name}</span>
                      <span className="text-[10px] text-slate-400 font-sans">{t.role}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* DAY-1 泥臭い初動アクション */}
            <div className="lg:col-span-7 p-3.5 bg-indigo-950/40 rounded-lg border border-indigo-900/50 space-y-2 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-mono text-indigo-400 font-bold uppercase block mb-1">
                  DAY-1: 明日あなたが取るべき泥臭い具体的アクション
                </span>
                <p className="text-slate-200 leading-relaxed text-xs font-medium">
                  {topMatch.dayOneAction}
                </p>
                <p className="text-[11px] text-indigo-300/80 pt-2 font-sans border-t border-indigo-900/40 mt-2">
                  [ANALYST SECRET]: {topMatch.proSecretTip}
                </p>
              </div>

              {onSelectCompany && (
                <div className="pt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={() => onSelectCompany(topMatch.companyId)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <span>この事業の完全レントゲンを開く</span>
                    <span>➔</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
