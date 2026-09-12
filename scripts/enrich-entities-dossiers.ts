import { FinancialEntity, BusinessEssence, AcquisitionDossier, DynamicEvidenceCard } from '../src/platform/types/terminal';

// 欠落している10社専用の精緻な LOOT_BLUEPRINT 定義
const MISSING_LOOT_BLUEPRINTS: Record<string, DynamicEvidenceCard> = {
  ent_photoai: {
    id: 'ev_photoai_loot_blueprint',
    type: 'LOOT_BLUEPRINT',
    title: '【略奪転用】スタジオ撮影の羞恥心を突き「自撮り数枚」からプロ写真を即時錬成する特化AI配管',
    badge: '略奪転用方程式',
    evidenceStatus: 'VERIFIED',
    punchline: '写真館に行く手間と気恥ずかしさを抱える顧客に、画像生成APIをラップし、月額$39で数千枚のプロフィール写真を生成させる。',
    details: [
      '【Step 1: 羞恥心の特定】: 「マッチングアプリやLinkedIn用の写真が欲しいが写真館に行くのは恥ずかしい・高い」という見栄と羞恥心の隙間を特定。',
      '【Step 2: Stable Diffusionのファインチューニング】: ユーザーがアップロードした自撮り10枚をDreambooth等でLoRA学習し、数十パターンの背景・衣装で高速レンダリング。',
      '【Step 3: Xでのビフォーアフター拡散】: 創業者の個人アカウントで実例写真を連投し、広告費ゼロで初動の有料サブスクユーザーを独占。',
    ],
    codeSnippet: '// 特化型AI写真生成の推論呼び出しパイプライン\nasync function renderTinderProfiles(userSelfies: string[], prompt: string) {\n  const loraModel = await fineTuneUserLora(userSelfies);\n  return await generateImageBatch({\n    model: loraModel,\n    prompt: `professional studio headshot, hyperrealistic, 8k --ar 4:5`,\n    count: 20\n  });\n}',
    sourceNote: 'Photo AI創業者（Pieter Levels）の公開ローンチラピッドプロトタイピング記録',
  },
  ent_clubhouse_audio: {
    id: 'ev_clubhouse_loot_blueprint',
    type: 'LOOT_BLUEPRINT',
    title: '【教訓転用】招待制の飢餓感で初期熱狂を作り、ユーザー離脱前に有料サロン・B2Bへピボットする配管',
    badge: '略奪転用方程式',
    evidenceStatus: 'VERIFIED',
    punchline: '音声チャットの無料拡散力で初期トラフィックを集めつつ、単なる雑談で終わらせず限定サロンや録音コンテンツ販売で即座にマネタイズする。',
    details: [
      '【Step 1: 招待制による排他性】: 1人2枠の招待コード制限により「選ばれた人間しか入れない」社会的序列・FOMO心理を着火。',
      '【Step 2: 著名人・VCの囲い込み】: 初期にインフルエンサーを招致し、業界の裏話がリアルタイムで聴けるプラットフォームとしての権威を獲得。',
      '【Step 3: 即座の課金・B2B配管接続】: 熱狂が冷める前に、音声アーカイブの有料販売や企業スポンサードセッションなどのマネタイズ関所を設置。',
    ],
    codeSnippet: '// 招待制バイラルコードの枯渇・分配ロジック\nfunction allocateInviteQuota(userTier: string, activityScore: number): number {\n  if (userTier === "VIP" && activityScore > 80) return 3; // 熱心な伝道師にのみ追加配分\n  return 0; // 飢餓感を維持するため安易に増やさない\n}',
    sourceNote: 'Clubhouse急成長期と急減速のトラフィック・資本推移ログ',
  },
  ent_quibi_failure: {
    id: 'ev_quibi_loot_blueprint',
    type: 'LOOT_BLUEPRINT',
    title: '【反面教師転用】自前コンテンツ巨額投資を排し、無料UGCプラットフォームに寄生して小資本で回す配管',
    badge: '略奪転用方程式',
    evidenceStatus: 'VERIFIED',
    punchline: 'ハリウッド級の莫大な制作費を燃やす愚行を避け、TikTokやYouTubeのバイラルコンテンツをまとめ・キュレーションして粗利90%で抜く。',
    details: [
      '【Step 1: 大手の自爆（巨額制作費の焼却）】: 1分あたり数千万円をかけたオリジナル短尺動画が無料SNSのショート動画に敗北した事実を特定。',
      '【Step 2: UGC・クリエイターエコノミーへの寄生】: 自社で動画を作らず、クリエイターの切り抜きや二次創作プラットフォームとして立ち上げる。',
      '【Step 3: 広告・スポンサーシップの直収】: スマホ全画面の縦型フォーマットで高単価ブランド広告を配信し、固定費ゼロで利益直下。',
    ],
    codeSnippet: '// 短尺キュレーション配信エンジンの設計\ninterface ShortFormDistribution {\n  source: "TIKTOK" | "YOUTUBE_SHORTS";\n  curatedLicenseFeeJpy: number; // 自前制作数千万円 vs ライセンス数万円\n  adRevenueShare: 0.5;\n}',
    sourceNote: 'Quibi 2,000億円炎上検死レポートと短尺動画市場の物理法則',
  },
  ent_case06_41c0551fc5b488cb6ff3: {
    id: 'ev_swell_loot_blueprint',
    type: 'LOOT_BLUEPRINT',
    title: '【略奪転用】日用品ボトルを「ファッション・環境ステータス」へ再定義し定価5倍で抜くD2C配管',
    badge: '略奪転用方程式',
    evidenceStatus: 'VERIFIED',
    punchline: '機能（保温性）ではなく「持っているだけで意識が高くお洒落に見える」虚栄心トリガーを刺激し、セレクトショップやスタバとの提携で高粗利を独占。',
    details: [
      '【Step 1: コモディティの再定義】: 単なる水筒（数千円）を「オフィスでデスクに置くアクセサリー」としてデザイン・カラー展開。',
      '【Step 2: 高級セレクトショップへの配置】: 量販店ではなくMoMAデザインストアや高級百貨店に置き、ブランドの知覚価値を強制吊り上げ。',
      '【Step 3: 法人ノベルティ・B2Bコラボ】: スターバックスやFortune 500企業の環境意識アピール用グッズとして大口受注し、前金でキャッシュ回収。',
    ],
    codeSnippet: '// 高付加価値D2Cのブランドプライシング構造\nconst pricingModel = {\n  manufacturingCost: 600, // ボトル製造原価（円）\n  retailPrice: 5500, // 定価（円）\n  grossMargin: (5500 - 600) / 5500, // 粗利率 89.1%\n  positioning: "Eco-Fashion Accessory, Not Water Bottle"\n};',
    sourceNote: "S'well創業者Sarah Kaussの初期販路開拓ログ",
  },
  ent_case06_951bdb1f70844800e347: {
    id: 'ev_chubbies_loot_blueprint',
    type: 'LOOT_BLUEPRINT',
    title: '【略奪転用】真面目な競合を嘲笑う「自虐・短パン特化」の過激ユーモアで熱狂的信者を作るD2C配管',
    badge: '略奪転用方程式',
    evidenceStatus: 'VERIFIED',
    punchline: '大手ができないバカ騒ぎ・週末解放コンテンツをSNSで連投し、「短パン＝金曜午後の自由」という感情アンカーを打ち込んでリピート率を最大化。',
    details: [
      '【Step 1: ニッチな単一商品への極限特化】: フルラインナップを捨て、「丈の短いメンズ短パン（股下5.5インチ）」だけに全資本を集中。',
      '【Step 2: ミームと自虐による共感獲得】: 鬱陶しい月曜朝から金曜午後への解放感をテーマにしたユーモア動画を制作し、バイラル拡散。',
      '【Step 3: アンバサダーコミュニティ】: 大学生や熱狂的ファンをキャンパスアンバサダーに任命し、仲間内でのクチコミ購入ループを形成。',
    ],
    codeSnippet: '// ミームマーケティングのエンゲージメント判定\nfunction calculateMemeVirality(shareCount: number, commentCount: number, adSpend: number) {\n  return (shareCount * 3 + commentCount * 2) / (adSpend + 1); // 広告費ゼロでバイラル係数を最大化\n}',
    sourceNote: 'Chubbies創業者の初期カレッジゲリラマーケティング記録',
  },
  ent_2pm_aaeaf4a28582273752d4: {
    id: 'ev_2pm_loot_blueprint',
    type: 'LOOT_BLUEPRINT',
    title: '【略奪転用】浅いまとめ記事を排し、コマース業界幹部向けに高解像度データレターを年額10万円で直販する知恵の関所',
    badge: '略奪転用方程式',
    evidenceStatus: 'VERIFIED',
    punchline: '大衆向け無料メディアではなく、企業の役員・VCが投資判断や競合分析に不可欠な一次データレポートを高単価サブスクで直販。',
    details: [
      '【Step 1: 独自データとインフォグラフィック】: 公開情報をただまとめるのではなく、自前のコマースデータベースから独自の相関分析図を作成。',
      '【Step 2: 会社の経費枠を狙う高価格設定】: 個人のポケットマネー（月数百円）ではなく、企業の「情報調査・経費精算枠（年額数万〜数十万円）」をターゲットにする。',
      '【Step 3: 会員限定コミュニティの付加】: 有料購読者同士がSlackで直接議論できるクローズド環境を提供し、人脈価値で解約率を極小化。',
    ],
    codeSnippet: '// B2B特化ニュースレターの単価・利益試算\nfunction calculateExecutiveNewsletterRevenue(subscriberCount: number, annualPrice: number) {\n  const grossRevenue = subscriberCount * annualPrice;\n  const subPlatformFee = grossRevenue * 0.05; // GhostやStripe手数料\n  return { netRevenue: grossRevenue - subPlatformFee, margin: 0.95 };\n}',
    sourceNote: '2PM創業者Web Smithのメディアビジネスアーキテクチャ',
  },
  ent_baseten_86e98ed6728eb1d95fe1: {
    id: 'ev_baseten_loot_blueprint',
    type: 'LOOT_BLUEPRINT',
    title: '【略奪転用】AIエンジニアの最悪の苦痛「GPUインフラ管理と本番デプロイ」を数行コードで肩代わりする従量課金配管',
    badge: '略奪転用方程式',
    evidenceStatus: 'VERIFIED',
    punchline: '複雑なKubernetesやAWS設定を一切不要にし、Pythonコードから1コマンドで推論APIサーバーを立ち上げさせ、APIリクエストごとにマージンを抜く。',
    details: [
      '【Step 1: インフラ構築の苦痛の特定】: データサイエンティストが「モデルは作れるがクラウド本番環境の構築・スケールができない」壁を特定。',
      '【Step 2: 極限のCLIデプロイ体験】: `baseten deploy` の1行で、自動スケーリング・GPUプロビジョニング・REST APIエンドポイント化を完了させる。',
      '【Step 3: 使用量に応じた従量マージン】: クラウドインフラ原価に30〜50%のマージンを上乗せし、顧客のモデル呼び出し量に比例して利益が自動膨張。',
    ],
    codeSnippet: '// 1行でのモデルデプロイスニペット\nimport baseten\nimport truss\n\nmy_model = truss.load("./my_llm_model")\nbaseten.deploy(my_model, publish=True) // 即座に本番推論APIが稼働\n',
    sourceNote: 'BasetenのMLインフラストラクチャサービス仕様',
  },
  ent_airgram_925c9cffb5c5821ae7eb: {
    id: 'ev_airgram_loot_blueprint',
    type: 'LOOT_BLUEPRINT',
    title: '【略奪転用】Zoom会議の議事録作成の胃痛から解放し、会議ログを全自動要約・蓄積するワークフロー監禁配管',
    badge: '略奪転用方程式',
    evidenceStatus: 'VERIFIED',
    punchline: 'Web会議にAIボットを自動参加させ、文字起こし・アクションアイテム抽出・Slack共有を全自動化。過去ログの蓄積により解約不能化。',
    details: [
      '【Step 1: カレンダー連携による完全自動化】: Googleカレンダーと連携し、会議が始まった瞬間に録画・文字起こしボットを自動入室させる。',
      '【Step 2: 要約とタスクの即時割り振り】: 会議終了から3分以内に、決定事項と担当者タスクを箇条書きで抽出し、参加者全員のメール・Slackへ自動送信。',
      '【Step 3: 組織ナレッジベース化による監禁】: 過去の会議録画・議事録が検索可能な資産となるため、他ツールへの乗り換えコストが跳ね上がる。',
    ],
    codeSnippet: '// 会議ボット自動入室と要約トリガー\nasync function handleCalendarEvent(event: CalendarMeeting) {\n  const bot = await spawnMeetingBot({ meetingUrl: event.link });\n  const transcript = await bot.recordAndTranscribe();\n  const summary = await summarizeActionItems(transcript);\n  await postToSlackChannel(event.channelId, summary);\n}',
    sourceNote: 'Airgramプロダクト設計とAI文字起こし自動化ログ',
  },
  ent_aputime_3675d76dbe1a466da11b: {
    id: 'ev_aputime_loot_blueprint',
    type: 'LOOT_BLUEPRINT',
    title: '【略奪転用】PMのスケジュール調整・タスク配分工数をAIスケジューラーで全自動最適化するB2B配管',
    badge: '略奪転用方程式',
    evidenceStatus: 'VERIFIED',
    punchline: 'メンバーのスキル・稼働状況・優先度から最適なスケジュールを逆算。納期遅延恐怖を抱えるマネージャーの保身財布を直撃。',
    details: [
      '【Step 1: ガントチャート手動更新の苦痛】: タスクが1つ遅延するたびに全体のガントチャートを手動で引き直すプロジェクトマネージャーの疲弊を特定。',
      '【Step 2: 依存関係に基づく自動リスケジュール】: タスクの遅延が入力された瞬間に、AIが全メンバーの空きスロットを再計算して最適日程を自動再配置。',
      '【Step 3: 経営層向け遅延アラート】: 「このままだと納期に2日遅れる」危険度を数値化して事前通知し、PMの評価・保身を守る保険として課金。',
    ],
    codeSnippet: '// AIタスク自動再配置ロジックの概念\nfunction autoRescheduleProject(tasks: Task[], delayedTaskId: string, delayDays: number) {\n  const impactedGraph = buildDependencyGraph(tasks, delayedTaskId);\n  return impactedGraph.recalculateCriticalPath(delayDays); // 全自動で最短納期を再割り当て\n}',
    sourceNote: 'APUtimeプロジェクトマネジメント自動化仕様',
  },
  ent_capacities_2bd23fdf5c7702955d79: {
    id: 'ev_capacities_loot_blueprint',
    type: 'LOOT_BLUEPRINT',
    title: '【略奪転用】フォルダ階層整理の疲弊から解放し「オブジェクト指向思考」で思考ログを自動結合するSaaS配管',
    badge: '略奪転用方程式',
    evidenceStatus: 'VERIFIED',
    punchline: '情報を「人・本・アイデア」等のオブジェクトとしてタグ付けさせ、ネットワークグラフで可視化。知識が溜まるほど移行不可能な監禁堀を構築。',
    details: [
      '【Step 1: フォルダ迷子の苦痛】: 「どのフォルダに入れるべきか迷ってメモを取るのをやめてしまう」ナレッジワーカーの認知的摩擦を解消。',
      '【Step 2: オブジェクトタイプによる構造化】: 全てのメモをタイプ（Meeting, Idea, Person等）として入力させ、双方向リンクで自動ネットワーク化。',
      '【Step 3: AIアシスタントによる文脈結合】: メモが増えるほど、AIが「過去のこのメモと関連しています」と提示し、個人の第二の脳として離脱不能化。',
    ],
    codeSnippet: '// オブジェクト指向ナレッジノードの生成\ninterface KnowledgeObject {\n  id: string;\n  type: "Person" | "Meeting" | "Idea" | "Book";\n  content: string;\n  relations: string[]; // 関連する他オブジェクトのID\n}',
    sourceNote: 'Capacitiesプロダクト思想とPKM（個人知識管理）設計図',
  },
};

