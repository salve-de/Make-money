export interface MarketRadarTrendItem {
  id: string;
  badge: string;
  title: string;
  subtitle: string;
  growthRate: string;
  heatScore: number;
  sparklineData: number[];
  category: 'INFRA_PIPELINE' | 'UNBUNDLED_SAAS' | 'PLATFORM_PARASITE' | 'LANDMINE_ALERT';
  
  // 第1段：マクロ・レーダー
  macroContext: {
    heading: string;
    whyNow: string;
    targetPainWallet: string;
  };

  // 第2段：大手の死角 ＆ 実証勝者
  gapAndProof: {
    incumbentGap: {
      incumbentName: string;
      fatalDilemma: string;
      incumbentPricing: string;
    };
    provenPlayer: {
      name: string;
      entityId?: string;
      teamSize: string;
      monthlyProfit: string;
      grossMargin: string;
      paybackDays: string;
      proofSnippet: string;
    };
  };

  // 第3段：参入アクション攻略本
  actionablePlaybook: {
    unbundlingAngle: string;
    first10CustomersLog: string;
    threeToolStack: {
      name: string;
      role: string;
      cost: string;
    }[];
    totalMonthlyCost: string;
    fatalPitfalls: string;
    pricingRecommendation: string;
  };
}

export const MARKET_RADAR_TRENDS: MarketRadarTrendItem[] = [
  {
    id: 'trend-ai-doc-pipeline',
    badge: 'TREND 01 / AI配管インフラ',
    title: '社内文書の「AIエージェント即食いクリーンMarkdown化」代行',
    subtitle: 'Claude CodeやCodexの現場普及に伴い、社内の汚いExcel/Word/手書きPDFをAIが読める形式に前処理する配管需要が急騰',
    growthRate: '+240%',
    heatScore: 98,
    sparklineData: [15, 22, 35, 48, 72, 98],
    category: 'INFRA_PIPELINE',
    macroContext: {
      heading: 'AIエージェントの現場浸透と「社内データのゴミ屋敷化」の摩擦',
      whyNow: '企業が最新のコーディングエージェントや社内AIを導入したものの、実務の9割が複雑な結合セルExcelやPDFのためAIが構文エラーで停止。AI本体よりも「AIに食わせるためのデータ前処理配管」に巨額予算が流出している。',
      targetPainWallet: '中堅・大手企業の情シス・DX推進責任者が抱える「数千万円投資したAIプロジェクトがデータ不備で止まり、経営陣に詰められる」保身恐怖の財布。',
    },
    gapAndProof: {
      incumbentGap: {
        incumbentName: '大手SIer / 総合コンサルティング会社',
        fatalDilemma: '大手SIerは1件数千万円〜数億円の基幹システム刷新案件として請け負うビジネスモデルのため、月額数万円〜数十万円で即日動く軽量コンバーターを単体提供すると自社のSI工数が蒸発して自滅する。',
        incumbentPricing: '初期数千万円〜 ＋ 開発期間6ヶ月以上',
      },
      provenPlayer: {
        name: 'Firecrawl / anydoc エコシステム',
        entityId: 'ent_betterstack',
        teamSize: '1〜3人（超少数精鋭）',
        monthlyProfit: '月利 200万〜600万円',
        grossMargin: '94%',
        paybackDays: '即日〜14日',
        proofSnippet: 'GitHubでanydocがわずか数週間で2万Star超えを記録。社内文書をMarkdownへ自動変換するAPIを法人契約させ、広告費ゼロで初月から黒字化。',
      },
    },
    actionablePlaybook: {
      unbundlingAngle: '大企業向け全自動化ではなく、「地方の製造業・医療法人の古い帳票PDFとExcelに特化した日本語変換パイプライン」としてローカルへタイムマシン移植。',
      first10CustomersLog: '地元の税理士・社労士事務所や製造業30社に「御社の複雑なExcel台帳を、ChatGPTやClaudeでそのまま質問・集計できる形に即日テスト変換します（無料サンプル作成）」とメール・電話で連絡。1画面の変換デモを見せて即日契約。',
      threeToolStack: [
        { name: 'anydoc / Marker (OSS)', role: '高速PDF/Excel Markdown変換コア', cost: '無料' },
        { name: 'Cloudflare Workers & R2', role: '変換ファイルのセキュア一時保管・API受付', cost: '月0円〜1,500円' },
        { name: 'Stripe Billing', role: '月額保守料金の自動引き落とし', cost: '成果報酬 3.6%' },
      ],
      totalMonthlyCost: '月額実費: 約1,500円〜3,000円',
      fatalPitfalls: '【即死地雷】自前でOCRや独自AIモデルをゼロから開発しようとするな。GitHub上の最新OSSを組み合わせてDockerで動かすだけに徹底せよ。',
      pricingRecommendation: '初期セットアップ費 20万円 ＋ 月額保守 3万〜5万円（契約企業10社で月30万〜50万円の完全自動ストック）',
    },
  },
  {
    id: 'trend-unbundled-saas-cloudflare',
    badge: 'TREND 02 / 大手解約難民の横取り',
    title: '外資SaaSの円安値上げ疲れを突く「1機能特化・格安クラウド移設」',
    subtitle: 'ZendeskやDatadogの毎月数十万円の請求書にキレた企業を、月3,000円で自走する専用基盤へ丸ごと乗り換えさせるモデル',
    growthRate: '+185%',
    heatScore: 92,
    sparklineData: [20, 28, 42, 55, 78, 92],
    category: 'UNBUNDLED_SAAS',
    macroContext: {
      heading: '円安と多機能化による「外資SaaSの強制値上げ」に対する現場の怨嗟',
      whyNow: '米系SaaSが円安とAI機能追加を名目に毎年20〜30%値上げを強行。企業の現場では「使っているのは問い合わせ受付の1機能だけなのに毎月何十万円も取られる」という不満が極限に達している。',
      targetPainWallet: 'スタートアップや中堅企業のCTO・経営企画が抱える「SaaS経費を今期中に30%削減せよ」という取締役会からの締め上げ予算。',
    },
    gapAndProof: {
      incumbentGap: {
        incumbentName: 'Zendesk / Salesforce / Datadog',
        fatalDilemma: '大手は株主向けにARRの極大化と全社包括契約を維持する必要があるため、ユーザーが日常で一番使っている1機能だけを月数千円で切り売りすると自社の売上が激減する。',
        incumbentPricing: '月額 20万〜150万円（ユーザー数課金で青天井）',
      },
      provenPlayer: {
        name: 'Better Stack / ResolveHQ モデル',
        entityId: 'ent_betterstack',
        teamSize: '完全1人〜数人',
        monthlyProfit: '月利 300万〜1,200万円',
        grossMargin: '92%',
        paybackDays: '3日〜7日',
        proofSnippet: '大手の1/10価格で障害通知・ログ監視だけを切り出し。円安で悲鳴を上げた日本企業や海外スタートアップの乗り換え需要を一網打尽にし急成長。',
      },
    },
    actionablePlaybook: {
      unbundlingAngle: '高額サポートツールの全機能を模倣せず、「社内SlackやLINEと直結したシンプルな問い合わせチケット管理」だけに絞り込み、大手の1/10価格で直販。',
      first10CustomersLog: 'XやWantedlyで「ZendeskやSalesforceの請求書が高すぎる」と愚痴っているCTO・創業者を検索し、「月額コストを1/10にする移行実績があります。初期費用無料、浮いた差額の一部のみ成功報酬」とDM送信。',
      threeToolStack: [
        { name: 'Cloudflare Workers & D1', role: 'サーバーレス自前API・データベース', cost: '無料枠内' },
        { name: 'Chatwoot / ResolveHQ (OSS)', role: 'オープンソースの問い合わせUI', cost: '無料' },
        { name: 'Resend / Postmark', role: '通知メール高速配信API', cost: '月0円〜2,000円' },
      ],
      totalMonthlyCost: '月額実費: 約2,000円',
      fatalPitfalls: '【即死地雷】大手が持っている無駄な便利機能を全部作ろうとするな。「チケット管理と返信」という死活問題の1機能だけを絶対に落とさず高速化せよ。',
      pricingRecommendation: '初期データ移行費 15万円 ＋ 月額保守 29,800円（大手の年間300万円が年間50万円に削減されるため即決成約）',
    },
  },
  {
    id: 'trend-parasite-short-commerce',
    badge: 'TREND 03 / プラットフォーム規約寄生',
    title: 'TikTok Shopアルゴリズム優遇に乗る「手元15秒実演アフィリエイト」',
    subtitle: '顔出し・声出し・在庫ゼロ。Amazonに対抗してプラットフォームが無料でばら撒くECトラフィックを前金総取りするモデル',
    growthRate: '+380%',
    heatScore: 96,
    sparklineData: [10, 18, 30, 52, 75, 96],
    category: 'PLATFORM_PARASITE',
    macroContext: {
      heading: '巨大プラットフォームの「ECシェア争奪戦」による無料露出のバブル',
      whyNow: 'TikTokがAmazonの流通シェアを奪うため、商品タグ付きの実演ショート動画に不当なアルゴリズム優遇（莫大な無料インプレッション）をばら撒くボーナスタイムが到来している。',
      targetPainWallet: '深夜にスマホを眺めながら「日常の小さな不便を解決したい」と衝動買いする10代〜40代のドーパミン直撃の財布。',
    },
    gapAndProof: {
      incumbentGap: {
        incumbentName: '既存ECモール（Amazon, 楽天市場）',
        fatalDilemma: '既存モールは検索型の受動購入モデルのため、動画による衝動買いを促進するSNSアルゴリズムを持たず、インフルエンサーへの露出優遇を自社で配布できない。',
        incumbentPricing: '高い広告出稿料（CPC広告）と出店料',
      },
      provenPlayer: {
        name: '海外手元実演アフィリエイト軍団',
        entityId: 'ent_midjourney',
        teamSize: '完全1人（スマホ1台）',
        monthlyProfit: '月利 150万〜500万円',
        grossMargin: '30%〜40%（実効利）',
        paybackDays: '即日〜7日',
        proofSnippet: '海外でバズった1,000円の日用便利グッズをサンプル調達し、手元だけで開封・実演する15秒動画を量産。広告費ゼロで初月月商2,000万円・報酬400万円を抜く事例が多発。',
      },
    },
    actionablePlaybook: {
      unbundlingAngle: '海外（中国・米国）のTikTok Shop急上昇ランキングで1万個売れているアイテムを特定し、構成をそのまま日本市場向けの手元動画としてタイムマシン複製。',
      first10CustomersLog: 'クリエイターセンターから無料サンプルを取り寄せ、デスクライトの下で手元だけの手順（問題提起 ➔ 実演 ➔ 衝撃のビフォーアフター）を15秒で撮影し毎日3本投稿。CapCutで自動字幕とトレンド音源を載せるだけ。',
      threeToolStack: [
        { name: 'TikTok Shop Creator Center', role: '無料サンプル調達・売上計測配管', cost: '無料' },
        { name: 'CapCut Pro', role: 'スマホ動画自動字幕・エフェクト編集', cost: '月1,100円' },
        { name: 'FastMoss / Shoplus', role: '海外TikTok Shop急上昇データ分析', cost: '月0円〜数千円' },
      ],
      totalMonthlyCost: '月額実費: 約1,100円',
      fatalPitfalls: '【即死地雷】自分の顔や声を入れるな。自分の感情が入ると量産が止まる。手元と効果音・字幕だけの「無機質な実演機械」として動画を量産せよ。',
      pricingRecommendation: '仕入れ原価ゼロ（無料サンプル） ➔ アフィリエイト報酬 15%〜25%を毎日自動回収',
    },
  },
];
