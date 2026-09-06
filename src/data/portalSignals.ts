export interface SignalDetailItem {
  id: string;
  badge: string;
  demandMetric: string;
  competitionMetric: string;
  title: string;
  catchphrase: string;
  summary: string;
  estimatedCapital: string;
  estimatedMonthlyProfit: string;
  grossMargin: string;
  paybackDays: string;
  targetMarket: string;
  glitchOrigin: {
    heading: string;
    detail: string;
  }[];
  monetizationTactics: {
    step: string;
    action: string;
    description: string;
  }[];
  essentialTools: {
    name: string;
    role: string;
    cost: string;
  }[];
  cautionRisk: string;
  relatedCompanyIds: string[];
}

export const PORTAL_SIGNALS: SignalDetailItem[] = [
  {
    id: 'signal-tiktok-shop-faceless',
    badge: 'MARKET SIGNAL 01 / 物販アービトラージ',
    demandMetric: '需要急増 +380%',
    competitionMetric: '競合: ほぼゼロ（国内）',
    title: 'TikTok Shop手元実演アフィリエイト（顔出し・声出し不要）',
    catchphrase: '顔出し・声出し不要の手元15秒動画を体系化し、広告費0円で初月月利300万円を達成するモデル',
    summary: '中国（1688/タオバオ）や米国でバズっている無名便利グッズをサンプル取り寄せし、手元だけで開封・実演する15秒のショート動画を量産。広告費ゼロでTikTok Shopのアフィリエイトリンクを踏ませ、初月から月商2,200万円（月利300万〜500万円）を叩き出すチームが急増しています。',
    estimatedCapital: '1万円（サンプル購入費のみ）',
    estimatedMonthlyProfit: '月利 300万〜500万円',
    grossMargin: '24%〜35%（実利）',
    paybackDays: '7日〜14日',
    targetMarket: 'スマホで深夜に衝動買いする若年・主婦層',
    glitchOrigin: [
      {
        heading: 'アルゴリズムの「実演動画」超優遇',
        detail: 'TikTokは自社のEC機能（TikTok Shop）を普及させるため、商品タグ付きの実演動画に莫大な無料オーガニック露出（インプレッション）をばら撒いています。',
      },
      {
        heading: '無償サンプル提供プログラムの悪用',
        detail: 'クリエイター登録すると、メーカーから実質無料で無制限にサンプル商品が送られてくるため、仕入れ原価がほぼゼロになります。',
      },
      {
        heading: '言語不要の手元特化フォーマット',
        detail: '字幕と効果音だけで成立するため、海外のバズ動画の構成をそのまま日本版・他国版に横展開するだけで再現可能です。',
      },
    ],
    monetizationTactics: [
      {
        step: 'STEP 1: 米国・東南アジアのTikTok Shop急上昇ランキングを監視',
        action: '直近7日間で1万個以上売れている「ビフォーアフターが分かりやすい日用品」を特定',
        description: '掃除グッズ、キッチン便利器具、姿勢矯正バンドなど、使った瞬間に「おっ」と驚きのあるアイテムを3品選定。',
      },
      {
        step: 'STEP 2: 手元だけの定点撮影（1日10本制作）',
        action: '開封から使用、ゴミ捨てまでをテンポよく15秒で編集',
        description: 'CapCutの自動字幕とトレンド音源を載せるだけ。自分自身の顔や声は一切不要。',
      },
      {
        step: 'STEP 3: 複数アカウントでの同時投下とアフィリエイト回収',
        action: '1つの動画を少し画角を変えて複数アカウントから投稿し、ヒットした動画に全集中',
        description: 'TikTok Shop公式アフィリエイト報酬（売上の15〜25%）が毎日自動計上される。',
      },
    ],
    essentialTools: [
      { name: 'TikTok Shop Creator Center', role: '無料サンプル申請・売上計測', cost: '無料' },
      { name: 'CapCut Pro', role: '爆速スマホ動画編集・自動字幕', cost: '月額1,100円' },
      { name: 'FastMoss / Shoplus', role: 'TikTok Shop売上ランキング分析', cost: '月額0円〜1万円' },
    ],
    cautionRisk: '商品の品質が粗悪な場合、返品クレームでアカウントの評価スコアが下がるリスクあり。事前評価の高いメーカー品のみを選別することが肝要。',
    relatedCompanyIds: ['commerce-faceless-team', 'solo-easlo'],
  },
  {
    id: 'signal-grant-ai-agent',
    badge: 'MARKET SIGNAL 02 / B2B高単価受託',
    demandMetric: '成約単価 50万円',
    competitionMetric: '粗利率 95%',
    title: '地方中小企業向け 助成金・補助金AI申請代行',
    catchphrase: '難解な公的申請書類をClaudeとChatGPTで15分でドラフト。着手金0円・成功報酬30%で独占',
    summary: '難解な公的申請書類を独自プロンプトで15分でドラフト作成。ITリテラシーが低い商工会議所周辺の中小企業にコールド営業し、着手金ゼロ・成果報酬30%で独占。1案件で50万〜150万円の純利益を手元に残します。',
    estimatedCapital: '0円（PCとAI課金のみ）',
    estimatedMonthlyProfit: '月利 200万〜600万円',
    grossMargin: '95%',
    paybackDays: '即日〜30日',
    targetMarket: '地方の町工場、飲食店、介護施設、中小IT企業',
    glitchOrigin: [
      {
        heading: '制度の複雑さと経営者の「諦め」',
        detail: '国や自治体は毎年数兆円規模の補助金・助成金を用意していますが、申請要件が官僚言葉で難解すぎるため、9割の中小企業が受け取りを諦めています。',
      },
      {
        heading: 'LLMの得意分野と完全合致',
        detail: '公的書類のフォーマットは型が決まっており、企業の基礎データと事業計画骨子を入力すれば、AIが完璧な論理構成で申請書を即座に書き上げます。',
      },
      {
        heading: '「着手金0円」による成約率の暴騰',
        detail: '経営者にとってノーリスク（受給できなければ1円も払わなくてよい）のため、テレアポや手紙DMの成約率が通常の営業代行の10倍に跳ね上がります。',
      },
    ],
    monetizationTactics: [
      {
        step: 'STEP 1: 対象となる補助金（ものづくり補助金、IT導入補助金等）の採択要件をプロンプト化',
        action: '採択された過去の公開申請書データを学習させ、評価基準を満たす文章生成テンプレートを作成',
        description: '評価加点ポイント（賃上げ計画、省力化設備導入）を自動で網羅する骨子ジェネレーターを構築。',
      },
      {
        step: 'STEP 2: 地元企業リストへの無料受給額診断レター送付',
        action: '「御社は最大300万円の補助対象です（診断無料）」という1枚のファックス・手紙を地域企業へ送付',
        description: '返信があった企業とZoomまたは対面で15分ヒアリング。基礎情報（決算書数値）を回収。',
      },
      {
        step: 'STEP 3: 申請書の出力と提携行政書士・社労士による捺印・提出',
        action: '法律上必要な行政書士と提携（報酬の10%をキックバック）し、合法的に申請を完了',
        description: '採択通知が届いた段階で、受給額の30%を成功報酬として請求。',
      },
    ],
    essentialTools: [
      { name: 'Claude 3.5 Sonnet / ChatGPT Plus', role: '難解な行政文書の長文生成・校正', cost: '月額3,000円' },
      { name: 'Notion / Google Docs', role: '顧客ヒアリングシート・提出進捗管理', cost: '無料' },
      { name: 'Jグランツ (jGrants)', role: '国の中小企業向け電子申請システム', cost: '無料' },
    ],
    cautionRisk: '行政書士法・社労士法に抵触しないよう、申請代理行為自体は提携士業名義で行い、自社は「書類作成支援・コンサルティング」として契約を結ぶこと。',
    relatedCompanyIds: ['b2b-clay-outbound', 'keyence-6861'],
  },
  {
    id: 'signal-oss-japanese-agent',
    badge: 'MARKET SIGNAL 03 / 自律型ストック収益',
    demandMetric: '継続課金 LTV特大',
    competitionMetric: '解約率 1%未満',
    title: '海外オープンソースSaaSの日本語化・国内代理導入',
    catchphrase: '英語圏の優れたOSSをローカライズし国内中小企業へ導入。月3万円の保守契約で強固な継続率を実現',
    summary: 'GitHubで普及しているオープンソース業務ツール（ERP、CRM、チャットサポートボット）を日本語化し、中小企業向けに月額3万円の保守契約で導入。自社開発を行わずに毎月150万円以上の安定的ストック収益を築く手法。',
    estimatedCapital: '0円',
    estimatedMonthlyProfit: '月利 150万〜300万円（ストック収入）',
    grossMargin: '90%以上',
    paybackDays: '即日',
    targetMarket: '月額何十万円もの高額SaaS（Salesforce等）を契約できない売上1億〜10億円の中堅企業',
    glitchOrigin: [
      {
        heading: '言語の壁とITアレルギー',
        detail: '世界には無料（オープンソース）で最高峰の業務管理ツールが無数にありますが、UIが英語でドキュメントも英語のため、日本の地方企業は存在すら知りません。',
      },
      {
        heading: 'SaaS価格の急騰による顧客の悲鳴',
        detail: '米大手SaaSが円安で毎年20〜30%値上げしており、中小企業は「もっと安くてシンプルなツールはないか」と必死に代替品を探しています。',
      },
      {
        heading: '一度入れた業務基盤は一生解約されない',
        detail: '日々の受発注や顧客管理の基盤となるため、月3万円程度なら「万が一動かなくなったら困る」という理由で解約率が実質1%未満になります。',
      },
    ],
    monetizationTactics: [
      {
        step: 'STEP 1: GitHubでStar数1万超のOSS業務ツールを選定',
        action: 'Chatwoot（問い合わせ対応）、Twenty（CRM）、Appflowy（社内Wiki）などの日本語UIパッケージを作成',
        description: 'Dockerコンテナ1個でVercelやRender、さくらVPSにデプロイできる状態を用意。',
      },
      {
        step: 'STEP 2: 「月額5万円のサポートツールを月額3万円で丸ごと保守」と提案',
        action: '初期導入費10万円＋月額保守3万円のパッケージとして商談',
        description: '「サーバー監視、データバックアップ、困ったときの電話サポート」を付加価値として提示。',
      },
      {
        step: 'STEP 3: 50社契約で月額150万円のストックキャッシュフロー完成',
        action: '障害が起きない限り日常の稼働時間は月数時間程度',
        description: 'サーバー代（月数千円）以外は全額が創業者の一人利益となる。',
      },
    ],
    essentialTools: [
      { name: 'GitHub & Docker', role: 'OSSリポジトリ管理とコンテナ起動', cost: '無料' },
      { name: 'Render / Railway / さくらのVPS', role: '安価なホスティングインフラ', cost: '月額1,000円〜' },
      { name: 'Stripe Billing', role: '毎月の月額3万円自動クレジット引き落とし', cost: '手数料3.6%' },
    ],
    cautionRisk: 'OSSのライセンス（AGPLやMIT）を厳格に確認し、商用利用・SaaS提供が認められているライセンスのプロダクトのみを扱うこと。',
    relatedCompanyIds: ['outbid-lol', 'solo-shipfast', 'niche-bolt-storage'],
  },
];
