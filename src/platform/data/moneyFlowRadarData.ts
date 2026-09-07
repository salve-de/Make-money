import { MoneyFlowTrend, RedOceanAlert, PainWalletHeatmap } from '../types/terminal';

// 1. 急上昇中の「稼ぎの型」トレンド
export const MONEY_FLOW_TRENDS: MoneyFlowTrend[] = [
  {
    id: 'trend_api_wrapper',
    badge: '急上昇 +340%',
    title: 'オープンモデル推論APIラッピング × 比較記事アフィリエイト30%還元カルテル',
    growthRateYoY: 340,
    avgMargin: 84,
    summary: '大手が法務確認で1年足踏みしている間、オープンソース画像・音声APIをNext.jsで薄く包み、SEO上位ブロガーを30%還元で囲い込んで完全1人で年商数億円を抜く型。',
    structuralBackground: '大企業のコンプライアンス（肖像権・著作権リスクの自縛）により、大手企業は即座に製品を出せない。そこに72時間で立ち上げ、Google検索上位アフィリエイターに売上を恒久還元することで、後発の参入を物理的に封殺している。',
    targetPainWallet: 'スタジオ撮影に行くのが億劫・恥ずかしい個人やフリーランス（見栄と極限の怠惰）',
    representativeEntityIds: ['ent_photoai', 'ent_headshotpro'],
    timestamp: '2026.Q1',
  },
  {
    id: 'trend_b2b_outbound',
    badge: '急上昇 +210%',
    title: 'VC調達企業の商談飢餓を突く！Clay×AIコールドアウトバウンド代行（成果報酬中抜き）',
    growthRateYoY: 210,
    avgMargin: 65,
    summary: '採用単価300万の営業マンを雇えないSaaS企業に対し、アポ1件獲得ごとに15万〜25万の完全成果報酬で突撃。裏側はAPI自動送信工場で利益率65%を抜く型。',
    structuralBackground: 'シリーズAを調達したB2B SaaS企業は投資家から商談数の拡大を詰められているが、営業マンの立ち上げには半年かかる。リスクゼロの「商談が起きなければ0円」オファーを叩きつけ、裏側のAPI配管で自動大量送信する。',
    targetPainWallet: '「商談数を増やせ」と投資家に詰められているVC調達済みSaaS創業者（焦燥の財布）',
    representativeEntityIds: ['ent_clay_aaa', 'ent_local_wash'],
    timestamp: '2026.Q1',
  },
  {
    id: 'trend_direct_monopoly',
    badge: '急上昇 +180%',
    title: '代理店完全排除・即日発送！キーエンス型直販独占モデルのスモール市場移植',
    growthRateYoY: 180,
    avgMargin: 54,
    summary: '流通代理店を排除して顧客の生データを直取りし、「17時までの注文は即日発送」という物流担保と定価販売で営業利益率50%超を叩き出す型。',
    structuralBackground: '競合他社が卸売・代理店網に依存してマージンを中抜きされ、相見積もりの値引き競争で消耗している中、自社直販営業と即日物流を構築。「今届かないとライン停止で1時間1000万損する」現場の恐怖を握って定価独占する。',
    targetPainWallet: '1分ラインが止まれば数百万円の損が出る工場長・生産技術部長（保身恐怖の財布）',
    representativeEntityIds: ['ent_keyence', 'ent_stripe'],
    timestamp: '2026.Q1',
  },
  {
    id: 'trend_media_box',
    badge: '急上昇 +150%',
    title: 'X/Googleアルゴリズム変動逆手！700万人日刊要約ニュースレターの広告枠全額前金独占',
    growthRateYoY: 150,
    avgMargin: 82,
    summary: 'SNSのPV乱高下に怯えるB2Bマーケターに「開封率40%の確定メール枠」を3ヶ月分前金で一括販売。配信原価はAWS SESでほぼ0円、純手残り80%超のストック型現金マシーン。',
    structuralBackground: 'SNSアルゴリズムの改変でWebメディアのPVが半減する中、メールボックスという個人の私的空間に直接届く日刊レターの知覚価値が急騰。広告主からの前受金でキャッシュフローが常にプラス。',
    targetPainWallet: 'SNS広告のCPA高騰に苦しむテック企業・B2Bマーケティング部（確定リード獲得の財布）',
    representativeEntityIds: ['ent_tldr', 'ent_easlo'],
    timestamp: '2026.Q1',
  },
];

// 2. レッドオーシャン警戒アラート（崩壊・陳腐化中の手口）
export const RED_OCEAN_ALERTS: RedOceanAlert[] = [
  {
    id: 'alert_prompt_selling',
    title: '単純なプロンプト集・GPTsの直売り',
    marginDecline: '粗利90% ➔ 18%へ急落（価格破壊で死亡）',
    failureReason: '誰でも5分で模倣でき、参入障壁が完全ゼロ。Gumroadやnoteで無料配布・値下げ競争が起き、集客広告費が売上を上回って即座に赤字化する。',
    alternativePlay: 'プロンプト単体を売るのをやめ、APIを叩くWebアプリ（MVP）に仕立てて「Stripe月額課金」または「法人の業務自動化代行」として売れ。',
  },
  {
    id: 'alert_sns_posting_agency',
    title: '労働集約型のSNS投稿・図解作成代行',
    marginDecline: '月額単価20万 ➔ 3万円へ暴落（AI生成の一般化）',
    failureReason: 'Canvaや画像AIの普及でクライアント自身が作成可能になり、単なる「作業代行」は最もコストカットの対象になりやすい。',
    alternativePlay: '投稿作成を捨て、ClayやInstantlyを使った「商談アポ獲得代行（成果報酬）」へ配管を転換せよ。認知ではなく「売上直結」の財布を人質に取れ。',
  },
];

// 3. 急激に膨らむ「痛みの財布」ヒートマップ
export const PAIN_WALLET_HEATMAPS: PainWalletHeatmap[] = [
  {
    id: 'pain_factory_downtime',
    sector: '製造業・工場ライン',
    targetPersona: '工場長・生産技術部長',
    painTrigger: '工場の製造ライン停止（1時間の停止で売上500万〜1,000万円の蒸発）',
    budgetBehavior: '相見積もりなし・定価即決・「今日届くならいくらでも払う」緊急予備費から支出',
    urgencyLevel: 'CRITICAL',
  },
  {
    id: 'pain_vc_traction_pressure',
    sector: '調達済みB2B SaaS',
    targetPersona: 'シード〜シリーズAのスタートアップ創業者',
    painTrigger: '投資家からの商談数ノルマ ＆ 自社営業マン採用の立ち上げ遅延（半年放置で資金ショート）',
    budgetBehavior: '「アポ1件20万円」の完全成果報酬なら稟議不要・経営判断で即日クレジットカード決済',
    urgencyLevel: 'CRITICAL',
  },
  {
    id: 'pain_social_vanity_shame',
    sector: '個人・フリーランス',
    targetPersona: 'SNS・LinkedInでプロっぽく見せたい個人事業主',
    painTrigger: '写真スタジオに行く羞恥心・カメラマンの前でポーズを取る億劫さ（4万円＋拘束半日）',
    budgetBehavior: '家から自撮りアップロードで完結するなら、月額4,000円をその場で即決カード決済',
    urgencyLevel: 'HIGH',
  },
];