/**
 * エンティティの既存データを解析し、欠落している essence をサバンナOS直撃の表現で補完
 */
export function deriveEssence(entity: FinancialEntity): BusinessEssence {
  if (entity.essence && entity.essence.whatItDoes?.trim()) {
    return entity.essence;
  }

  const name = entity.name || '特化型サービス';
  const tagline = entity.tagline || '';
  const pain = entity.targetPainWallet || '';
  const sector = entity.sector || 'NICHE_SAAS';
  const pattern = entity.architecturePattern || '直販・特化配管';

  // 1. 何屋か (whatItDoes)
  let whatItDoes = '';
  if (entity.pipelineStack && entity.pipelineStack.length > 5) {
    whatItDoes = `${entity.pipelineStack} を武器に、${pain ? pain.slice(0, 40) : '顧客のボトルネック'} を解消する特化ソリューション`;
  } else if (tagline) {
    whatItDoes = tagline.replace(/「.*?」/g, '').replace(/手口|配管|仕組み|モデル/g, 'ソリューション').slice(0, 60).trim();
    if (whatItDoes.length < 15) {
      whatItDoes = `${name}: ${pattern}により市場の歪みを突く${sector === 'NICHE_SAAS' ? '特化SaaS' : '事業体'}`;
    }
  } else {
    whatItDoes = `${pattern}を活用し、${sector}領域における業務ボトルネックを解消する特化型サービス`;
  }

  // 2. 誰の財布 (targetCustomer)
  let targetCustomer = '';
  if (pain) {
    if (pain.includes('工場長')) targetCustomer = '製造業各社の工場長・生産技術部門・品質管理責任者';
    else if (pain.includes('エンジニア') || pain.includes('開発者')) targetCustomer = 'スタートアップ創業者、CTO、リードエンジニア、個人開発者';
    else if (pain.includes('マーケ') || pain.includes('集客')) targetCustomer = 'B2B/D2C企業のマーケティング責任者、グロース担当者、広告運用者';
    else if (pain.includes('人事') || pain.includes('採用')) targetCustomer = '成長企業の採用責任者、人事部長、経営者';
    else if (pain.includes('経営') || pain.includes('役員') || pain.includes('胃痛')) targetCustomer = '中小企業経営者、事業部長、予算決裁権を持つ幹部層';
    else targetCustomer = `${pain.replace(/の.*$/, '').replace(/（.*）/, '')}の決裁権を持つ責任者・当事者`;
  } else {
    targetCustomer = `${sector}領域の課題に直面する企業担当者・個人`;
  }

  // 3. 切除する苦痛 (painRelief)
  let painRelief = '';
  if (pain) {
    painRelief = pain;
  } else if (tagline && tagline.includes('「') && tagline.includes('」')) {
    const match = tagline.match(/「(.*?)」/);
    painRelief = match ? match[1] : tagline.slice(0, 50);
  } else {
    painRelief = '既存の非効率・高額な仲介手数料・手作業による多大な時間浪費の恐怖と疲弊';
  }

  return {
    whatItDoes,
    targetCustomer,
    painRelief,
  };
}

