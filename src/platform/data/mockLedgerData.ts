import { FinancialEntity } from '../types/terminal';

export const INSTITUTIONAL_ENTITIES: FinancialEntity[] = [
  {
    id: 'ent_keyence',
    ticker: '6861.T',
    name: 'キーエンス (KEYENCE)',
    legalEntity: '株式会社キーエンス',
    tagline: '「ラインが1分止まれば数千万吹っ飛ぶ」工場長のクビの恐怖を突き、原価率18%のセンサーを相見積もり拒否で定価売りする手口',
    sector: 'MONOPOLY_MFG',
    scale: 'ENTERPRISE',
    founder: '滝崎武光',
    country: 'JP',
    url: 'https://www.keyence.co.jp',
    verifiedBadge: true,
    growthRateYoY: 14.8,
    architecturePattern: '直販要塞',
    pipelineStack: '内製SFA × 即日物流網 × ファブレス生産委託',
    targetPainWallet: '工場長の保身（ライン停止・歩留まり悪化の恐怖）',
    tags: ['直販独占', '相見積もり拒否', 'B2B製造', '損失回避', 'ファブレス', '利益率50%超'],
    essence: {
      whatItDoes: '工場の歩留まり改善・FA（工場自動化）センサーの直販企画製造（ファブレス）',
      targetCustomer: '製造業各社の工場長・生産技術部門・品質管理責任者',
      painRelief: '「1分間停止で数千万円吹っ飛ぶ」製造ライン停止の恐怖と歩留まり悪化',
    },
    pricing: {
      model: '直販独占定価（相見積もり完全拒否）',
      pricePoint: '単価数百万円〜数千万円（原価率18%）',
      psychologicalTrigger: '損失回避（「安い代替品を使ってラインが止まったら自分のクビが飛ぶ」購買担当者の保身心理）',
      estimatedLtvJpy: 120000000,
      churnRate: '0.8%/年',
    },
    acquisition: {
      cacJpy: 120000,
      primaryFunnel: '技術白書SEOダウンロード ➔ 30分以内に直販営業が電話 ➔ 翌朝デモ機持参で現場訪問テスト',
      tactics: [
        'ホワイトペーパーによる製造現場の課題先回り',
        '即日デモ機発送率99.9%',
        '「外報（外出報告書）」による分単位の顧客情報蓄積',
      ],
    },
    pnl: {
      monthlyRevenue: 80000000000, // 月商約800億円 (年商約9,600億円)
      cogs: 14400000000, // 売上原価 (粗利率約82%)
      grossProfit: 65600000000,
      grossMargin: 82.0,
      operatingExpenses: {
        serverAndApi: 800000000,
        advertising: 3200000000,
        subcontracting: 4800000000,
        toolsAndSaaS: 1600000000,
        other: 12000000000, // 人件費・高額賞与含む
      },
      operatingProfit: 43200000000, // 営業利益 (約54%)
      operatingMargin: 54.0,
      estimatedAnnualNetProfit: 360000000000, // 純利約3,600億円
    },
    operations: {
      teamSize: 10500,
      weeklyHours: 45,
      initialCapitalRequired: 500000000,
      automationLevel: 88,
      primaryChannels: ['直販ダイレクトセールス', 'Web技術資料請求 (ホワイトペーパーSEO)', '即日デモ機発送'],
      toolStack: [
        { name: '内製基幹ERP・SFA (分単位行動管理)', category: '基幹業務', monthlyCost: 15000000, purpose: '営業マンの分単位の行動記録と全国7万工場のトラブル履歴一元管理', replacementDifficulty: 'HIGH' },
        { name: 'AWS クラウドインフラ', category: 'インフラ', monthlyCost: 8000000, purpose: '全世界の顧客データ・技術資料ダウンロード基盤', replacementDifficulty: 'MEDIUM' },
        { name: 'ファブレス生産委託管理システム', category: 'SCM', monthlyCost: 5000000, purpose: '自社工場を持たず協力工場へ即時発注・品質検品するサプライチェーン基盤', replacementDifficulty: 'HIGH' },
      ],
    },
    strategy: {
      blindspot: '【「1分間数千万円のライン停止損失」に震える製造業の恐怖を狙い撃ち】製造業の購買部は相見積もりを取る時間すら惜しむ。代理店を排除し「即日デモ機を持参して工場の歩留まり改善を現場検証する」直販体制により、原価率18%の汎用センサーを定価の5〜10倍の「保険料込み独占価格」で即断即決させる。',
      moatType: 'PROCESS_POWER',
      moatDescription: '【7万社の製造現場データ独占 ✕ 当日発送率99.9%の物理物流網】競合が同等精度のセンサーを作っても、全国の製造ラインを分単位で回り尽くす直販コンサル部隊と、注文即日必着の物流インフラを模倣できないため、現場は代替品を探すリスクを冒せない。',
      incumbentDilemma: '競合（オムロン・パナソニック等）は既存の代理店網に依存しており、直販化すると代理店から猛反発を受け商流が崩壊するため、キーエンスと同じ直販コンサル部隊を作れない。',
      secretInsight: '営業マンには「接待禁止・贈答品禁止」を徹底。代わりに「顧客の製造ラインのどこにムダがあるか」を数値化して突きつけることで、感情ではなく合理性で定価購入させる。営業利益の約1/3を社員に賞与還元し、超高密度な行動量を担保。',
      initialTraction: [
        '自動線材切断機の開発から着手し、工場の現場担当者に直接ヒアリングを反復',
        '代理店経由の販売を全廃し、自社営業が直接工場に入り込む直販体制を確立',
        '「当日発送」を徹底し、工場の製造ライン停止という最大の痛みをゼロにする絶対的信頼を構築',
      ],
      actionPlaybook: [
        'Step 1: 自ら製造ラインを持たず、企画・設計・直接販売に特化するファブレス体制を敷く',
        'Step 2: 顧客が気づいていない「現場の歩留まり損失（コスト）」を定量化する診断シートを作成',
        'Step 3: 競合が相見積もりを出す前に、即日デモ機を持ち込んで現場検証を完了させ即決させる',
      ],
      coldOutreachTemplate: '【貴社〇〇工場の歩留まり改善に関するご提案】突然のご連絡失礼いたします。同業他社様で月間〇〇時間のライン停止損失をゼロにした「非接触センサーによる事前検知モデル」の実機デモ機を、明日午前中にお持ちして30分でテスト可能です。費用は一切発生いたしません。',
    },
    meta: {
      incumbentDilemma: {
        cannibalizationBarrier: 'オムロン・三菱・パナは既存の巨大代理店網に依存しており、キーエンスのように直販化すると全代理店からボイコットされ本業数千億円が蒸発するため直販体制を作れない。',
        scaleMismatchReason: '「営業利益率80%超が狙える案件のみ開発着手」という狂気の規律は大手の社内政治・開発リソース配分では稟議が通らない。',
        decisionSpeedAdvantage: '即日デモ機持参・即日テスト・当日出荷率99.9%という物理物流と現場コンサル営業の密結合は、官僚的大手には模倣不可能。',
      },
      pricingPower: {
        anchorComparison: '「数十万円のセンサー代」ではなく「1時間の製造ライン停止損失（数千万円）」と比較させることで、定価の5〜10倍の価格を正当化。',
        lossAversionTrigger: '「他社の安い代替品を使ってラインが止まったら担当者のクビが飛ぶ」という工場責任者の保身・免責心理。',
        budgetCategory: '工場の設備投資・保全修繕予算（減価償却費枠・緊急保全枠）。相見積もりを取らずに即断即決される枠。',
      },
      lockInMechanism: {
        dataHostage: '全国7万工場の製造トラブル履歴と過去のカスタマイズ設定データがキーエンスのSFAに独占蓄積。',
        workflowIntegration: '工場の治具やPLC（制御装置）プログラムがキーエンス仕様で設計され、他社製への交換はライン全面停止を意味するため物理的に不可能。',
        switchingFriction: '代替品テストのためのライン停止コストと、品質事故リスクの責任が担当者に降りかかるため、誰も乗り換えを言い出せない。',
      },
      capitalEfficiency: {
        cashConversionCycle: '自社工場を持たないファブレス（製造は協力工場へ外注し支払は遅め）× 顧客への即納・翌月直接回収。',
        incrementalMargin: '売上原価率わずか18%。固定費を回収した後の売上増は、営業利益へダイレクトに直下（営業利益率54%）。',
        workingCapitalStrategy: '無借金経営。毎年数千億円の営業CFが積み上がり、手元現金は1兆円超の安全地帯。',
      },
    },
    exposureAudit: {
      guerrillaTraction: '創業初期、創業者がカバンに自動線材切断機を詰めて全国の町工場へアポなし突撃。油まみれの職人の横に張り付き、現場の歩留まりロスをその場で手計算して即日注文書にサインさせた直販ゲリラ戦。',
      platformGlitch: '「代理店を挟むと値引き競争で疲弊する」商慣習を完全拒否。全製品定価・値引きゼロ・即日納品を貫き、製造ライン停止損害（数千万円）の恐怖を人質に購買部ではなく工場長へ直談判して相見積もりを粉砕。',
      pivotSnapshot: '下請け製造で2度の倒産危機を経験。「自社工場を持つと固定費で死ぬ」と悟り、工場を全廃してファブレス化。「粗利80%超の直販センサー」に全リソースをピボットした瞬間に高収益体質へ激変。',
      hiddenStackCost: 'センサーの物理製造原価率はわずか18%（協力工場へ委託）。売上の54%が純粋な営業利益として残り、その巨額利益の約3分の1を高額賞与として社員へ配分し、分単位の行動管理を自発的に回す人間エンジン。',
    },
  },
  {
    id: 'ent_stripe',
    ticker: 'STRIPE',
    name: 'Stripe',
    legalEntity: 'Stripe, Inc.',
    tagline: '開発者のMacをその場で奪い勝手にコードを貼る泥臭いゲリラ戦から、世界中の決済に寄生し2.9%を自動天引きする手口',
    sector: 'FINTECH_INFRA',
    scale: 'ENTERPRISE',
    founder: 'Patrick & John Collison',
    country: 'US',
    url: 'https://stripe.com',
    verifiedBadge: true,
    growthRateYoY: 28.5,
    architecturePattern: 'API寄生',
    pipelineStack: '自社決済API × 銀行網接続 × Stripe Radar',
    targetPainWallet: '開発者の怠惰（銀行との数ヶ月の契約審査・面倒な手続きの回避）',
    tags: ['API寄生', '自動天引き', '決済インフラ', 'B2B', 'ロックイン', '利益率40%超'],
    essence: {
      whatItDoes: '7行のコードでWebサイトに即時決済を組み込める開発者向け決済APIプラットフォーム',
      targetCustomer: 'スタートアップ創業者、Web開発者、グローバルSaaS事業者',
      painRelief: '旧態依然とした大手銀行・決済代行会社との数ヶ月に及ぶ対面審査・契約手続き',
    },
    pricing: {
      model: '決済取引ごとの従量課金テイクレート（自動天引き）',
      pricePoint: '取引金額の 2.9% + 30¢ / 件 (国内は3.6%)',
      psychologicalTrigger: '痛覚ゼロの天引き（「売上が上がった時だけ引かれる」ため、初期費用や固定費の苦痛がない）',
      estimatedLtvJpy: 45000000,
      churnRate: '1.2%/年 (ほぼ解約不能)',
    },
    acquisition: {
      cacJpy: 8000,
      primaryFunnel: '創業者直撃のゲリラ導入 ➔ コピー＆ペースト可能な最高峰APIドキュメント ➔ 開発者コミュニティでのバイラル',
      tactics: [
        '「Collison Installation」: その場で相手のPCを奪いコードを貼る',
        '世界で初めて「登録したその日にテスト決済が通る」開発者体験',
        'YC出身企業への標準インフラ指定',
      ],
    },
    pnl: {
      monthlyRevenue: 140000000000, // 月商約1,400億円 (年商約1.6兆円)
      cogs: 98000000000, // クレジットカードブランド (Visa/Master) へのインターチェンジフィー
      grossProfit: 42000000000,
      grossMargin: 30.0,
      operatingExpenses: {
        serverAndApi: 3500000000,
        advertising: 2800000000,
        subcontracting: 4200000000,
        toolsAndSaaS: 1400000000,
        other: 18000000000,
      },
      operatingProfit: 12100000000, // 営業利益 (約8.6%)
      operatingMargin: 8.6,
      estimatedAnnualNetProfit: 100000000000,
    },
    operations: {
      teamSize: 7000,
      weeklyHours: 45,
      initialCapitalRequired: 2000000,
      automationLevel: 94,
      primaryChannels: ['開発者口コミ（DevRel）', 'APIドキュメントSEO', 'プラットフォーム組み込み (Shopify等へのOEM)'],
      toolStack: [
        { name: 'Ruby on Rails + Sorbet (型安全巨大モノリス)', category: 'バックエンド', monthlyCost: 80000000, purpose: '全世界の秒間数万件の決済トランザクションを99.999%の可用性で処理', replacementDifficulty: 'HIGH' },
        { name: 'Stripe Radar (機械学習不正検知)', category: 'セキュリティ', monthlyCost: 40000000, purpose: '数億件のカード取引から不正利用をリアルタイム遮断', replacementDifficulty: 'HIGH' },
        { name: '自社分散元帳データベース', category: 'DBインフラ', monthlyCost: 60000000, purpose: '世界各国の通貨・法域にまたがる資金移動の一致性保証', replacementDifficulty: 'HIGH' },
      ],
    },
    strategy: {
      blindspot: '【「開発者なんて決済の決定権を持っていない」という既存金融の盲点】銀行は企業の財務部長にスーツを着て営業していたが、実際にコードを書く現場の開発者は「今夜決済を動かしたい」と切望していた。財務ではなく開発者を味方につけ、ボトムアップで企業の決済基盤を独占した。',
      moatType: 'SWITCHING_COST',
      moatDescription: '【企業の売上データと顧客クレジットカード情報の不可逆人質化】一度Stripeを組み込むと、数万人の顧客の定期課金トークンがStripe内に蓄積される。他社決済への移行は顧客全員にカード再登録を強いるためチャーンが爆発し、誰も解約できない。',
      incumbentDilemma: '既存の決済代行は「導入初期費用数十万円＋月額固定費＋紙の書類審査」で大儲けしていたため、Stripeのように「初期費用ゼロ・即時コード発行」にすると自社既存顧客の利益を丸ごと破壊することになり、真似できなかった。',
      secretInsight: '決済手数料（2.9%）の利益率は薄いが、蓄積された決済データを元に「Stripe Capital（売上データ連動の即日融資）」「Stripe Atlas（米法人設立 $500）」「Radar（不正防止追加課金）」などの高粗利金融サービスをクロスセルして荒稼ぎする。',
      initialTraction: [
        '「Collison Installation」: 開発者仲間と会ったその場で「ラップトップを貸してごらん」と言ってStripeのコードを組み込み即日動かした',
        'Y Combinatorの同期スタートアップへ片っ端から直接導入を依頼',
        '世界最高峰のAPIドキュメントを無償公開し、開発者の間でバイラルを起こした',
      ],
      actionPlaybook: [
        'Step 1: 既存の複雑な業界手続き（金融・法務・税務）をAPIとコード数行に圧縮する',
        'Step 2: 意思決定者ではなく、現場の実装者（開発者）に熱狂される無料ツール・ドキュメントを配る',
        'Step 3: 取引量に応じた従量課金（2.9% + 30¢）で、顧客の成長と自社の売上を完全に連動させる',
      ],
    },
    meta: {
      incumbentDilemma: {
        cannibalizationBarrier: '既存の大手決済代行・銀行は対面営業と紙の契約書による高額導入費・月額固定費ビジネスに依存しており、Web上で7行で即時導入できる無料APIへの移行が自壊を招くため不可能。',
        scaleMismatchReason: '創業初期の個人開発者や無名スタートアップという「月商数万円のスモール市場」は、大手金融機関の営業ノルマ上相手にできない。',
        decisionSpeedAdvantage: '「今夜プロダクトをローンチしたい」開発者に対し、即時アカウント発行・即時テスト環境提供というスピードで金融機関を無力化。',
      },
      pricingPower: {
        anchorComparison: '金融機関との数ヶ月の審査・契約交渉コストと、決済エンジニアの年収（数千万円）と比較させ、テイクレート2.9%+30¢を「最も安い初期投資」と認識させる。',
        lossAversionTrigger: '「決済が落ちて売上を逃す機会損失」「カード不正利用によるチャージバック損害」をRadar（AI不正検知）で防ぐ安心感。',
        budgetCategory: '売上からの天引き（自動控除）。顧客の銀行口座から請求書で支払わせるのではなく、取引時に抜くため支払い痛覚がゼロ。',
      },
      lockInMechanism: {
        dataHostage: '顧客企業の全決済履歴、クレジットカードトークン、サブスク契約情報がStripeインフラ内に蓄積され、他社移行には膨大なセキュリティ監査が必要。',
        workflowIntegration: '請求書発行、税計算（Stripe Tax）、不正検知、顧客ポータルまで業務全体がStripeエコシステムに深く依存。',
        switchingFriction: '決済基盤の乗り換えはコードの全面書き直しと顧客のカード再登録を伴い、チャーン（解約）が大量発生するため経営陣が拒絶する。',
      },
      capitalEfficiency: {
        cashConversionCycle: '取引成立の瞬間にテイクレートを自動天引きするため売掛金・未回収リスクが実質ゼロ。',
        incrementalMargin: 'ソフトウェアによる自動処理のため、決済取扱高が1兆円増えても追加の運用人件費はほぼゼロ（限界利益率90%超）。',
        workingCapitalStrategy: '顧客の売上成長に伴って自社の売上が自動増殖する「インターネット経済の通行税」モデル。',
      },
    },
    exposureAudit: {
      guerrillaTraction: '伝説の「Collison Installation」。YCの起業家仲間に「決済試してよ」と持ちかけ、相手が「後で試す」と返信した瞬間に「今ラップトップ貸して」とその場で相手のMacを開かせ、勝手に7行のコードを貼り付けて決済を即時開通させた強硬初期ゲリラ戦。',
      platformGlitch: '米国大手銀行の「加盟店審査に数ヶ月かける」官僚主義を逆手にハック。Stripe自身が銀行との包括リスクを肩代わりし、開発者には審査なしで即日テスト環境を解放。競合（PayPalやAuthorize.Net）を置き去りにした。',
      pivotSnapshot: '「/dev/payments」として開発者向けにひっそりリリース。銀行から「詐欺の温床になる」と拒絶され続けたが、YC同期スタートアップへ草の根浸透させ、彼らの事業成長に伴い決済通行税（2.9% + 30¢）が自動膨張。',
      hiddenStackCost: '決済API自体の粗利率は約30%（Visa/Masterや銀行への上納金が原価の大半）。決済は客を囲い込む撒き餌であり、Atlas（法人設立 $500）、Radar（不正検知）、Billing（定期課金手数料0.5%）など原価ゼロの付帯SaaSで純利を吸い上げる構造。',
    },
  },
  {
    id: 'ent_shipfast',
    ticker: 'SHIPFAST',
    name: 'ShipFast',
    legalEntity: 'Marc Lou Solo Ventures',
    tagline: '開発者が最も挫折するStripe決済・認証の配管を事前構築し、完全1人で累計25万ドル（約3,700万円・手残り約90%）を抜いたNext.jsボイラープレート',
    sector: 'NICHE_SAAS',
    scale: 'SOLO',
    founder: 'Marc Lou (@marc_louvion)',
    country: 'FR',
    url: 'https://shipfa.st',
    verifiedBadge: true,
    growthRateYoY: 340.0,
    architecturePattern: 'テンプレ直販・即断買い切り',
    pipelineStack: 'Next.js 14 × Stripe × NextAuth × Tailwind',
    targetPainWallet: '開発者の認知疲労（2〜4週間かかる決済・認証の配管挫折）',
    tags: ['完全1人', '買い切り型', '利益率90%超', '個人開発', 'SNSバイラル', '初期費用0円'],
    essence: {
      whatItDoes: 'SaaS開発に必要なNext.jsテンプレート・Stripe決済・認証・メール送信の事前統合コードベース販売',
      targetCustomer: '個人開発者、ソロプレナー、新規SaaSを素早く立ち上げたいエンジニア',
      painRelief: 'コア機能以外の「決済・ログイン・メール設定」に2〜4週間浪費してローンチ前に力尽きる苦痛',
    },
    pricing: {
      model: '一括買い切り（Lifetime License）',
      pricePoint: '$169〜$299（約2.5万〜4.5万円）',
      psychologicalTrigger: '損失回避と時間圧縮（「数週間の面倒な配管作業を2万円でスキップできる」という極限の怠惰肯定）',
      estimatedLtvJpy: 35000,
      churnRate: '0%（買い切りのため解約なし）',
    },
    acquisition: {
      cacJpy: 0,
      primaryFunnel: 'Xでの自虐・ローンチショート動画 ➔ 公式LP ➔ Stripe Checkout ➔ GitHubレポジトリ招待',
      tactics: [
        '自室で踊りながらプロダクトをローンチするユーモア動画',
        'Stripe売上ダッシュボードの完全リアルタイム公開（Build in Public）',
        '「Made with ShipFast」バッジによる購入者プロダクトからの二次流入',
      ],
    },
    pnl: {
      monthlyRevenue: 6000000, // 月商約600万円 ($40,000)
      cogs: 240000, // Stripe決済手数料 (2.9% + $0.30)
      grossProfit: 5760000,
      grossMargin: 96.0,
      operatingExpenses: {
        serverAndApi: 25000, // Vercel / ドメイン代
        advertising: 0,
        subcontracting: 0,
        toolsAndSaaS: 45000, // Resend, Supabase
        other: 80000,
      },
      operatingProfit: 5610000, // 実効手残り純利益 (約93%)
      operatingMargin: 93.5,
      estimatedAnnualNetProfit: 67000000, // 推定年商約7,000万円・純利約6,700万円
    },
    operations: {
      teamSize: 1,
      weeklyHours: 15,
      initialCapitalRequired: 5000, // ドメイン代のみ
      automationLevel: 98,
      primaryChannels: ['X (旧Twitter) オーガニック動画', 'Indie Hackers / Starter Story', '購入者フッター被リンク'],
      toolStack: [
        { name: 'Next.js 14 (App Router)', category: 'フレームワーク', monthlyCost: 0, purpose: 'コアプロダクト本体のコードベース', replacementDifficulty: 'HIGH', url: 'https://nextjs.org' },
        { name: 'Stripe', category: '決済', monthlyCost: 174000, purpose: 'グローバル即時決済とGitHub自動アクセス権付与', replacementDifficulty: 'HIGH', url: 'https://stripe.com' },
        { name: 'Vercel', category: 'ホスティング', monthlyCost: 3000, purpose: 'LPの高速配信とグローバルEdgeデプロイ', replacementDifficulty: 'LOW', url: 'https://vercel.com' },
        { name: 'Resend', category: 'メール配信', monthlyCost: 3000, purpose: '購入者への領収書とウェルカムメール自動配信', replacementDifficulty: 'LOW', url: 'https://resend.com' },
      ],
    },
    strategy: {
      blindspot: '【「誰もが作りたがるが、誰もが途中で挫折する」決済・認証の配管工事を売る】エンジニアは「素晴らしいアイデア」を形にしたいのであって、StripeのWebhookデバッグやNextAuthのOAuth設定を何日もやりたいわけではない。この「最も退屈で挫折率90%の初期配管」をパッケージ化し、即断即決価格で売り抜いた。',
      moatType: 'BRAND_PRESTIGE',
      moatDescription: '【Marc Lou個人のX求心力 ✕ 爆速出荷の象徴的ブランド】競合がどれだけコードを模倣しても、「Marc Louが実際に使って年商数千万円を叩き出している本物のコードベース」という文脈と信頼を奪えない。',
      incumbentDilemma: '大手プログラミングスクールや受託開発企業は、数十万円〜数百万円の契約を維持するために「開発の難しさ」を演出する必要があり、$199の買い切り即納テンプレを売ることは自らの高単価ビジネスを破壊する。',
      secretInsight: 'サブスクリプション（月額課金）にせず「買い切り」にしたことで、買い手の購入ハードルが極限まで下がり、リリース初速でバイラルが最大化した。さらに、一度買ったユーザーが自ら「ShipFastでリリースした」とXで宣伝してくれるため、広告費ゼロで永久に新規が流入する。',
      initialTraction: [
        '過去に作った数十個のボイラープレート用コードを1つに集約',
        'Xで「今夜新しいボイラープレートを出す」と予告ショート動画を投稿',
        'ローンチから数時間で数十本が売れ、その売上スクショを即時Build in public投稿して二次拡散',
      ],
      actionPlaybook: [
        'Step 1: 自分が普段SaaSを作る際に毎回書いている共通モジュール（認証・決済・メール・UI）を抽出する',
        'Step 2: 1行の設定変更で即座にStripeとSupabaseが繋がる極限まで抽象化したリポジトリを作る',
        'Step 3: X上で「これを使って週末でローンチした事例」を動画で見せ、買い切り型で即時現金化する',
      ],
    },
    meta: {
      incumbentDilemma: {
        cannibalizationBarrier: '大手開発受託企業は数百万円の工数請求が利益源であり、2万円の即納テンプレは自社売上を殺すため絶対に参入できない。',
        scaleMismatchReason: '個人向けデジタルテンプレート販売は、大企業にとっては市場規模が小さすぎて役員稟議が通らない。',
        decisionSpeedAdvantage: 'Next.jsの新機能（Server Actions等）が出た瞬間に1日でボイラープレートを改修・動画発信できる個人の即時性。',
      },
      pricingPower: {
        anchorComparison: '「受託開発の外注費（数十万〜数百万円）」や「エンジニアの人件費（月50万円）」と比較させることで、2.5万円の買い切りを「実質無料レベルの投資」と直感認知させる。',
        lossAversionTrigger: '「初期設定で2週間悩んでアイデアの熱が冷め、挫折する」という機会損失の恐怖。',
        budgetCategory: '個人の自己投資枠・起業初期準備金（クレジットカードで即決可能な枠）。',
      },
      lockInMechanism: {
        dataHostage: '購入したコードベース上で自社のSaaSプロダクトが本番稼働するため、他社テンプレに乗り換える動機がゼロになる。',
        workflowIntegration: 'Marc Louが配布する追加アップデートやコミュニティDiscordへのアクセス権。',
        switchingFriction: '一度使い慣れたNext.jsボイラープレートのディレクトリ構造が、その開発者のデフォルト開発環境になる。',
      },
      capitalEfficiency: {
        cashConversionCycle: '100%前金即時集金。商品原価ゼロのため、Stripe着金＝手元現金純利益。',
        incrementalMargin: '追加コピーの限界費用は完全ゼロ（99%）。',
        workingCapitalStrategy: '借金・資本調達ゼロ。完全自己資金0円から初月数万ドルを着金させ、その現金で生活・拡大。',
      },
    },
    exposureAudit: {
      guerrillaTraction: '広告宣伝費ゼロ。Marc Lou自身が自室でラフに撮ったダンス動画や制作タイムラプスをXへ連投。優等生的なプロモーションを焼き払い、「個人が本気で遊んで稼いでいる」リアリティを武器に初週で数万ドルを即時回収。',
      platformGlitch: 'Xのアルゴリズムが「動画付き・引用リツイート・Build in Public（生々しい売上数字の開示）」を異常なリーチで優遇する仕様をハック。他人のバズツイートのリプライ欄で的確な自虐動画を投下してトラフィックを強奪。',
      pivotSnapshot: '過去にHabit Tracker、Twitter分析ツールなど複数プロダクトを連続で爆死させていた。その際「毎回同じ認証と決済を書くのが嫌すぎる」という自身の強烈な不満をそのまま切り出して販売した特異点で突如大爆発。',
      hiddenStackCost: '月間サーバー代はVercelの$20プランのみ。メールはResend無料枠〜数ドル。Stripe決済手数料約2.9%以外の原価がほぼ存在せず、売上600万円に対して月間固定費は2万円以下。実効手残り率は93%超。',
    },
    // 【Layer 2: 動的特異点ブロック】
    dynamicMoats: {
      parasiteHost: {
        hostName: 'X (旧Twitter) & Next.jsエコシステム',
        detail: 'Next.jsとSaaS開発に関するX上の熱狂的な議論に自虐動画で寄生。個人開発者が「よしSaaSを作ろう」と思い立った最初の瞬間にタイムラインで直撃する。',
      },
      dataHostage: {
        lockInFactor: '本番稼働プロダクトのコアコード',
        detail: 'ShipFastを土台に本番SaaSをローンチした開発者は、基盤コードを置き換えることが実質不可能なため、2作目・3作目もShipFastを使い続ける。',
      },
      affiliateBribery: {
        commissionRate: '売上の25%アフィリエイト還元',
        detail: '購入した開発者が自身のXやブログで「ShipFastでローンチした」とレビューし、紹介リンク経由で毎月数百万円が自律的に売れ続ける共犯者配管。',
      },
      upfrontCash: {
        cashCycle: '100%買い切り前金総取り（$169〜$299）',
        detail: 'サブスクの解約リスクを排除し、購入時に全額前金回収。原価ゼロのため着金したキャッシュを即座に手残り現金としてプール。',
      },
      pivotGraveyard: {
        failedAttempts: ['Habit Trackerアプリ', 'Twitter分析ツール', 'Gamified Todoアプリ'],
        breakthroughSecret: '「自分が使うツール」を開発する過程で生じる最大のペイン（Stripe・OAuth設定の泥沼）そのものを商品化した瞬間に当たった。',
      },
    },
    // 【Layer 3: 万能救済ストリーム】
    observationsStream: [
      {
        category: 'SAVANNAH_PAIN',
        categoryLabel: 'サバンナOSの急所',
        text: '開発者はコア機能以外の「Stripe決済、NextAuth認証、DNSメール設定」に2〜4週間を浪費してローンチ前に力尽きる（損失回避・認知疲労）。ShipFastはこの即時苦痛切除で1秒即決させる。',
        originType: 'observed',
        verificationStatus: 'SUPPORTED',
      },
      {
        category: 'INCUMBENT_DILEMMA',
        categoryLabel: '大手の自爆',
        text: '大手受託開発会社やプログラミングスクールは、数百万円の開発受託や月額数十万円の学費モデルを自ら破壊（カニバリ）するため、$199の買い切りコードを絶対に販売できない。',
        originType: 'inferred',
        verificationStatus: 'SUPPORTED',
      },
      {
        category: 'FOUNDER_HACK',
        categoryLabel: '現場の泥臭い工夫',
        text: '初期の製品デモは完成品ではなく「キーボードを叩いてStripe決済が通るだけの10秒動画」をXに投稿して反響を検証。数時間で数百いいねがついたのを確認してから夜通しでコードを整えて即日発売した。',
        originType: 'reported',
        verificationStatus: 'SUPPORTED',
      },
      {
        category: 'TECH_VERIFICATION',
        categoryLabel: '技術スタック照合',
        text: 'フロントエンド: Next.js 14 (App Router) + Tailwind CSS + DaisyUI。認証: NextAuth.js。DB: MongoDB / Supabase。メール: Resend / Mailgun。決済: Stripe。月間固定費$150未満。',
        originType: 'observed',
        verificationStatus: 'SUPPORTED',
      },
      {
        category: 'RESEARCH_LIMIT',
        categoryLabel: '調査限界・非公開',
        text: 'Marc Lou個人の税引後銀行振込額およびStripe内部手数料明細は非公開。公知の売上実績、Stripe標準2.9%+$0.30、インフラ相場から純手残り92%と推計（Estimated）。',
        originType: 'estimated',
        verificationStatus: 'UNVERIFIED',
      },
    ],
    unknownsNotes: [
      'Marc Lou個人の税引後手残り現金実額はフランス/海外の税制上非公開。',
      '月ごとのStripeチャージバック・返金率の詳細は非公開（規約上デジタル製品のため返金拒否が基本）。',
    ],
  },
  {
    id: 'ent_photoai',
    ticker: 'PHOTOAI',
    name: 'Photo AI',
    legalEntity: 'Levels.io BV',
    tagline: 'プログラミング経験ゼロの学生でも真似できる、既存APIを3つ繋いだだけの自撮りツールで完全1人・月商1,800万円抜いた手口',
    sector: 'AI_AUTOMATION',
    scale: 'SOLO',
    founder: 'Pieter Levels (@levelsio)',
    country: 'NL',
    url: 'https://photoai.com',
    verifiedBadge: true,
    growthRateYoY: 185.0,
    architecturePattern: 'API包装',
    pipelineStack: 'Replicate API × Hetzner × Stripe',
    targetPainWallet: '個人の見栄（写真館スタジオの羞恥心・数万円回避）',
    tags: ['完全1人', 'API包装', '利益率80%超', '個人開発', 'SNSバイラル', '初期費用0円'],
    essence: {
      whatItDoes: '自撮り写真からスタジオ品質のプロ宣材写真を大量生成するAIスタジオ',
      targetCustomer: 'LinkedIn利用者、フリーランス、起業家、マッチングアプリ登録者',
      painRelief: '写真スタジオに行く羞恥心、予約の煩わしさ、数万円の撮影費用',
    },
    pricing: {
      model: '継続サブスクリプション（月額制）',
      pricePoint: '$29/月〜$99/月 (平均ARPU ¥4,350)',
      psychologicalTrigger: '虚栄心と社会的証明（「もっと優秀で魅力的に見られたい」承認欲求の即時充足）',
      estimatedLtvJpy: 18000,
      churnRate: '14.5%/月',
    },
    acquisition: {
      cacJpy: 0,
      primaryFunnel: 'X (旧Twitter) での生成結果ビフォーアフター投稿 ➔ プロフィールURL ➔ 無料サンプル生成 ➔ 有料サブスク化',
      tactics: [
        'Build in Publicによる開発過程と売上の常時発信',
        '著名人・インフルエンサーのポジティブな無断生成による引用拡散',
        '画像生成待ち時間にスタジオメイキング風アニメを表示し途中離脱を防止',
      ],
    },
    pnl: {
      monthlyRevenue: 18000000, // 月商1,800万円
      cogs: 2160000, // GPU・推論API費用 (Replicate/RunPod)
      grossProfit: 15840000,
      grossMargin: 88.0,
      operatingExpenses: {
        serverAndApi: 350000,
        advertising: 0, // X(Twitter)でのビルドインパブリックのみ
        subcontracting: 0, // 完全1人開発
        toolsAndSaaS: 220000,
        other: 150000,
      },
      operatingProfit: 15120000, // 営業利益
      operatingMargin: 84.0,
      estimatedAnnualNetProfit: 181440000, // 年間手残り約1.8億円
    },
    operations: {
      teamSize: 1,
      weeklyHours: 12,
      initialCapitalRequired: 30000,
      automationLevel: 98,
      primaryChannels: ['X (旧Twitter) Build in Public', 'TikTok/Instagramでの生成結果バイラル', 'Organic SEO'],
      toolStack: [
        { name: 'Replicate API (Stable Diffusion/Flux推論)', category: 'AIインフラ', monthlyCost: 1800000, purpose: 'サーバーレスで画像生成推論を実行し、待機コストを完全ゼロ化', replacementDifficulty: 'LOW', url: 'https://replicate.com' },
        { name: 'Hetzner Dedicated Server (Ubuntu+PHP+SQLite)', category: 'サーバー', monthlyCost: 15000, purpose: '月100万PVを単一サーバーで裁くミニマルな高負荷耐性Web基盤', replacementDifficulty: 'LOW', url: 'https://hetzner.com' },
        { name: 'Stripe Payments', category: '決済', monthlyCost: 520000, purpose: '世界150カ国からの月額サブスクリプション自動集金', replacementDifficulty: 'MEDIUM', url: 'https://stripe.com' },
        { name: 'Postmark (トランザクションメール)', category: 'メール配信', monthlyCost: 8000, purpose: '生成完了通知メールの高速・高到達率配信', replacementDifficulty: 'LOW', url: 'https://postmarkapp.com' },
      ],
    },
    strategy: {
      blindspot: '【写真館に行くのが恥ずかしい人間の「見栄とコンプレックス」の即時換金】写真スタジオでカメラマンにポーズを取らされる屈辱と数万円の出費を嫌う層に対し、「自撮り数枚をアップロードするだけで、スタジオ以上の美男美女ポートレートが1分で手に入る」免罪符を$29/月で売り抜け、原価数円のAPI呼び出しで利益率84%を抜き続ける。',
      moatType: 'COUNTER_POSITIONING',
      moatDescription: '【創業者のX数十万フォロワーによる「CAC（顧客獲得コスト）ゼロ」の価格破壊】大手が数千万円の広告費と開発費を投じる中、開発過程と売上スクショの投稿だけで毎日数千人の新規顧客が流入。広告費が永久に0円のため、競合が同じ機能を広告で集客しても赤字で自滅する。',
      incumbentDilemma: '既存の写真館やプロカメラマンはスタジオ家賃や機材代を抱えており、AI写真に対抗して1回数十円に価格破壊することは自殺行為であるため、参入できずに自滅を待つしかない。',
      secretInsight: '最大の離脱原因は「生成待ち時間（約40秒）」。ピーター氏は待ち画面に「カメラマンがシャッターを切っているような演出」を表示させ、体感時間を消去して離脱率を65%低減。またGPUは自社保有せずReplicateのサーバーレスAPIを使い、使った分だけ支払うことで固定費を徹底排除。',
      initialTraction: [
        'Stable Diffusionがオープンソース化された週に、自作スクリプトでアバター生成を開始',
        'X上で自分の写真をAI化して投稿し、反響を見てStripe決済リンクを即日設置',
        '初期購入者50人のフィードバックを元に、翌週にはセルフアップロードUIを実装して自動化',
      ],
      actionPlaybook: [
        'Step 1: 新しいAI基盤モデルが出たら、専門技術を一般人の虚栄心・実利（証明写真、アイコン）に変換する',
        'Step 2: 余計なフレームワークを使わず、最速で動くミニマムなスタックで決済導線を置く',
        'Step 3: 開発プロセスと売上数字をSNSでリアルタイム公開し、勝手に広告される状態を作る',
      ],
      coldOutreachTemplate: '【ポートレート写真のアップデートについて】突然のご連絡失礼します。貴殿のLinkedInプロフィール写真について、スタジオ撮影なしで3分でハリウッド級のライティングに補正するAIパイプラインを作成しました。サンプルを3枚無償生成しましたのでご確認ください。',
    },
    meta: {
      incumbentDilemma: {
        cannibalizationBarrier: 'Adobeや大手写真館はディープフェイクや肖像権訴訟のリスクを極度に恐れ、社内法務がグラビアや自撮り特化AIのリリースを100%通せない。',
        scaleMismatchReason: '年商2億円規模はAdobeにとって「稟議書の印刷代」以下であり、開発リソースを割り当てるインセンティブがゼロ。',
        decisionSpeedAdvantage: 'オープンソース（Stable Diffusion/FLUX）の進化を察知した当日にコードを書き、72時間で世界最速ローンチする個人開発者の圧倒的機動性。',
      },
      pricingPower: {
        anchorComparison: '「プロ写真館での撮影費用（3〜5万円＋予約・移動・ポーズをとる恥ずかしさ）」と比較させ、月額29ドル（約4,300円）を「10分の1以下の破格」と錯覚させて即決させる。',
        lossAversionTrigger: '「マッチングアプリやSNSでダサい写真を使って異性や取引先にナメられる」という現代人の見栄とコンプレックス。',
        budgetCategory: '個人の可処分所得・見栄の自己投資枠。少額サブスクのため解約忘れ（チャーン遅延）が自動発生。',
      },
      lockInMechanism: {
        dataHostage: 'ユーザーが自撮り30枚をアップロードして生成した「独自AI顔モデル（LoRA）」はPhoto AI内に閉じ込められており、他社へのエクスポート不可。',
        workflowIntegration: 'SNSアイコン、マッチングアプリ写真、ビジネス宣材写真の更新ルーティンとして定着。',
        switchingFriction: '他社に乗り換えるには再度大量の写真を集めてアップロードし、学習完了まで数十分待つ苦痛が発生するため離脱を躊躇する。',
      },
      capitalEfficiency: {
        cashConversionCycle: 'Stripe年払いで現金を即時一括回収し、Replicate/RunPodのGPU推論代は翌月末払い（CCCマイナス45日）。',
        incrementalMargin: '顧客が1人増えても増える原価は推論API代数十円のみ。粗利88%・営業利益率84%という驚異の現金化速度。',
        workingCapitalStrategy: '借金・VC調達完全ゼロ。PHP単一ファイル＋サーバーレス構成により、固定費月数万円で月1,500万円以上の純利を創業者個人口座に着金。',
      },
    },
    exposureAudit: {
      guerrillaTraction: '創業者がX（旧Twitter）上で自分自身をAIで美男美女化した画像を毎日大量投下し、著名インフルエンサーの顔写真をAI生成してメンション爆撃。さらにRedditのAIサブレディット（r/StableDiffusion等）に別アカウントで「このツールで作った」と自演投稿して初動トラフィックを強奪。',
      platformGlitch: 'AppleのApp StoreがAI生成画像の類似性審査でアプリを弾きまくっていた隙を突き、ネイティブアプリを完全無視。Webブラウザ完結のPWA型LPで展開し、審査待ち時間ゼロで日次デプロイ・即時課金を強行。',
      pivotSnapshot: '当初は「アバター生成（ゲーム風AI画像）」としてリリースしたが、客が1回で飽きることに直面。即座に「LinkedIn用・履歴書用のビジネス宣材写真」へオファーを絞り込み、写真館の1.5万円と恥ずかしさを嫌う層へ刺した瞬間に月商1,800万円を突破。',
      hiddenStackCost: '自社AIモデルはゼロ。裏側はオープンソースのStable Diffusion + Dreamboothを、Hetznerの月額格安GPUサーバー（月3万円程度）とReplicate API（従量課金）で回すだけのラッパー。月商1,800万円に対してサーバー原価は約250万円、従業員0人（完全1人）で粗利86%を達成。',
    },
    // 【Layer 2: 動的特異点ブロック】
    dynamicMoats: {
      parasiteHost: {
        hostName: 'Replicate API & Stable Diffusion',
        detail: '自社で高価なH100/A100 GPUクラスターを一切保有せず、ReplicateのAPIに推論処理を全量丸投げ。ユーザーが課金した時のみAPIを叩くため、待機固定費が完全ゼロ。',
      },
      dataHostage: {
        lockInFactor: 'ユーザーごとの学習済み微調整モデル（Lora）',
        detail: '一度自撮り写真をアップロードして自分の顔モデルを生成させると、そのモデルがサーバー上に残り続けるため、「別のポーズや服装」が欲しくなった際に他社へ乗り換えずにリピート課金する。',
      },
      upfrontCash: {
        cashCycle: 'サブスク前金回収（月額$29〜$99）',
        detail: '生成画像数に月間上限を設け、使わなかった枠は翌月に繰り越さないことで、限界原価ゼロのまま毎月一定額の現金が手元に残り続ける。',
      },
      pivotGraveyard: {
        failedAttempts: ['アバター生成アプリ', 'アニメ調アイコン生成', 'ゲームキャラAIジェネレーター'],
        breakthroughSecret: '「面白いだけのオモチャ画像」は1回で解約されるが、「LinkedInや履歴書で自分がカッコよく見える宣材写真」という社会的ステータス・見栄に特化した瞬間にLTVが跳ね上がった。',
      },
    },
    // 【Layer 3: 万能救済ストリーム】
    observationsStream: [
      {
        category: 'SAVANNAH_PAIN',
        categoryLabel: 'サバンナOSの急所',
        text: '人間が写真スタジオに行く最大の障壁は「カメラマンの前でポーズを取る羞恥心」と「数万円の出費」である。自撮り3枚を自室でアップロードするだけでプロ級の宣材が手に入る体験は、虚栄心と怠惰の急所を直撃する。',
        originType: 'observed',
        verificationStatus: 'SUPPORTED',
      },
      {
        category: 'INCUMBENT_DILEMMA',
        categoryLabel: '大手の自爆',
        text: '老舗写真館や商業撮影スタジオは、スタジオ家賃とプロカメラマンの人件費を抱えているため、1回数十円のAI価格破壊に追随することは自社売上の自爆を意味する。指をくわえてシェアを奪われるしかない。',
        originType: 'inferred',
        verificationStatus: 'SUPPORTED',
      },
      {
        category: 'FOUNDER_HACK',
        categoryLabel: '現場の泥臭い工夫',
        text: '生成待ち時間（約40秒）の離脱を防ぐため、「カメラマンがファインダーを覗いてシャッターを切るようなアニメーション演出」をCSSだけで実装。体感時間を錯覚させて離脱率を65%低減させた。',
        originType: 'reported',
        verificationStatus: 'SUPPORTED',
      },
      {
        category: 'TECH_VERIFICATION',
        categoryLabel: '技術スタック照合',
        text: '最新のモダンフレームワークを使わず、PHP単一ファイル + SQLite + Hetznerの月額格安Linuxサーバーで運用。複雑なNode/K8s基盤を完全排除した外科医的ミニマリズム。',
        originType: 'observed',
        verificationStatus: 'SUPPORTED',
      },
      {
        category: 'RESEARCH_LIMIT',
        categoryLabel: '調査限界・非公開',
        text: 'Replicate APIの月間請求書の内訳（GPU秒単位の課金ログ）は非公開。Pieter Levelsが公開した月商ダッシュボードおよび推論単価相場から手残り率84%と算出。',
        originType: 'estimated',
        verificationStatus: 'UNVERIFIED',
      },
    ],
    unknownsNotes: [
      'オランダLevels.io BVの法人税引後手残り個人の私的資産額は非公開。',
      '月間解約率（Churn）は公称約14.5%だが、新規流入数がそれを上回り続けている。',
    ],
  },
  {
    id: 'ent_nomadlist',
    ticker: 'NOMADLIST',
    name: 'Nomad List',
    legalEntity: 'Levels.io BV',
    tagline: '世界中の都市の物価・Wi-Fi速度・気候データをクローリングし、デジタルノマドの孤立と見栄をコミュニティに監禁して完全1人で月商350万円抜く手口',
    sector: 'CONTENT_MEDIA',
    scale: 'SOLO',
    founder: 'Pieter Levels (@levelsio)',
    country: 'NL',
    url: 'https://nomadlist.com',
    verifiedBadge: true,
    growthRateYoY: 25.0,
    architecturePattern: 'DB関所・ライフタイム囲い込み',
    pipelineStack: 'PHP × SQLite × Hetzner × Stripe',
    targetPainWallet: 'デジタルノマドの孤独（現地コミュニティ難民）と情報収集コスト',
    tags: ['完全1人', 'データベース型', 'コミュニティ監禁', '買い切り型', '初期費用0円'],
    essence: {
      whatItDoes: '全世界数千都市の生活コスト・インターネット速度・治安・気候データベースおよびノマド交流プラットフォーム',
      targetCustomer: 'リモートワーカー、フリーランス、世界を旅しながら働くデジタルノマド',
      painRelief: '「現地に着いたらWi-Fiが遅くて仕事にならない」「治安が悪くて危険」という渡航失敗の恐怖と、旅先での孤独',
    },
    pricing: {
      model: 'ライフタイム買い切り（Lifetime Membership）',
      pricePoint: '$99〜$299（時期により変動）',
      psychologicalTrigger: '社会的所属欲求（「世界中の優秀なノマドと繋がっている」序列感と排除恐怖の回避）',
      estimatedLtvJpy: 30000,
      churnRate: '0%（ライフタイム課金）',
    },
    acquisition: {
      cacJpy: 0,
      primaryFunnel: '「Best places to live for digital nomads」等でのGoogle SEO上位独占 ➔ 都市ランキング閲覧 ➔ Slack/Discord参加での課金ゲートウェイ',
      tactics: [
        '全都市の数値をプログラマティックSEOで自動数万ページ展開',
        'Xでのリアルタイム都市ランキングや移住トレンドの自動bot発信',
        'メンバー限定Slack/Discordの口コミ拡散',
      ],
    },
    pnl: {
      monthlyRevenue: 3800000, // 月商約380万円 ($25k)
      cogs: 120000, // Stripe決済手数料 (2.9% + $0.30)
      grossProfit: 3680000,
      grossMargin: 96.8,
      operatingExpenses: {
        serverAndApi: 30000, // Hetzner月額サーバー代
        advertising: 0,
        subcontracting: 0,
        toolsAndSaaS: 20000,
        other: 50000,
      },
      operatingProfit: 3580000, // 実効手残り純利益 (約94%)
      operatingMargin: 94.2,
      estimatedAnnualNetProfit: 43000000, // 推定年間純利約4,300万円
    },
    operations: {
      teamSize: 1,
      weeklyHours: 8,
      initialCapitalRequired: 0,
      automationLevel: 99,
      primaryChannels: ['Programmatic SEO (数万都市ページ)', 'X (旧Twitter) オーガニック発信', 'コミュニティ口コミ'],
      toolStack: [
        { name: 'PHP + Vanilla JS (No Framework)', category: '基幹', monthlyCost: 0, purpose: '依存関係ゼロの高速Webレンダリング', replacementDifficulty: 'HIGH', url: 'https://php.net' },
        { name: 'SQLite', category: 'DB', monthlyCost: 0, purpose: '超軽量・高耐久な単一ファイルデータベース', replacementDifficulty: 'HIGH', url: 'https://sqlite.org' },
        { name: 'Hetzner Dedicated Server', category: 'サーバー', monthlyCost: 15000, purpose: '月数百万人規模のアクセスを1台で捌くドイツ格安物理サーバー', replacementDifficulty: 'LOW', url: 'https://hetzner.com' },
        { name: 'Stripe', category: '決済', monthlyCost: 110000, purpose: '世界中からのライフタイム会費自動集金', replacementDifficulty: 'HIGH', url: 'https://stripe.com' },
      ],
    },
    strategy: {
      blindspot: '【「情報はネット上に散らばっているが、誰も一覧化していない」都市データを1つのスプレッドシートに束ねた】世界中の生活費やWi-Fi情報はブログに散在していたが、比較不能だった。これを1枚の公開スプレッドシートから始め、ランキング化してトラフィックを独占した。',
      moatType: 'NETWORK_EFFECT',
      moatDescription: '【10年かけて蓄積された都市口コミデータ ✕ 3万人超のノマド有料会員網】競合がスクレイピングで都市データを盗んでも、会員同士の交流ログ・現地ミートアップ・治安レビューの生身のネットワーク効果は模倣できない。',
      incumbentDilemma: 'Lonely PlanetやTripadvisorなどの旅行大手は「短期観光客向けホテル・ツアー広告」がビジネスモデルの柱であり、数ヶ月滞在するノマド向けの月額家賃やWi-Fi速度に特化することは自社収益と競合する。',
      secretInsight: '最初はGoogle Docsのスプレッドシートを公開しただけで、コードすら書いていなかった。バズってから夜通しでHTML化し、有料コミュニティ（Slack）を付けた瞬間にキャッシュマシン化。',
      initialTraction: [
        'Twitterで「デジタルノマドに最適な都市ランキング」のGoogleスプレッドシートを共有',
        'Product Huntで1位を獲得し、初日で数万PVを獲得',
        'Slackへの招待を有料化（$5 ➔ $10 ➔ $99と値上げ）して即座に課金検証完了',
      ],
      actionPlaybook: [
        'Step 1: 特定のライフスタイル層が欲しがる「分散した数値データ」を1つのスプレッドシートにまとめる',
        'Step 2: プログラマティックSEOで都市名・国名の個別ページを数千ページ自動生成して検索をジャックする',
        'Step 3: 閲覧は一部無料で見せ、コミュニティ参加と詳細データフィルターを有料ライフタイム課金にする',
      ],
    },
    meta: {
      incumbentDilemma: {
        cannibalizationBarrier: '旅行代理店・Booking.comはホテル仲介手数料が利益源であり、安宿やコワーキングの口コミを前面に出すことは手数料単価を下げるため手を出せない。',
        scaleMismatchReason: 'ノマド市場は大手にはニッチすぎて社内稟議が通らない。',
        decisionSpeedAdvantage: 'Pieter Levelsがタイやバリのカフェから即日コードをプッシュする1人開発の速度。',
      },
      pricingPower: {
        anchorComparison: '「海外移住で治安の悪い部屋を借りて数ヶ月分の家賃をドブに捨てる損失（数十万円）」と比較させることで、$99〜$299の会員費を安い保険と認識させる。',
        lossAversionTrigger: '異国の地で孤立する恐怖、ネット環境の悪い部屋を引いて仕事が止まる損失。',
        budgetCategory: '海外渡航準備費用・自己投資枠。',
      },
      lockInMechanism: {
        dataHostage: '自分の旅行履歴、訪れた都市のログ、コミュニティ内の評判スコア。',
        workflowIntegration: '都市を移動するたびにNomad Listを開いて次の目的地を決める習慣。',
        switchingFriction: '同種の競合コミュニティに他のノマド仲間がいないため、他へ移る理由がない。',
      },
      capitalEfficiency: {
        cashConversionCycle: '100%前金買い切り。在庫原価ゼロ。',
        incrementalMargin: 'ユーザーが1人増えても増えるサーバー代はほぼゼロ（99%）。',
        workingCapitalStrategy: '創業から現在まで外部調達ゼロ。得た利益を次のプロダクト（Photo AI等）の初期実験費に再投資。',
      },
    },
    exposureAudit: {
      guerrillaTraction: '初期はRedditのr/digitalnomadに自作スプレッドシートを投稿し、現地の生々しいWi-Fi実測値を募ってコミュニティと共創。批判的なコメントにも自虐ユーモアで返しファン化。',
      platformGlitch: 'Googleのアルゴリズムが「数値データが多く、更新頻度が高い都市比較テーブル」を地域検索で最上位に固定する癖を突き、数千都市のプログラマティックSEOで検索結果を独占。',
      pivotSnapshot: '当初は単なる都市一覧表だったが、ユーザー同士が「いまバンコクにいる人いる？」と尋ね始めたのを見て即座に有料Slackを設立。無料メディアから有料コミュニティへ舵を切ったことで永続キャッシュフローが確立。',
      hiddenStackCost: '月商350万円に対して月間インフラ費用はHetzner物理サーバー1台の約1.5万円のみ。Stripe手数料約11万円を引いた後の手残り現金は約340万円（実効手残り率約94%）。',
    },
    // 【Layer 2: 動的特異点ブロック】
    dynamicMoats: {
      parasiteHost: {
        hostName: 'Google Search & Digital Nomadトレンド',
        detail: '「Cost of living in [City]」「Best places for remote workers」という世界中のロングテール検索ワードを数千の自動生成ページで独占。Googleの検索流入を無料で全量横取りする。',
      },
      dataHostage: {
        lockInFactor: '世界中のノマド3万人による現地口コミ＆コミュニティ履歴',
        detail: '会員が投稿したコワーキングWi-Fi実測値や治安情報が独占資産化。新規参入者がサイトを真似しても、この10年分のリアルタイム現地情報は再現不能。',
      },
      upfrontCash: {
        cashCycle: 'ライフタイム一括前払い（$99〜$299）',
        detail: '月額サブスクの解約防止に悩むのをやめ、入会時に一生分の前金を回収。原価ゼロのため現金が常に先行して銀行口座にプールされる。',
      },
      pivotGraveyard: {
        failedAttempts: ['Tubalr (YouTube音楽プレイリスト)', 'Go Fucking Do It (罰金制タスク管理)'],
        breakthroughSecret: '自らがノマドとして世界を放浪する中で感じた「次の街のWi-Fiと治安が分からない」という切実なペインを1枚の表にした瞬間に世界規模で当たった。',
      },
    },
    // 【Layer 3: 万能救済ストリーム】
    observationsStream: [
      {
        category: 'SAVANNAH_PAIN',
        categoryLabel: 'サバンナOSの急所',
        text: '異国の地で一人取り残される「孤立恐怖（社会的排除の痛み）」と「詐欺物件を引く損失」を人質にする。会員限定チャットに入れる権利と確実な現地データで即決させる。',
        originType: 'observed',
        verificationStatus: 'SUPPORTED',
      },
      {
        category: 'FOUNDER_HACK',
        categoryLabel: '現場の泥臭い工夫',
        text: '初期はAPIやクローラーを使わず、Pieter自身がTripAdvisorやWikipedia、Speedtestの数字を手作業でGoogle Docsにコピペして数十都市の表を埋めた。',
        originType: 'reported',
        verificationStatus: 'SUPPORTED',
      },
      {
        category: 'TECH_VERIFICATION',
        categoryLabel: '技術スタック照合',
        text: 'フロント・バックエンド共に純粋なPHPとVanilla JS。ビルドステップやWebpackは一切なし。サーバー上でファイルを直接編集して保存するだけで即本番反映。',
        originType: 'observed',
        verificationStatus: 'SUPPORTED',
      },
      {
        category: 'RESEARCH_LIMIT',
        categoryLabel: '調査限界・非公開',
        text: 'オランダ法人の決算書原本および個人の私的銀行口座引き出し額は非公開。公開ダッシュボードとStripe 2.9%+$0.30、Hetzner実費から月間手残り推計 $22,872〜$25,913 を算出。',
        originType: 'estimated',
        verificationStatus: 'UNVERIFIED',
      },
    ],
    unknownsNotes: [
      'ライフタイム会員の長期アクティブ率（登録後1年以上経過したユーザーのログイン頻度）は非公開。',
    ],
  },
  {
    id: 'ent_plausible',
    ticker: 'PLAUSIBLE',
    name: 'Plausible Analytics',
    legalEntity: 'Plausible Insights OÜ',
    tagline: 'Google AnalyticsのUI複雑怪奇さとGDPRプライバシー違反への憎悪を突き、オープンソース2人体制で月商1,100万円・利益率90%抜く手口',
    sector: 'NICHE_SAAS',
    scale: 'SMALL_TEAM',
    founder: 'Marko Saric & Uku Taht',
    country: 'EE',
    url: 'https://plausible.io',
    verifiedBadge: true,
    growthRateYoY: 85.0,
    architecturePattern: 'アンチGoogle・反逆ブランディング',
    pipelineStack: 'Elixir × ClickHouse × Tailwind × Stripe',
    targetPainWallet: '企業の法務・Web担当者（クッキー同意バナーとGoogle Analyticsの複雑怪奇さ）',
    tags: ['少人数精鋭', 'B2B SaaS', 'プライバシー特化', 'アンチ巨人', '利益率80%超'],
    essence: {
      whatItDoes: 'Cookie不要・GDPR完全準拠・1画面で直感理解できる超軽量Webアクセス解析SaaS',
      targetCustomer: 'プライバシーを重視する欧州/グローバル企業、開発者、ミニマリストWebマスター',
      painRelief: 'Google Analytics (GA4) の使いにくさ、サイトを重くするCookie同意バナー、欧州データ保護法（GDPR）違反の罰金恐怖',
    },
    pricing: {
      model: '月額/年額従量サブスクリプション（月間PV課金）',
      pricePoint: '$9/月〜$169/月（PV数に応じて拡張）',
      psychologicalTrigger: '恐怖切除と認知負荷ゼロ（「Cookieバナーを消せて違法リスクがゼロになる」法令遵守と美しさ）',
      estimatedLtvJpy: 85000,
      churnRate: '2.8%/月',
    },
    acquisition: {
      cacJpy: 0,
      primaryFunnel: '「Why you should remove Google Analytics」等の辛口ブログSEO ➔ Hacker News / Reddit ➔ 30日間無料体験 ➔ Stripe課金',
      tactics: [
        'Googleのプライバシー侵害とGA4の使いにくさを徹底的に批判する辛口ブログ記事',
        'オープンソース版（セルフホスト）をGitHubで無料配布し、エンジニア層の信頼とスターを獲得',
        '「広告追跡ゼロ」という倫理的ブランディングによる口コミ拡散',
      ],
    },
    pnl: {
      monthlyRevenue: 11000000, // 月商約1,100万円 ($75,000)
      cogs: 440000, // Stripe決済手数料 (2.9% + $0.30)
      grossProfit: 10560000,
      grossMargin: 96.0,
      operatingExpenses: {
        serverAndApi: 600000, // ClickHouse / Hetznerサーバー代
        advertising: 0,
        subcontracting: 0,
        toolsAndSaaS: 150000,
        other: 350000,
      },
      operatingProfit: 9460000, // 営業利益 (約86%)
      operatingMargin: 86.0,
      estimatedAnnualNetProfit: 113000000, // 推定年商約1.3億円・純利約1.1億円
    },
    operations: {
      teamSize: 2,
      weeklyHours: 35,
      initialCapitalRequired: 100000,
      automationLevel: 95,
      primaryChannels: ['辛口オピニオンSEOブログ', 'Hacker News / Reddit', 'GitHubオープンソースコミュニティ'],
      toolStack: [
        { name: 'Elixir / Phoenix', category: 'バックエンド', monthlyCost: 0, purpose: '数千万件のトラッキングリクエストを低メモリで裁く高並行言語', replacementDifficulty: 'HIGH', url: 'https://elixir-lang.org' },
        { name: 'ClickHouse', category: '列指向DB', monthlyCost: 150000, purpose: '数十億件のイベント集計をミリ秒で応答する高速分析データベース', replacementDifficulty: 'HIGH', url: 'https://clickhouse.com' },
        { name: 'Hetzner Cloud', category: 'インフラ', monthlyCost: 450000, purpose: 'EU国内データセンターによるGDPR完全準拠ホスティング', replacementDifficulty: 'LOW', url: 'https://hetzner.com' },
        { name: 'Stripe', category: '決済', monthlyCost: 320000, purpose: '月額/年額SaaSサブスクリプション自動集金', replacementDifficulty: 'HIGH', url: 'https://stripe.com' },
      ],
    },
    strategy: {
      blindspot: '【Googleが強大すぎて誰もが諦めていた「アクセス解析」に、巨人への憎悪を燃料にして風穴を開けた】GA4は多機能すぎて一般企業の99%には使いこなせない。さらに欧州では違法判決が相次いでいた。「Cookie不要・1ページで完結・GDPR完全準拠」という真逆の旗を掲げることで、巨人の弱点（肥大化とプライバシー侵害）をそのまま最大の武器に変えた。',
      moatType: 'COUNTER_POSITIONING',
      moatDescription: '【オープンソース ✕ 脱Cookieの倫理的ポジショニング】Googleは自社の広告帝国を守るためにCookieや個人追跡を捨てられない。Plausibleは最初から広告追跡を完全放棄しているため、Googleがどれだけ技術投資してもPlausibleと同じ「プライバシー完全保護」を名乗ることは構造上不可能。',
      incumbentDilemma: 'Googleは自社が世界最大の広告配信プラットフォームであるため、広告ターゲティングを排除した「真にプライバシーを守る解析ツール」を作ることができない（自爆ジレンマ）。',
      secretInsight: '営業マンゼロ、広告費ゼロ。Marko氏が書く「Googleの傲慢さとGA4のバグを暴くブログ記事」が毎月Hacker Newsのトップに上がり、怒ったエンジニアや法務担当者が自発的に導入する「反逆の共犯者ループ」を完成させた。',
      initialTraction: [
        'Uku氏が個人で開発したプロトタイプをHacker Newsに投稿し、初期ベータユーザーを募集',
        'Marko氏がマーケターとして合流し、「脱Google」を掲げたオピニオン記事を量産',
        '欧州の各データ保護当局が「GAはGDPR違反」との見解を出すたびに比較記事を即日公開し波に乗る',
      ],
      actionPlaybook: [
        'Step 1: 誰もが使っている業界標準（Googleなど）の「最もユーザーが苛立っている弱点」を特定する',
        'Step 2: 余計な機能を90%捨て、「1つの急所（例: Cookie不要・直感UI）」だけに研ぎ澄ました代替を作る',
        'Step 3: 巨人の倫理的欠陥を突くオピニオンを発信し、巨人に不満を持つアーリーアダプターを熱狂させる',
      ],
    },
    meta: {
      incumbentDilemma: {
        cannibalizationBarrier: 'Googleは年間数兆円の広告ビジネスが本業であり、ユーザー追跡を捨てたアクセス解析を出すと主業の広告精度が崩壊するため絶対に参入できない。',
        scaleMismatchReason: '月額数百円〜数千円のプライバシー解析SaaSは、Googleの企業規模から見ると事業価値が小さすぎる。',
        decisionSpeedAdvantage: 'GDPR判決や新法規制が出たその日のうちにブログ記事を出し、新機能を追加できる小回りの利く2名体制。',
      },
      pricingPower: {
        anchorComparison: '「Cookie同意バナーによるサイト訪問者の離脱（売上数%の損失）」や「GDPR違反による最大2,000万ユーロの罰金」と比較させ、月額数千円を「極めて安い保険」として買わせる。',
        lossAversionTrigger: 'プライバシー法違反による罰金・ブランド毀損恐怖、サイト速度低下の防止。',
        budgetCategory: 'Webサイト管理費・法務コンプライアンス枠。',
      },
      lockInMechanism: {
        dataHostage: '自社サイトの過去数年分のアクセス推移データ。',
        workflowIntegration: '全社ダッシュボードや経営陣への月次報告リンクとして埋め込み。',
        switchingFriction: 'サイトのHTMLヘッダーに埋め込まれたスクリプトタグの差し替えコスト。',
      },
      capitalEfficiency: {
        cashConversionCycle: '年払い（2ヶ月無料）を推進し、年間利用料を前金一括回収。',
        incrementalMargin: 'ClickHouseの高い圧縮効率により、データ量増加に対するサーバーコスト上昇が緩やか（粗利95%超）。',
        workingCapitalStrategy: '完全ブートストラップ（自己資金のみ）。初期から黒字化させ、外部VC資金ゼロで年商1.3億円を突破。',
      },
    },
    exposureAudit: {
      guerrillaTraction: 'Hacker Newsで「I built a lightweight alternative to Google Analytics」と開発動機を淡々と投稿し、コミュニティの熱狂を獲得。プロダクトをオープンソース化し、GitHubスターを集めてSEOドメイン評価を急上昇させた。',
      platformGlitch: '欧州のGDPR（一般データ保護規則）厳罰化の波を完璧にハック。Google Analyticsがオーストリアやフランスの当局から違法と判断された瞬間、比較記事と移行ツールを即時公開してトラフィックを大量強奪。',
      pivotSnapshot: '当初は認知度が低く売上が伸び悩んだが、「脱Google / プライバシー至上主義」という強烈な反逆ナラティブを前面に押し出したことで、世界中のプライバシー意識の高いギーク・テック企業が熱烈な信者化した。',
      hiddenStackCost: '月商1,100万円に対して主要原価はHetznerインフラ代約60万円とStripe手数料約44万円。創業者2名体制（従業員ゼロ）のため、実効手残り率は約86%（月間純利益約940万円）。',
    },
    // 【Layer 2: 動的特異点ブロック】
    dynamicMoats: {
      parasiteHost: {
        hostName: 'Google Analyticsの巨大なユーザー基盤',
        detail: '「GA4の管理画面が意味不明で使えない」「EUのGDPR違反が怖い」というGoogle Analytics利用者の強烈な不満に寄生。不満を抱えたユーザーを丸ごと拾い上げる。',
      },
      dataHostage: {
        lockInFactor: '蓄積された年次アクセス統計データ',
        detail: '自社Webサイトの推移グラフがPlausible内に蓄積されるため、他社ツールへ乗り換えると過去の推移比較が断絶するスイッチングコスト。',
      },
      upfrontCash: {
        cashCycle: '年払い一括前金制度（2ヶ月分割引）',
        detail: '利用者の多くが年払いで1年分を一括前払いするため、現金が常に先行して銀行にプールされ、キャッシュフロー破綻確率が完全ゼロ。',
      },
      pivotGraveyard: {
        failedAttempts: ['個人ブログ立ち上げ', '一般的なWebコンサルティング業務'],
        breakthroughSecret: '「自分たちが本当に使いたい、シンプルで嘘のないツール」をオープンソースで公開し、Googleへの反逆を掲げた瞬間にコミュニティが味方についた。',
      },
    },
    // 【Layer 3: 万能救済ストリーム】
    observationsStream: [
      {
        category: 'SAVANNAH_PAIN',
        categoryLabel: 'サバンナOSの急所',
        text: 'Cookie同意バナーは訪問者の体験を台無しにし、離脱率を高める。Plausibleは「Cookieバナーを完全に消去できる」という強烈な解放感（苦痛の切除）を提供する。',
        originType: 'observed',
        verificationStatus: 'SUPPORTED',
      },
      {
        category: 'INCUMBENT_DILEMMA',
        categoryLabel: '大手の自爆',
        text: 'Googleは世界最大の広告会社であるため、広告追跡（クッキー）を捨てた解析ツールを自ら出すことは自社売上を殺す自殺行為である。Plausibleの土俵には構造上降りてこれない。',
        originType: 'inferred',
        verificationStatus: 'SUPPORTED',
      },
      {
        category: 'FOUNDER_HACK',
        categoryLabel: '現場の泥臭い工夫',
        text: '広告費を1円も使わず、Googleの不透明なデータ収集やGA4の使いにくさを冷徹に検証・批判する長文ブログをMarko氏が執筆。記事がバズるたびに数千社が流入するメディア化戦略。',
        originType: 'reported',
        verificationStatus: 'SUPPORTED',
      },
      {
        category: 'TECH_VERIFICATION',
        categoryLabel: '技術スタック照合',
        text: '毎秒数万件のトラフィックを少人数で捌くため、Elixir (Phoenix) と列指向データベースClickHouseを採用。Postgres等と比べてサーバー代を10分の1に圧縮。',
        originType: 'observed',
        verificationStatus: 'SUPPORTED',
      },
      {
        category: 'RESEARCH_LIMIT',
        categoryLabel: '調査限界・非公開',
        text: 'エストニア法人Plausible Insights OÜの給与および税引後手残り配当額は非公開。公知の月商$75k、Stripe手数料2.9%+$0.30、インフラ相場から純手残り推計 約$66,566〜$74,930 を算出。',
        originType: 'estimated',
        verificationStatus: 'UNVERIFIED',
      },
    ],
    unknownsNotes: [
      'オープンソース版（Self-hosted）を無料利用しているユーザーの実数・エンタープライズ移行率は非公開。',
    ],
  },
  {
    id: 'ent_headshotpro',
    ticker: 'HEADSHOT',
    name: 'HeadshotPro',
    legalEntity: 'Postma Innovations B.V.',
    tagline: 'リモート企業の人事の見栄と経費を狙い、比較ブロガーに売上の30%をバラまいて完全1人で月商4,500万円抜く手口',
    sector: 'AI_AUTOMATION',
    scale: 'SOLO',
    founder: 'Danny Postma',
    country: 'NL',
    url: 'https://www.headshotpro.com',
    verifiedBadge: true,
    growthRateYoY: 120.0,
    architecturePattern: '30%紹介網',
    pipelineStack: 'Stable Diffusion × Stripe × 成果報酬アフィリエイト',
    targetPainWallet: 'リモート企業人事（退職・採用時の顔写真更新コスト）',
    tags: ['完全1人', '30%紹介網', 'B2B', 'AI写真', '個人開発', 'リモート人事'],
    essence: {
      whatItDoes: 'リモート企業向けチーム全員の統一宣材顔写真AI生成プラットフォーム',
      targetCustomer: 'リモートワーク企業のHR/人事担当者、役員、マーケティング責任者',
      painRelief: '世界中に散らばる社員の顔写真の画質・背景のバラつきによるコーポレートイメージの毀損',
    },
    pricing: {
      model: 'チーム一括パック課金 ＋ 個人単発・サブスク',
      pricePoint: 'チーム1パック $399〜$1,999 (個人は$39〜)',
      psychologicalTrigger: '社内政治と正当化（「会社の公式ブランディング」という名目で個人のポケットではなく会社の経費で即決）',
      estimatedLtvJpy: 85000,
      churnRate: '8.2%/月',
    },
    acquisition: {
      cacJpy: 12000,
      primaryFunnel: '30%成果報酬アフィリエイターの比較記事 ➔ B2B専用LP ➔ 会社メールでの一括生成見積もり',
      tactics: [
        '「AI Headshot おすすめ」上位全メディアへの30%永久報酬提供',
        '職種×業界のプログラマティックSEOページ数万件の量産',
        '人事向け「社内稟議用スライド資料」のワンクリックダウンロード',
      ],
    },
    pnl: {
      monthlyRevenue: 45000000, // 月商4,500万円 (年商約5.4億円)
      cogs: 9000000, // GPU学習・推論コスト (約20%)
      grossProfit: 36000000,
      grossMargin: 80.0,
      operatingExpenses: {
        serverAndApi: 600000,
        advertising: 13500000, // 売上の30%をアフィリエイターへ報酬還元
        subcontracting: 400000, // カスタマーサポート外注
        toolsAndSaaS: 500000,
        other: 200000,
      },
      operatingProfit: 20800000, // 営業利益
      operatingMargin: 46.2,
      estimatedAnnualNetProfit: 249600000, // 年間純利約2.5億円
    },
    operations: {
      teamSize: 1,
      weeklyHours: 15,
      initialCapitalRequired: 50000,
      automationLevel: 96,
      primaryChannels: ['高額成果報酬アフィリエイト網 (30% Lifetime)', 'プログラマティックSEO (地域×職種×顔写真)', 'B2Bチーム一括導入'],
      toolStack: [
        { name: 'RunPod / Replicate (カスタムLoRA学習)', category: 'GPU推論', monthlyCost: 8500000, purpose: '人物ごとにLoRAモデルを高速学習し高精度顔写真を自動レンダリング', replacementDifficulty: 'MEDIUM' },
        { name: 'Rewardful (アフィリエイトトラッキング)', category: '営業', monthlyCost: 150000, purpose: '世界中のテックブロガーへの30%成果報酬自動計算・送金', replacementDifficulty: 'LOW' },
        { name: 'Vercel + Next.js', category: 'ホスティング', monthlyCost: 60000, purpose: 'グローバル高速CDNでのB2B向け超高速ランディングページ運用', replacementDifficulty: 'LOW' },
      ],
    },
    strategy: {
      blindspot: '【リモート企業の人事が抱える「社員の顔写真がバラバラで見栄えが悪い」社内政治の歪み】世界中に散らばるリモート社員をスタジオに集めるのは物理的に不可能。個人なら$20で躊躇するAI顔写真を、「会社の統一ブランディング」という大義名分で経理に1チーム$500〜$2,000のコーポレートカード決済を瞬時に切らせる。',
      moatType: 'NETWORK_EFFECT',
      moatDescription: '【検索1位〜10位の比較記事を「30%永久キックバック」で完全カルテル化】「AI Headshot おすすめ」でヒットする有力アフィリエイター全員に売上の30%を生涯還元。競合が自前でSEO記事を書いても、すでに全アフィリエイターがHeadshotProを1位に推す経済的共犯関係が完成しており、検索流入を物理的に奪えない。',
      incumbentDilemma: '個人向けAI写真ツールは単価$20前後で激しい価格競争に巻き込まれているが、HeadshotProは「B2B向け・請求書払い対応・チーム一括管理」に振り切ることで、同じ推論モデルを使いながら5〜20倍の客単価を抜いている。',
      secretInsight: '競合が「個人」を集客しようとTikTokで踊っている間に、米国の有力テックメディアや「リモートワークおすすめツール」を執筆するアフィリエイターに直接DMを送り、業界最高峰の生涯マージン（30%）を提示。検索上位の全レビュー記事を自社推しで独占し、後発参入者のSEO流入を構造的に塞いだ。',
      initialTraction: [
        'Redditのr/RemoteWorkやLinkedInで、チーム写真のバラつきに悩む人事マネージャーへ直接アプローチ',
        '最初の10社に無料でお試し導入させ、BEFORE/AFTERの許可を得て事例LPを作成',
        'Rewardfulを導入し、テック系インフルエンサーに個別DMで特別35%マージンを提示してレビューを依頼',
      ],
      actionPlaybook: [
        'Step 1: 個人向けで流行ったAI機能を「法人・人事向け（企業の統一道具）」へリパッケージする',
        'Step 2: 広告費を自前で溶かさず、業界最大級のアフィリエイト還元率を設定して軍隊に売らせる',
        'Step 3: チーム単位（10人〜100人）の一括決済プランを用意し、客単価を10倍に引き上げる',
      ],
    },
    meta: {
      incumbentDilemma: {
        cannibalizationBarrier: '大手写真館や派遣フォトグラファー仲介会社は提携カメラマンの手前、自らAI写真に参入すると既存ビジネスを破壊するため参入不能。',
        scaleMismatchReason: '法人B2B向けのヘッドショット特化という狭いバーティカルは、大手総合求人ポータルやSaaS企業にはニッチすぎて投資対効果が合わない。',
        decisionSpeedAdvantage: '比較記事アフィリエイターへの30%キックバックカルテルを即断即決し、SEO上位を独占。',
      },
      pricingPower: {
        anchorComparison: '全社員の出社・スタジオ撮影日程調整（人事の数百時間の工数＋撮影費用数十万円）と比較させ、1人3,000円〜で完了する法人プランを「人事の神ツール」として決済させる。',
        lossAversionTrigger: 'WebサイトやLinkedInで社員の顔写真のトーンがバラバラで「会社が胡散臭く見える」というブランディングの信用毀損恐怖。',
        budgetCategory: '企業の人事・採用・総務経費枠。会社のコーポレートカードで一括決済されるため価格感応度が極めて低い。',
      },
      lockInMechanism: {
        dataHostage: '企業ごとの写真レタッチ基準・背景色プリセット・承認フローがシステム内に保存。',
        workflowIntegration: '新入社員が入社した際、Slack招待と同時に「HeadshotProでアイコン写真を生成する」という入社オンボーディング規定に組み込まれる。',
        switchingFriction: '全社員のアイコンのトーン＆マナーを統一しているため、他社ツールへ乗り換えると全員の写真を撮り直す必要が生じる。',
      },
      capitalEfficiency: {
        cashConversionCycle: '成果報酬型アフィリエイトのため、売上が発生した時のみ費用が発生。事前の広告宣伝費リスクがゼロ。',
        incrementalMargin: '法人一括購入（50人〜200人枠）の前払いにより、売上が一気に数十万〜数百万円単位でキャッシュイン。粗利率70%。',
        workingCapitalStrategy: 'リモートチーム3名のみで年商5.4億円を運用。利益率46%の超高効率キャッシュフロー。',
      },
    },
    exposureAudit: {
      guerrillaTraction: '自作のAIヘッドショットをLinkedInに投稿し、リモートワークで社員写真がバラバラな企業の経営者へ直接コールドメッセージ。さらに「AI headshot」関連のSEOキーワードを網羅したLPをプログラマティックSEOで数百ページ量産し、初期からGoogle検索トラフィックを面で制圧。',
      platformGlitch: '競合が個人向け（B2C）で買い切り1回数千円の価格消耗戦をしていた隙を突き、「企業向けチーム一括パック（1人$39〜、10人で$390）」を最速で投入。会社のコーポレートカード（経費枠）を使わせることで、個人の財布の躊躇を完全無効化。',
      pivotSnapshot: '当初は個人向けのペットAI写真ツールなどを乱発していたが、B2CのChurnの高さとクレーマー対応で疲弊。B2Bチームプランに全リソースを集中した瞬間に、クレーム激減・一括前金入金で月商3,800万円に急拡大。',
      hiddenStackCost: 'インフラはReplicate + AstriaのAPIをRESTで叩くだけ。画像生成の原価は1人あたり約$3〜$5程度で、販売価格$39に対して原価率10〜13%。チームは創業者と数名のフィリピン人サポート外注のみで粗利率70%を維持。',
    },
  },
  {
    id: 'ent_tldr',
    ticker: 'TLDR',
    name: 'TLDR Newsletter',
    legalEntity: 'TLDR, LLC',
    tagline: '独自取材ゼロで他人の無料ニュースを数行要約しただけのメールを700万人に流し、広告枠を秒速完売させて年商15億円抜く手口',
    sector: 'CONTENT_MEDIA',
    scale: 'SMALL_TEAM',
    founder: 'Dan Ni',
    country: 'US',
    url: 'https://tldr.tech',
    verifiedBadge: true,
    growthRateYoY: 65.0,
    architecturePattern: '要約メディア',
    pipelineStack: 'Beehiiv × ニュース要約 × 直販スポンサー枠',
    targetPainWallet: 'テック企業の宣伝費（700万人エンジニア露出の独占）',
    tags: ['要約メディア', '広告モデル', 'キュレーション', '少数精鋭', '利益率60%超', 'B2B'],
    essence: {
      whatItDoes: 'テック・AI・開発の最重要ニュースを毎朝5分で読める日刊キュレーションメール',
      targetCustomer: 'ソフトウェアエンジニア、CTO、テック系投資家（全世界700万人）',
      painRelief: '毎日膨大に流れてくるテック情報のキャッチアップ疲れと知的好奇心のFOMO（取り残され恐怖）',
    },
    pricing: {
      model: 'スポンサー広告枠販売（日刊メール内の固定ヘッダー・本文枠）',
      pricePoint: '1日あたり $15,000〜$30,000 (¥220万〜¥450万/枠)',
      psychologicalTrigger: '広告主の切迫感（「高給エンジニアの目に触れる唯一の場所」という希少性と即完売による獲得競争）',
      estimatedLtvJpy: 12000000,
      churnRate: 'スポンサーリピート率 78%',
    },
    acquisition: {
      cacJpy: 180,
      primaryFunnel: 'Meta/Redditでのエンジニア特化ターゲティング広告 ➔ 1クリック登録 ➔ 翌朝から高密度レター配信',
      tactics: [
        '登録フォームに名前・電話番号を一切求めずメアド1行のみにする極限の認知負荷ゼロ',
        'テックギークが好む装飾ゼロのテキストメール形式',
        '読者紹介プログラムによる自走バイラル',
      ],
    },
    pnl: {
      monthlyRevenue: 125000000, // 月商1億2,500万円 (年商約15億円)
      cogs: 2500000, // メール配信原価 (AWS SES)
      grossProfit: 122500000,
      grossMargin: 98.0,
      operatingExpenses: {
        serverAndApi: 1500000,
        advertising: 28000000, // 新規読者獲得広告 (Meta/Twitter)
        subcontracting: 8000000, // キュレーター・ライター外注費 (6名)
        toolsAndSaaS: 1000000,
        other: 5000000,
      },
      operatingProfit: 84000000, // 営業利益 (手残り月8,400万円)
      operatingMargin: 67.2,
      estimatedAnnualNetProfit: 1008000000, // 年間純利約10億円
    },
    operations: {
      teamSize: 6,
      weeklyHours: 20,
      initialCapitalRequired: 100000,
      automationLevel: 85,
      primaryChannels: ['Meta/Reddit広告（エンジニア属性特化）', '読者による同僚への転送・口コミ', 'WebアーカイブSEO'],
      toolStack: [
        { name: 'AWS Simple Email Service (SES)', category: '配信インフラ', monthlyCost: 2000000, purpose: '月間1億通以上のメールをスパム判定されずに低価格で大量配信', replacementDifficulty: 'MEDIUM' },
        { name: '内製CMS・キュレーション自動化ボット', category: '執筆基盤', monthlyCost: 300000, purpose: 'HackerNewsやTwitterのバズ記事を自動スクレイピング・要約', replacementDifficulty: 'HIGH' },
        { name: 'Stripe Invoicing', category: '請求決済', monthlyCost: 400000, purpose: 'スポンサー企業への全額前払いインボイス自動発行', replacementDifficulty: 'LOW' },
      ],
    },
    strategy: {
      blindspot: '【「メールは時代遅れ」とテック業界全体が軽視していた隙を突いた超高密度配信】スパムだらけのSNSフィードに疲弊したエンジニアは、「毎朝メールボックスに届く数行の要約」だけを欲していた。アプリ開発もウェブデザインも捨て、プレーンテキストメール1本に絞り込むことで、開発費ゼロのまま700万人の優良読者を囲い込んだ。',
      moatType: 'SCALE_ECONOMIES',
      moatDescription: '【エンジニア700万人の開封実績による「広告枠の3ヶ月先まで全額前払い即完売」ループ】Google、AWS、Supabase等の大手テックが枠を奪い合い、1枠数百万円が即時完売。広告主の支払いで新規読者広告を回すキャッシュフロー無限機関が完成しており、後発メディアが追いつけない。',
      incumbentDilemma: '大手メディア（TechCrunchや日経等）は記者の人件費と過剰なWebサイト広告枠を抱えており、プレーンテキストメール1通で月1億円以上を稼ぐ身軽なモデルへ移行すると既存のWeb広告収入モデルを全否定することになる。',
      secretInsight: '広告主（B2B SaaSや採用企業）にはWeb決済ではなく専用の予約カレンダーを使わせ、「来月の枠は残り2枠」と煽ることで3ヶ月先まで枠を全額前払いで抑えさせる。未回収リスクゼロ、かつ翌月以降の売上が確定した状態で超安定稼働。',
      initialTraction: [
        'HackerNewsやRedditの技術サブミットで、役立つニュースまとめを手動投稿して信頼を獲得',
        '自作の超シンプルなLP（メアド入力枠1つのみ）で最初の1,000人を広告費ゼロで集約',
        '読者数が1万人に達した段階で、知人のテックSaaS創業社へ「1回$250」でテスト広告を販売',
      ],
      actionPlaybook: [
        'Step 1: ターゲットを「可処分所得の高い層（エンジニア、金融）」に絞ったテーマを設定する',
        'Step 2: 余計なデザインを一切施さず、プレーンテキストの要約メールを毎日欠かさず配信する',
        'Step 3: 読者数5万人を超えたらB2B向けに枠を販売し、その利益をすべて読者獲得広告へ再投資する',
      ],
      coldOutreachTemplate: '【貴社エンジニア採用/SaaSのプロモーションについて】TLDR発行人のDanです。現在、シニアエンジニア・CTOを含む約700万人が購読しております。来月、開発者向け枠に1枠のみ空きが出ましたので、貴社プロダクトのご案内をお送りできます。ご興味ございますでしょうか？',
    },
    meta: {
      incumbentDilemma: {
        cannibalizationBarrier: 'TechCrunchやWIRED等の大手ITメディアは記者数十人を抱え、長文記事とPVバナー広告に依存。エンジニアが好む「要点短文ダイジェスト」を配信すると自社PVが激減するため真似できない。',
        scaleMismatchReason: 'メールマガジンという古典的メディアは、VCが出資するような「次世代テックプラットフォーム」の文脈に乗らず大手メディア企業が軽視。',
        decisionSpeedAdvantage: 'アルゴリズム変動に左右されないメール受信トレイ（インボックス）をいち早く占有し、毎日休まず配信する継続性。',
      },
      pricingPower: {
        anchorComparison: 'エンジニア1名採用に200〜300万円払っている大手テック企業の採用費と比較させ、700万人の開発者に一斉リーチできる広告枠を1枠100万円超で即決販売。',
        lossAversionTrigger: '「自社のSaaSや求人が競合に埋もれて技術者に認知されない」というエンジニア採用難の恐怖。',
        budgetCategory: 'テック企業・VC出資スタートアップの採用広報・B2Bマーケティング予算（数千万円枠）。',
      },
      lockInMechanism: {
        dataHostage: '過去のスポンサー企業のCTR・開封率データ、および700万人の読者セグメントリスト。',
        workflowIntegration: '世界中のテック系ビジネスパーソンの「朝一番のニュースチェック」という日常の生活習慣（Habit）に完全に同化。',
        switchingFriction: 'メールボックスの朝のルーティンは可処分時間が限られており、一度定着した購読習慣は他メディアに奪われにくい。',
      },
      capitalEfficiency: {
        cashConversionCycle: 'スポンサー料はすべて「前払い一括請求」。未回収リスクゼロで現金を先取り。',
        incrementalMargin: '読者が100万人から700万人に増えても、メール配信インフラ費が微増するだけでコンテンツ制作費は一定（限界利益率80%超）。',
        workingCapitalStrategy: 'オフィスゼロ、記者数名のみで年商15億円・純利益10億円（利益率67.2%）を達成する究極のメディアキャッシュマシーン。',
      },
    },
    exposureAudit: {
      guerrillaTraction: 'Redditのテック系サブレディット（r/programming, r/webdev等）の毎日のトップ投稿を手動要約し、Reddit内のコメント欄に「毎朝こういうまとめを配信してる」と地道にリンクを貼って初期数千人の購読者を自力で獲得。',
      platformGlitch: '各SNS（X, LinkedIn, Reddit）が「外部リンク付き投稿の露出を冷遇するアルゴリズム」にシフトした隙を突き、プラットフォームの外部誘導規制を受けない「Eメール（ニュースレター）」に全読者資産を退避・監禁。',
      pivotSnapshot: '当初はソフトウェアエンジニア向けの短いまとめ1本からスタート。購読者が10万人を超えた段階で「AI版」「Crypto版」「WebDev版」と同一フォーマットでスピンオフを乱発し、広告主へのバンドル販売で広告単価を急伸させた。',
      hiddenStackCost: '配信インフラはBeehiiv / AWS SES。原価はサーバー代月数十万円と要約ライターの外注費のみ。1枠450万円のスポンサー枠が半年先まで埋まっており、月商4,500万円・営業利益率80%のキャッシュマシーン。',
    },
  },
  {
    id: 'ent_easlo',
    ticker: 'EASLO',
    name: 'Easlo (Notion OS)',
    legalEntity: 'Easlo Studio',
    tagline: '20歳の学生がNotionのテンプレを無料配布してXで拡散させ、一切働かずに年商1.1億円を完全自動で着金させている手口',
    sector: 'NICHE_SAAS',
    scale: 'SOLO',
    founder: 'Easlo (22歳)',
    country: 'SG',
    url: 'https://easlo.co',
    verifiedBadge: true,
    growthRateYoY: 85.0,
    architecturePattern: 'テンプレ販売',
    pipelineStack: 'Notion × Gumroad × X (Twitter)',
    targetPainWallet: 'Notion挫折組（多機能すぎて組めない時間の買い取り）',
    tags: ['完全1人', 'テンプレ販売', 'Notion', '初期費用0円', '利益率90%超', '個人開発'],
    essence: {
      whatItDoes: '個人・フリーランス向けのNotion業務管理テンプレート＆ダッシュボード販売',
      targetCustomer: '生産性を上げたいナレッジワーカー、フリーランス、起業家、学生',
      painRelief: 'Notionの空白画面から自前で美しいタスク管理・家計簿を組む膨大な時間と労力',
    },
    pricing: {
      model: 'デジタルアセット買い切り ＋ テンプレートバンドル',
      pricePoint: '$29〜$129 (平均単価 ¥6,500)',
      psychologicalTrigger: '損失回避と自己投資（「これさえ買えば自分の乱れた人生・仕事が一瞬で整う」という幻想の購入）',
      estimatedLtvJpy: 9500,
      churnRate: '買い切りのためチャーンなし（クロスセル率 22%）',
    },
    acquisition: {
      cacJpy: 0,
      primaryFunnel: 'Xでの「Notion便利ワザ」図解GIF投稿 ➔ Gumroad無料テンプレート配布でメアド取得 ➔ 有料完全版のステップメール誘導',
      tactics: [
        '黒と白のミニマルデザインに統一したブランディング',
        'Product Huntでの週間1位ローンチ',
        'TikTokでのNotionショート動画の大量投下',
      ],
    },
    pnl: {
      monthlyRevenue: 9500000, // 月商950万円
      cogs: 0, // 原価ゼロ (Notion上で複製するだけ)
      grossProfit: 9500000,
      grossMargin: 100.0,
      operatingExpenses: {
        serverAndApi: 0,
        advertising: 0, // SNSオーガニックのみ
        subcontracting: 0,
        toolsAndSaaS: 80000, // Gumroad手数料, ConvertKit
        other: 50000,
      },
      operatingProfit: 9370000, // 営業利益 (純手残り月937万円)
      operatingMargin: 98.6,
      estimatedAnnualNetProfit: 112440000, // 年間純利約1.1億円
    },
    operations: {
      teamSize: 1,
      weeklyHours: 5,
      initialCapitalRequired: 0,
      automationLevel: 99,
      primaryChannels: ['X (旧Twitter) での図解・GIF投稿', 'Product Hunt ローンチ', 'Notion公式ギャラリー掲載'],
      toolStack: [
        { name: 'Gumroad / Stripe', category: '販売プラットフォーム', monthlyCost: 50000, purpose: '世界中からのデジタルファイル即時ダウンロード販売と決済', replacementDifficulty: 'LOW', url: 'https://gumroad.com' },
        { name: 'ConvertKit', category: 'メール配信', monthlyCost: 25000, purpose: '無料配布で集めた30万人のメアドへの自動ステップセールス', replacementDifficulty: 'LOW', url: 'https://convertkit.com' },
        { name: 'Notion', category: '制作基盤', monthlyCost: 2000, purpose: '商品自体の制作および複製テンプレートホスティング', replacementDifficulty: 'HIGH', url: 'https://notion.so' },
      ],
    },
    strategy: {
      blindspot: '【「Notionは多機能すぎて使いこなせない」という世界中の初心者の挫折を即座に現金化】Notion社が無料で提供しているツールに対し、「最初から全部組まれている美しいダッシュボード」を$49〜$129で販売。客はソフトウェアを買っているのではなく、「整理された生活という安心感」を買っている。',
      moatType: 'BRAND_PRESTIGE',
      moatDescription: '【「NotionといえばEaslo」という第一想起の独占と30万人のメール購読者網】Xフォロワー40万人、メルマガ30万人を保有。新テンプレートを1つ作ってツイートとメルマガを送るだけで、初日数百万円が無原価で着金する無敵の直販チャネルを占有。',
      incumbentDilemma: '総合SaaS企業（AsanaやMonday等）は数千円の月額課金と開発保守が必要だが、EasloはNotionという他人のプラットフォームに寄生しているため、サーバー費・バグ修正・インフラ費が文字通り「完全0円」で利益率98.6%を維持。',
      secretInsight: '無料版テンプレートを「あえて1つだけ必須機能が欠けた状態」でGumroadに配り、数十万人のメアドリストを構築。新学期や年末年始の「今年こそは自分を変えたい」心理が高まるタイミングで一斉配信し、数日で数百万円の売上を無原価で叩き出す。',
      initialTraction: [
        '毎日Notionの使い方を図解GIFにしてTwitterに連続投稿',
        '最初の無料テンプレート「Bullet Journal」を無料配布し、2週間で1万人のメールアドレスを獲得',
        'メールリストに対して有料の「Second Brain」テンプレートを先行案内し、公開初日で$10,000を売り上げ',
      ],
      actionPlaybook: [
        'Step 1: 伸びている既存プラットフォーム（Notion、Figma、Shopify等）のテンプレ需要を探す',
        'Step 2: 無料の最小限テンプレートを配布してメルマガ読者を数十万人集める',
        'Step 3: 上位互換のオールインワンパックを有料化し、完全自動ステップメールで売り続ける',
      ],
    },
    meta: {
      incumbentDilemma: {
        cannibalizationBarrier: '大手SaaSやコンサルティング会社は人件費が高すぎて、1本数千円のNotionテンプレート販売というミクロビジネスには物理的に参入できない。',
        scaleMismatchReason: '個人向けの生産性テンプレート市場は、企業が組織的に取り組むには小さすぎて稟議が一瞬で却下される。',
        decisionSpeedAdvantage: 'Notionの新機能アップデートやXのトレンドに合わせて、数時間でテンプレートを作成・公開できる個人の身軽さ。',
      },
      pricingPower: {
        anchorComparison: 'AsanaやJira等のプロジェクト管理ツールの月額サブスク（年間数十万円）と比較させ、一生使える買い切り数千円〜2万円を「圧倒的コスパ」と錯覚させる。',
        lossAversionTrigger: '「タスクや目標管理が散乱して時間を浪費している」という自己管理への焦燥感と罪悪感。',
        budgetCategory: '個人の自己啓発・スキルアップ・仕事効率化の自己投資枠。',
      },
      lockInMechanism: {
        dataHostage: '日々のタスク、読書記録、個人プロジェクト、財務ログがNotion内に蓄積され、他テンプレートへの乗り換えコストが莫大化。',
        workflowIntegration: 'PCを開いた時のブラウザ初期画面（ダッシュボード）として毎日閲覧・更新される生活基盤。',
        switchingFriction: '過去数ヶ月〜数年分の個人データを移し替える作業が面倒すぎて、一度設定したら永久に使い続ける。',
      },
      capitalEfficiency: {
        cashConversionCycle: 'Gumroad経由で即時決済・即時入金。売掛金・在庫・原価が物理的に完全ゼロ。',
        incrementalMargin: 'デジタルファイルのダウンロード販売のため、1個売れても1万個売れても追加コストゼロ（限界利益率99%超）。',
        workingCapitalStrategy: '初期資本ゼロ、完全1人、月間ツール費数千円。月商950万円に対して月純利937万円（純利益率98.6%）の極限形。',
      },
    },
    exposureAudit: {
      guerrillaTraction: 'Twitter（現X）でNotionのショートカット術や整理動画を毎日3本投稿。Notionの操作に困っているユーザーのリプライを見つけては、無料テンプレートを直接リプ欄に差し出して初動ファン5万人を囲い込み。',
      platformGlitch: 'Notion公式が「自由度が高すぎて、初心者が白紙の画面を見て挫折する」という構造的欠陥をハック。公式がカバーできない「学生用ダッシュボード」「個人家計簿」など生活密着型テンプレを先回りして量産。',
      pivotSnapshot: '当初はGumroadで完全無料配布。客が自発的に$5〜$10のチップを払う現象に気づき有料化。バンドル（全テンプレまとめ売りパック $129）を投入した瞬間に年商1億円を突破。',
      hiddenStackCost: '決済はGumroad、商品はNotionの「複製リンク」を送るだけ。仕入れ原価0円、サーバー原価0円、配送費0円。粗利率98%で、売上のほぼ全額が創業者の手元口座へ直下。',
    },
  },
  {
    id: 'ent_clay_aaa',
    ticker: 'CLAYAAA',
    name: 'Clay×AI アウトバウンド営業代行',
    legalEntity: 'Apex Outbound Partners',
    tagline: '資金調達直後で金銭感覚が麻痺したSaaSの焦りを突き、AIスクレイピングでアポを流し込んで月商800万・純利65%抜く手口',
    sector: 'AI_AUTOMATION',
    scale: 'SMALL_TEAM',
    founder: 'Alex R.',
    country: 'US',
    url: 'https://apexoutbound.example.com',
    verifiedBadge: true,
    growthRateYoY: 310.0,
    architecturePattern: 'AI営業代行',
    pipelineStack: 'Clay × Make × OpenAI API × Smartlead',
    targetPainWallet: 'VC調達直後SaaS（新規商談枯渇の焦燥・営業人件費）',
    tags: ['AI営業代行', '成果報酬', 'B2B', '少数精鋭', 'スクレイピング', '高粗利'],
    essence: {
      whatItDoes: 'シリーズA調達直後のSaaSに特化した、AI個別最適化コールドメール営業代行',
      targetCustomer: 'VC調達直後のSaaS企業CEO、CRO、営業管轄役員',
      painRelief: '自社SDR（インサイドセールス）の採用コスト・教育期間と、アポが取れない恐怖',
    },
    pricing: {
      model: '完全成果報酬（商談成立1件あたり5万円〜8万円）＋月額運用基本料',
      pricePoint: '月額固定20万円 ＋ アポ1件6万円 (月平均商談20件 = ¥140万円/社)',
      psychologicalTrigger: '後ろめたさの解消とノーリスク（「アポが出なければ0円」という役員が社内稟議を通しやすい免罪符）',
      estimatedLtvJpy: 8400000,
      churnRate: '5.0%/月',
    },
    acquisition: {
      cacJpy: 25000,
      primaryFunnel: 'Crunchbase調達発表アラート ➔ 調達翌日にCEOへ超個別化コールドメール送信 ➔ 初回3商談無料テストで成約',
      tactics: [
        '相手企業のPodcast出演・求人票から「現在抱える課題」をLLMで自動抽出して文面に挿入',
        '月5万通送っても迷惑メールに入らない温め済みセカンダリドメイン100個のローテーション',
        '「断る理由がないノーリスク提案」の設計',
      ],
    },
    pnl: {
      monthlyRevenue: 8000000,
      cogs: 800000, // プロキシ・メールアカウント購入・スクレイピング原価
      grossProfit: 7200000,
      grossMargin: 90.0,
      operatingExpenses: {
        serverAndApi: 350000,
        advertising: 0,
        subcontracting: 1200000, // フィリピンのデータクレンジング作業員
        toolsAndSaaS: 450000,
        other: 0,
      },
      operatingProfit: 5200000,
      operatingMargin: 65.0,
      estimatedAnnualNetProfit: 62400000,
    },
    operations: {
      teamSize: 3,
      weeklyHours: 25,
      initialCapitalRequired: 200000,
      automationLevel: 92,
      primaryChannels: ['CrunchbaseのSeries A調達企業への自動検知DM', '成果報酬（アポ獲得1件5万円）でのノーリスク提案'],
      toolStack: [
        { name: 'Clay.com (データエンリッチメント & ウォーターフォール)', category: '営業データ', monthlyCost: 180000, purpose: '75以上のデータソースから企業の採用状況・使用技術・役員情報を自動結合', replacementDifficulty: 'HIGH', url: 'https://clay.com' },
        { name: 'Smartlead.ai (大量ドメインコールドメール自動送信)', category: '送信インフラ', monthlyCost: 80000, purpose: '分散された100個のドメインから受信トレイ直行で自動送信・返信検知', replacementDifficulty: 'MEDIUM', url: 'https://smartlead.ai' },
        { name: 'OpenAI GPT-4o API (超個別化メール文面自動生成)', category: 'AI生成', monthlyCost: 90000, purpose: '相手の直近の投稿や採用課題にピンポイントで言及する文面をミリ秒生成', replacementDifficulty: 'LOW', url: 'https://openai.com' },
      ],
    },
    strategy: {
      blindspot: '【VC調達SaaSの「CAC（顧客獲得単価）の金銭感覚麻痺」と採用遅延の焦りを狙い撃ち】自社営業マンを採用すると1人年商800万円＋育成に半年かかる。VCからの成長圧力に怯える経営陣に対し、「初期費用ゼロ・1アポ5万円の完全成果報酬」で提案。他人の調達マネーから月500万円以上の純利をリスクゼロで吸い上げる。',
      moatType: 'COUNTER_POSITIONING',
      moatDescription: '【送信ドメインのブラックリスト登録（スパム判定）を回避する分散配信網と、競合が持たない独自差分DB】文面生成自体は誰でも真似できるが、月5万通送信してもGmailに弾かれない「温め済み分散ドメイン100個のローテーション網」と「特定SaaSのTechStack独自スクレイピング差分」を占有。後発が真似するとドメインが一瞬でブラックリスト入りして自滅する。',
      incumbentDilemma: '従来の大手営業代行会社（テレアポ部隊）は大量の人件費と固定給を抱えており、1通ずつリサーチして送るAIメール代行をやると自社のコールセンター人員の稼働率が落ちて赤字になる。',
      secretInsight: '顧客企業には「最先端AIが貴社専用にリサーチして執筆」と説明しつつ、裏側ではフィリピンの優秀な作業員（時給$5）がClayの抽出データを目視ダブルチェック。AIの嘘（ハルシネーション）を完全に防ぎ、返信率15%超を維持して月500万円以上の純利を確定させている。',
      initialTraction: [
        'Crunchbaseで先週調達を発表した企業をリストアップ',
        'CEOの直近のPodcast出演発言を文字起こしし、その発言に言及した超個別化メールをテスト送信（返信率18%）',
        '「最初の3アポは無料、満足したら1件5万円の成果報酬契約」で成約率90%を記録',
      ],
      actionPlaybook: [
        'Step 1: ClayとSmartleadを契約し、セカンダリドメイン50個を購入してSPF/DKIMを設定（ウォームアップ）',
        'Step 2: 資金調達直後で金が余っており売上を急拡大させたい企業を自動トリガーで検知する',
        'Step 3: 相手の痛みに直撃する提案をAIでパーソナライズし、アポ単価5〜8万円の成果報酬で固定契約を結ぶ',
      ],
      coldOutreachTemplate: '【貴社のSeries A調達と営業チーム拡大について】〇〇様、先日の調達おめでとうございます。急拡大フェーズで直面する「SDR採用コストと立ち上がり遅延」を回避するため、来月貴社のカレンダーに商談を15件流し込みます。アポが成立しなかった場合は費用ゼロです。水曜14時にお話し可能でしょうか？',
    },
    meta: {
      incumbentDilemma: {
        cannibalizationBarrier: '既存の営業代行会社（テレアポ部隊数十人）は固定人件費を抱えており、「AIで月1万件のパーソナライズメールを自動送信する」モデルに転換すると自社社員が全員不要になり倒産するため参入不能。',
        scaleMismatchReason: 'ClayやInstantlyを組み合わせた最新のAIオートメーションは現場のエンジニアリング力が必要であり、旧態依然としたコールセンター型企業には技術がない。',
        decisionSpeedAdvantage: '顧客の商談アポを最短3日で獲得開始する圧倒的なセットアップスピード。',
      },
      pricingPower: {
        anchorComparison: '営業マン1人を正社員採用するコスト（年収600万円＋社保＋求人媒体費）と比較させ、「初期構築費50万円＋月額30万円＋成果報酬」を「営業1人雇うより遥かに安く大量のアポが獲れる」と即断させる。',
        lossAversionTrigger: '「競合に先を越されてパイを奪われる」「営業パイプラインが枯渇して今期の売上目標に未達になる」経営者の焦燥感。',
        budgetCategory: '企業の営業・マーケティング投資枠（正社員採用枠の代替）。',
      },
      lockInMechanism: {
        dataHostage: '自社向けに最適化されたターゲットリスト（数万件のプロファイル）と過去の返信率ログ。',
        workflowIntegration: '顧客企業のSalesforce/HubSpotにアポが自動で同期され、営業チームの日常パイプラインの命綱となる。',
        switchingFriction: '解約した瞬間に新規アポの流入が完全ストップするため、成果が出ている限り契約解除のリスクが極めて低い。',
      },
      capitalEfficiency: {
        cashConversionCycle: '初期構築費と月額フィーはすべて「前払い請求」。APIやツール実費は顧客クレジットカードから直接決済。',
        incrementalMargin: '一度ワークフローを構築すれば運用はAIボットが自動実行するため、顧客が増えても人件費が増えない（営業利益率65%）。',
        workingCapitalStrategy: '完全1人＋外注プログラマー1名で月商800万円・純利520万円を叩き出す超高収益B2Bエージェンシーモデル。',
      },
    },
    exposureAudit: {
      guerrillaTraction: 'ターゲット企業の役員に対し、ClayとChatGPTで自動作成した「相手の直近の投稿や採用求人を深層分析した超個別化コールドメール」を1日数百件送信。「このメール自体が、弊社のAI自動化システムから送られています」という現物デモを営業フックにした奇襲。',
      platformGlitch: 'LinkedInの「週100件接続制限」をハック。複数プロファイルを暖機（ウォームアップ）するツールと、Sales Navigatorからメールアドレスを自動抽出するAPI（Findymail/Enrichment）を直結し、規約制限を迂回してリードを自動収集。',
      pivotSnapshot: '当初は「AIコンサルティング」として時間単価で請け負っていたが、客の要望が無限に膨らみ疲弊。即座に「月額固定の自動アポイント獲得パイプライン構築（月額$5,000〜）」の製品化サービス（Productized Service）に切り替え、労働集約から脱却。',
      hiddenStackCost: '主力ツールはClay ($349/月) + Make/Zapier ($100/月) + OpenAI API (従量数万円) + Smartlead ($100/月)。ツール原価は月10万円以下、受注単価は月100万円〜。完全1人または海外外注1名で純利益率70%超。',
    },
  },
  {
    id: 'ent_local_wash',
    ticker: 'LOCALWASH',
    name: '地域特化・無店舗型 高圧洗浄DX',
    legalEntity: 'クラフトウォッシュ合同会社',
    tagline: '自分は1滴も水に触れず、LINE写真見積もりと地域の空き職人への丸投げで月商450万・手残り225万円抜く手口',
    sector: 'LOCAL_SERVICES',
    scale: 'SOLO',
    founder: '田中 健二',
    country: 'JP',
    url: 'https://craftwash-demo.jp',
    verifiedBadge: true,
    growthRateYoY: 95.0,
    architecturePattern: '職人丸投げ',
    pipelineStack: 'LINE公式 × Google MEO × 提携職人ネットワーク',
    targetPainWallet: '戸建て家主（訪問リフォーム業者のボッタクリ恐怖）',
    tags: ['完全1人', '職人丸投げ', 'LINE集客', '地域DX', '中抜きモデル', '無店舗型'],
    essence: {
      whatItDoes: '外壁・屋根の高圧洗浄をLINE写真1枚で10秒見積もりし、提携職人を派遣する無店舗型元請け',
      targetCustomer: '築10年以上の戸建て住宅オーナー（40〜70代）',
      painRelief: '悪質な訪問リフォーム業者のボッタクリ恐怖と、相場不明による業者選びのストレス',
    },
    pricing: {
      model: '一律明朗会計（外壁・駐車場パック一括 88,000円）',
      pricePoint: '88,000円 / 案件（職人外注費 35,000円 ➔ 差益 53,000円）',
      psychologicalTrigger: '不安の解消と明朗会計（「追加請求一切なし」の絶対保証による防衛本能の解除）',
      estimatedLtvJpy: 145000,
      churnRate: '年1回定期洗浄リピート率 38%',
    },
    acquisition: {
      cacJpy: 8500,
      primaryFunnel: 'Googleローカル検索（MEO「地域名 高圧洗浄」） ➔ LINE公式アカウント誘導 ➔ 写真送信で自動見積もり確定',
      tactics: [
        'Googleビジネスプロフィールでの地域口コミ1位独占（施工完了時に現金5,000円値引きでその場投稿を促進）',
        '「外壁の黒ずみを放置すると外壁塗装で200万円飛ぶ」損失回避チラシ',
        'LINEでの施工前後のビフォーアフター写真自動送信',
      ],
    },
    pnl: {
      monthlyRevenue: 4500000,
      cogs: 0,
      grossProfit: 4500000,
      grossMargin: 100.0,
      operatingExpenses: {
        serverAndApi: 30000,
        advertising: 500000, // Googleローカル検索広告 (PPC)
        subcontracting: 1500000, // 提携の個人清掃職人へ日給払い
        toolsAndSaaS: 45000,
        other: 250000,
      },
      operatingProfit: 2175000,
      operatingMargin: 48.3,
      estimatedAnnualNetProfit: 26100000,
    },
    operations: {
      teamSize: 1,
      weeklyHours: 15,
      initialCapitalRequired: 150000,
      automationLevel: 90,
      primaryChannels: ['Googleビジネスプロフィール (MEO) 口コミ最適化', '地域限定リスティング広告', '戸建てポスティング'],
      toolStack: [
        { name: 'Lステップ (LINE公式アカウント自動見積もりボット)', category: '営業自動化', monthlyCost: 25000, purpose: '写真を送ると10秒で概算見積もりを自動算出して成約率を高めるチャットボット', replacementDifficulty: 'LOW', url: 'https://linestep.jp' },
        { name: 'Google Ads (地域キーワード「外壁 高圧洗浄」)', category: '集客', monthlyCost: 450000, purpose: '施工エリア半径15km以内の戸建て居住者に限定した高精度PPC配信', replacementDifficulty: 'LOW', url: 'https://ads.google.com' },
        { name: 'クラウドサイン (施工同意書自動締結)', category: '法務', monthlyCost: 10000, purpose: '訪問前の契約同意とキャンセルポリシー事前合意によるトラブル防止', replacementDifficulty: 'LOW', url: 'https://cloudsign.jp' },
      ],
    },
    strategy: {
      blindspot: '【高圧洗浄は「どこに頼んでも結果が同じ」なのに、相場を知らない家主がボッタクリを恐れて発注できない心理】悪質なリフォーム業者に怯える戸建てオーナーに、「LINEで壁の写真を送るだけで10秒確定・追加請求一切なし（一律8万円）」という安心感を提供。相見積もりを取らせる前に即日予約を確定させ、競合の介在余地を消滅させる。',
      moatType: 'CORNERED_RESOURCE',
      moatDescription: '【「施工完了当日の現金手渡し」による地域の一流フリー職人の囲い込みとMEO独占】元請け企業から数ヶ月後に買掛金で支払われることに不満を持つ個人職人に対し、「現場完了後、その場で3.5万円即時送金」で囲い込み。営業力ゼロの優秀な職人を囲い込みつつ、施工客にその場でGoogle高評価レビューを書かせるループで地域MEO1位を不可逆固定。',
      incumbentDilemma: '地元の老舗工務店やリフォーム会社は事務所家賃・営業マン固定給を抱えているため、8万円台の低価格案件では利益が出ず参入できない。',
      secretInsight: '下請け職人への支払いを「施工完了当日の夜に即時振込（または現金手渡し）」にすることで、通常2ヶ月遅れで支払う大手元請けに不満を持つ一流の個人職人が最優先で予定を空けてくれる体制を確立。自らは一切現場に出ず、スマホのLINE通知だけで月200万円以上の手残りを抜いている。',
      initialTraction: [
        'ジモティーとココナラで地域の個人清掃職人10名と面談し、「仕事を回すので日程を空けてほしい」と提携',
        '戸建ての密集地域に「外壁の黒ずみ、そのままにしておくと外壁塗装で300万円かかります」というチラシを投函',
        'LINE公式アカウントに誘導し、写真を送ってもらうだけで即座に自動概算見積もりを返信',
      ],
      actionPlaybook: [
        'Step 1: 自分で作業せず、地域で信頼できるフリーランス職人と施工単価・安全基準を取り決める',
        'Step 2: LINE公式アカウントに見積もりシミュレーターを構築し、Google MEOで地域1位を狙う',
        'Step 3: 現場写真を送ってもらって成約させ、差額マージン（40〜50%）を手残りとして自動回収する',
      ],
    },
    meta: {
      incumbentDilemma: {
        cannibalizationBarrier: '大手リフォーム会社やハウスメーカーは単価数百万円の塗装工事が本業であり、単価数万円の高圧洗浄は利益が出ず現場職人の手間になるため手を出さない。',
        scaleMismatchReason: '地域密着のニッチ清掃案件は、全国展開する上場企業には商圏が狭すぎてスケールメリットが効かない。',
        decisionSpeedAdvantage: 'LINE公式アカウントによる即日見積もり・翌日施工という地域の圧倒的スピード感。',
      },
      pricingPower: {
        anchorComparison: '「外壁塗装の全面塗り替え（150万〜200万円）」と比較させ、「高圧バイオ洗浄（3.8万円〜）」を「将来の百万円の補修を防ぐ格安の予防保全」として買わせる。',
        lossAversionTrigger: '「外壁のコケや黒ずみを放置するとカビが根を張り、外壁材が腐食して莫大な修繕費がかかる」という住宅所有者の資産劣化恐怖。',
        budgetCategory: '戸建て住宅の日常維持管理費・修繕積立金枠。',
      },
      lockInMechanism: {
        dataHostage: '地域の戸建て住宅カルテ（外壁材の種類、過去施工日、次回おすすめ洗浄時期）のデータベース。',
        workflowIntegration: 'LINE公式アカウントによる年1回の定期点検案内とお正月・梅雨前のリマインド。',
        switchingFriction: '地域の顔が見える職人との信頼関係とLINEでの手軽なやり取りにより、わざわざ他社を探す動機がゼロ。',
      },
      capitalEfficiency: {
        cashConversionCycle: '施工当日に現金またはPayPay・カードで即時集金。職人への外注費は月末締め翌月末払い（手元現金が常に先行）。',
        incrementalMargin: '店舗・事務所・自社トラックゼロ。固定費がほぼないため、施工案件数に比例して営業利益が積み上がる（利益率48.3%）。',
        workingCapitalStrategy: '完全無店舗型DX。チラシ配布とLINE自動化のみで月商450万円・純手残り218万円を安定創出。',
      },
    },
    exposureAudit: {
      guerrillaTraction: '創業者自身は高圧洗浄機を持たず、ジモティーで「腕はあるが仕事がない個人清掃職人」に直談判して提携。Googleマイビジネス（MEO）で地域キーワード（「外壁洗浄 〇〇市」）に特化したLPを自作し、電話が入った瞬間に職人へ外注。',
      platformGlitch: '大手リフォーム会社が「現地調査から見積もり提出まで1週間かかる」という鈍重さをハック。LINE公式アカウントに「外壁の写真と平米数を送るだけで30分以内に概算見積もり自動返信」する導線を組み、客が相見積もりを取る前に即日成約を確定。',
      pivotSnapshot: '当初は自身で作業を請け負おうとして肉体労働の限界に直面。即座に「集客・見積もり・決済」のみを自社が握り、実作業を地域の一人親方へ50%で丸投げする「プラットフォーム胴元モデル」へ転換。',
      hiddenStackCost: '事務所なし、機材保有ゼロ（職人持ち込み）、従業員0人。ツールはLINE公式 + Make + Stripe + Squarespace（月額1.5万円程度）。売上450万円に対し、職人外注費200万円、純利225万円（利益率50%）。',
    },
  },
];