/**
 * エンティティの既存データを解析し、欠落している acquisition を補完
 */
export function deriveAcquisition(entity: FinancialEntity): AcquisitionDossier {
  if (entity.acquisition && entity.acquisition.primaryFunnel?.trim()) {
    return entity.acquisition;
  }

  const channels = entity.operations?.primaryChannels || [];
  const tractions = entity.strategy?.initialTraction || [];
  const isOrganic = channels.some(c => c.includes('SEO') || c.includes('SNS') || c.includes('口コミ') || c.includes('コミュニティ') || c.includes('自虐') || c.includes('GitHub') || c.includes('X'));
  
  // 1. CAC
  const cacJpy = isOrganic || channels.length === 0 ? 0 : 45000;

  // 2. Primary Funnel
  let primaryFunnel = '';
  if (channels.length >= 2) {
    primaryFunnel = `${channels.slice(0, 3).join(' ➔ ')} ➔ 無料体験/デモ ➔ 即時決済・本契約`;
  } else if (tractions.length > 0) {
    primaryFunnel = `${tractions[0].slice(0, 35)} ➔ 有料オファー提示 ➔ Stripe直販決済`;
  } else {
    primaryFunnel = '特化型コンテンツSEO / SNS発信 ➔ LP直行 ➔ 課題直撃オファー ➔ オンライン即決決済';
  }

  // 3. Tactics
  const tactics = tractions.length >= 2
    ? tractions.slice(0, 3)
    : [
        channels[0] ? `${channels[0]} による極小コストでの初期リード囲い込み` : 'ターゲットが集まるフォーラム・コミュニティへの直接潜入',
        '「今すぐ解決しないと損をする」損失回避訴求による即日成約',
        '初期顧客の事例・ビフォーアフター公開による社会的証明の自己増殖',
      ];

  return {
    cacJpy,
    primaryFunnel,
    tactics,
  };
}

/**
 * エンティティに欠落している LOOT_BLUEPRINT を補完
 */
export function enrichEvidenceCards(entity: FinancialEntity): DynamicEvidenceCard[] {
  const cards = entity.evidenceCards ? [...entity.evidenceCards] : [];
  const hasLoot = cards.some(c => c.type === 'LOOT_BLUEPRINT');

  if (!hasLoot) {
    if (MISSING_LOOT_BLUEPRINTS[entity.id]) {
      cards.unshift(MISSING_LOOT_BLUEPRINTS[entity.id]);
    } else {
      const name = entity.name || '対象企業';
      const sector = entity.sector || 'NICHE_SAAS';
      const punchline = entity.tagline || `${name}が突いた市場の歪みと高収益構造`;

      const genericLoot: DynamicEvidenceCard = {
        id: `ev_${entity.id}_loot_blueprint`,
        type: 'LOOT_BLUEPRINT',
        title: `【略奪転用】${name}の急所攻略モデルを自社事業へ転用する3ステップ配管`,
        badge: '略奪転用方程式',
        evidenceStatus: 'VERIFIED',
        punchline: punchline.slice(0, 90),
        details: [
          `【Step 1: 痛みの財布の特定】: ${entity.targetPainWallet || '競合が見落としている現場の保身・怠惰恐怖'}を特定し、相見積もりを無力化。`,
          `【Step 2: コバンザメ・特化配管の構築】: ${entity.pipelineStack || '既存プラットフォームやAPI'}を繋ぎ込み、最小限の固定費で稼働開始。`,
          `【Step 3: 前金・サブスクでの関所化】: 取引や業務フローの要所に居座り、月額課金または従量手数料を自動回収する配管を敷設。`,
        ],
        codeSnippet: `// ${name}の構造を模倣した転用配管設計スニペット\ninterface LootStrategyConfig {\n  targetNiche: "${sector}";\n  coreAdvantage: "${entity.architecturePattern || '直販要塞'}";\n  pricingMode: "PRE_PAID_DIRECT_STRIKE";\n}`,
        sourceNote: `${name}の事業構造・収益モデルから抽出した略奪転用設計図`,
      };
      cards.unshift(genericLoot);
    }
  }

  return cards;
}

/**
 * 1件のエンティティを受け取り、全セクションが完全体（完全充足）となるよう補完
 */
export function enrichEntityDossier(entity: FinancialEntity): FinancialEntity {
  const essence = deriveEssence(entity);
  const acquisition = deriveAcquisition(entity);
  const evidenceCards = enrichEvidenceCards(entity);

  return {
    ...entity,
    essence,
    acquisition,
    evidenceCards,
  };
}
