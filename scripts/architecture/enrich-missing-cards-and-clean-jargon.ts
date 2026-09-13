import * as fs from 'fs';
import * as path from 'path';
import type { FinancialEntity, DynamicEvidenceCard } from '../../src/shared/terminal';

const indexPath = path.resolve(process.cwd(), 'data/entities-index.json');
const raw = fs.readFileSync(indexPath, 'utf8');
const entities: FinancialEntity[] = JSON.parse(raw);

// 17社分の完全体エビデンスカード定義
const CARDS_MAP: Record<string, DynamicEvidenceCard[]> = {
  ent_shift_3697: [
    {
      id: 'ev_shift_model',
      type: 'LOOT_BLUEPRINT',
      title: '【儲かる仕組み】元請けSIerの「下請け丸投げ多重構造」を検定標準化で中抜きする品質保証の関所',
      badge: 'ビジネスモデル',
      evidenceStatus: 'VERIFIED',
      punchline: 'IT業界の悪習である「人月単価の多重下請け」を逆手に取り、独自の「CAT検定」でテスターのスキルを可視化。元請けからテスト工程を一括受注し、粗利30%超・営業利益122億円を叩き出す。',
      details: [
        '【課題の特定】: 大手企業のDXやシステム開発において、バグ修正とテスト工数が開発全体の30〜40%を占めるのに、元請けSIerは下請けに丸投げして品質崩壊が頻発していた。',
        '【独自の工夫】: CAT検定という独自テストで非IT人材から適性のあるテスターを発掘し、標準化されたマニュアルで短期間に戦力化。人月ではなく品質保証パッケージとして元請けに高単価納品。',
        '【収益化の仕組み】: 年商1,180億円、営業利益122億円。テスト専門会社として日本唯一のメガプレイヤーに君臨。'
      ],
      metrics: [
        { label: '年商規模', value: '¥1,180億円', isHighlight: true },
        { label: '営業利益', value: '¥122億円' },
        { label: '粗利益率', value: '30.5%' },
        { label: '従業員数', value: '11,000名' }
      ],
      sourceNote: '株式会社SHIFT 2024年8月期 有価証券報告書'
    },
    {
      id: 'ev_shift_crime',
      type: 'THE_CRIME',
      title: '【初動の突破口】元請け大手SIerのPMが抱える「納期間際のバグ炎上恐怖」を直撃した泥臭い営業',
      badge: '集客の事実ログ',
      evidenceStatus: 'VERIFIED',
      punchline: '創業者自らが大企業の情シスや大手SIerの炎上プロジェクトに飛び込み、「うちならテスト専門部隊がバグを潰し切って納期を守る」とPMの保身心理を救済して最初の大型契約を獲得。',
      details: [
        '初動の営業アクション: 開発会社ではなく、バグで納期遅延と損害賠償に怯える大手SIerのプロジェクト責任者へ直接アプローチ。',
        '顧客が即決した理由: 「開発エンジニアにテストをやらせると嫌がる・見落とす」という現場の不満を完全切除。',
        '手残り利益の実態: 単なる人材派遣ではなく「成果物保証」に近い単価設定により、業界平均を大きく上回るマージンを確保。'
      ],
      sourceNote: 'SHIFT 創業ストーリー / 決算説明会資料'
    },
    {
      id: 'ev_shift_trap',
      type: 'INCUMBENT_TRAP',
      title: '【ライバルが真似できない理由】なぜNTTデータや野村総研などの巨人は対抗できなかったのか',
      badge: '競合の弱点',
      evidenceStatus: 'REPORTED',
      punchline: '大手SIerは開発の上流工程（要件定義・設計）で高単価人月を売るビジネスモデルのため、「テストだけ」を専門に引き受けると自社の売上単価を下げてしまうため手を出せなかった。',
      details: [
        '大企業の弱点: 大手SIerは「テストは新人がやる下流作業」と軽視しており、テスト業務を標準化・専門化するインセンティブが構造上ゼロだった。',
        '真似できない独自の現場ノウハウ: 10万人以上が受験したCAT検定データと、過去数万件のバグ検出ナレッジが参入障壁となり後発が追いつけない。'
      ]
    }
  ],

  ent_wework_landmine: [
    {
      id: 'ev_wework_bleed',
      type: 'FATAL_BLEED',
      title: '【失敗の検証】15年の長期固定リースを月次で又貸しするバブルが金利上昇と空室で即死',
      badge: '失敗の検証',
      evidenceStatus: 'VERIFIED',
      punchline: '「世界を変えるテックコミュニティ」という看板で評価額5兆円まで吊り上げたが、実態は単なる不動産の又貸し（15年の重い賃料債務を背負い、客にはいつでも解約できる月次契約で貸す）。月間60億円の出血で連邦破産法11条を申請。',
      details: [
        '致命的な構造欠陥: 資産を持たずに長期リース（負債数兆円）を抱え、収入側は短期解約可能というキャッシュフローの致命的ミスマッチ。',
        '金利上昇とリモートワークの直撃: コロナ禍でオフィス需要が急減し、空室だらけになってもビルオーナーへの巨額賃料支払いは毎月発生。',
        '創業者私物化とガバナンス崩壊: 創業者が個人所有する不動産をWeWorkに高値で借りさせるなど利益相反が横行。'
      ],
      metrics: [
        { label: 'ピーク評価額', value: '約¥5兆円', isHighlight: true },
        { label: '破産時負債総額', value: '約¥2.7兆円' },
        { label: '月間赤字出血', value: '約¥60億円' },
        { label: '最終ステータス', value: '破産申請' }
      ],
      sourceNote: '2023年 SEC Form 10-K / 米連邦破産裁判所 提出書類'
    },
    {
      id: 'ev_wework_lesson',
      type: 'THE_CRIME',
      title: '【失敗からの教訓】「テックの皮をかぶった伝統的労働集約・資本集約ビジネス」の幻想崩壊',
      badge: '失敗からの教訓',
      evidenceStatus: 'VERIFIED',
      punchline: 'ソフトウェアと異なり、机や椅子、ビル賃料という物理的固定費はスケールしても限界費用がゼロにならない。VCマネーを燃やして実態のない成長を装うモデルは金利のある世界では即死する。',
      details: [
        '錯覚の前提: 「コミュニティとアプリ」を強調することでソフトウェア企業と同じ売上マルチプル（PER 50倍）を投資家に信じ込ませた。',
        '得られた教訓: 限界利益率が低い物理ビジネスに、ソフトウェアSaaSの拡大手法（赤字垂れ流し急拡大）を持ち込むと破滅する。'
      ],
      sourceNote: 'Wall Street Journal WeWork崩壊スクープ'
    }
  ],

  ent_ghost_3c99a012: [
    {
      id: 'ev_ghost_model',
      type: 'LOOT_BLUEPRINT',
      title: '【儲かる仕組み】WordPressの保守地獄とSubstackの手数料搾取を拒絶するクリエイター向け課金CMS',
      badge: 'ビジネスモデル',
      evidenceStatus: 'VERIFIED',
      punchline: 'オープンソースの透明性と、Stripe決済連携済みホスティング（Ghost(Pro)）を武器に、流通手数料0%・月額固定SaaSで年商約10億円（ARR $6.5M）を自律回収。',
      details: [
        '【課題の特定】: WordPressはプラグイン競合や脆弱性対応で保守費用が跳ね上がり、Substackは売上の10%を手数料として永続搾取する。',
        '【独自の工夫】: 記事作成、メルマガ一斉配信、Stripe定期課金が最初から一体化。手数料を取らない「月額固定制」で大口クリエイターを総取り。',
        '【収益化の仕組み】: ARR $6.5M（約10億円）。非営利財団運営のため株主配当がなく、稼いだ利益は全額プロダクト改善に投下。'
      ],
      metrics: [
        { label: 'ARR規模', value: '¥10億円 ($6.5M)', isHighlight: true },
        { label: '決済手数料徴収', value: '0%' },
        { label: '組織体制', value: '約30名' },
        { label: '外部VC調達', value: '¥0' }
      ],
      sourceNote: 'Ghost Foundation 公式Baremetrics公開ダッシュボード (2024年)'
    },
    {
      id: 'ev_ghost_crime',
      type: 'THE_CRIME',
      title: '【初動の突破口】元WordPressコア開発者が「純粋なブログに戻る」と叫んだKickstarterの熱狂',
      badge: '集客の事実ログ',
      evidenceStatus: 'VERIFIED',
      punchline: '創業者が「WordPressは肥大化しすぎてブログツールではなくなった」と課題を突くプロモーション動画を公開し、Kickstarterで初月約3,000万円を集めて初期ファンとキャッシュを同時獲得。',
      details: [
        '初動の集客ログ: クラウドファンディングで目標金額の8倍を調達し、初期の熱狂的エンジニア・ブロガーコミュニティを形成。',
        '顧客が即決した理由: オープンソースであるため「いつでもデータを自社サーバーへ持ち出せる」という安心感。'
      ],
      sourceNote: 'Ghost Kickstarter キャンペーン記録 / 創業者ブログ'
    },
    {
      id: 'ev_ghost_trap',
      type: 'INCUMBENT_TRAP',
      title: '【ライバルが真似できない理由】なぜSubstackやMediumなどの大手プラットフォームは対抗できないのか',
      badge: '競合の弱点',
      evidenceStatus: 'REPORTED',
      punchline: 'Substackは「売上の10%手数料」が自社の生命線であるため、「手数料0%で固定月額制」にすると既存売上を自ら破壊してしまう。Ghostは高収益クリエイターほど乗り換える必然の構造を構築。',
      details: [
        '大手プラットフォームの弱点: 手数料ビジネスモデルの会社は、年商数千万円〜数億円を稼ぐトップクリエイターにとって「搾取装置」に見えてしまう。',
        '他社へ乗り換えられない仕組み: 会員データベースと決済顧客情報を自社Stripeアカウントに完全に紐付けているため、他社CMSへの移行リスクがない。'
      ]
    }
  ],

  ent_theranos_postmortem_dead: [
    {
      id: 'ev_theranos_bleed',
      type: 'FATAL_BLEED',
      title: '【失敗の検証】「指先1滴の血液で200項目検査」という医学的嘘で1,000億円超を騙し取ったペテンの結末',
      badge: '失敗の検証',
      evidenceStatus: 'VERIFIED',
      punchline: '自社開発機「Edison」は全く動かず、裏でシーメンス等の市販機器で薄めた血液を無断測定し誤診を連発。ウォール・ストリート・ジャーナルの内部告発スクープで崩壊し、創業者ホームズは禁錮11年3ヶ月の判決で服役中。',
      details: [
        '致命的な詐欺手口: 指先の毛細血管血は細胞が壊れやすく検査精度が出ないという生物学的限界を隠蔽し、投資家やドラッグストア大手（Walgreens）を欺罔。',
        '欺瞞の煙幕: スティーブ・ジョブズを模倣した黒いタートルネックと低音の語り口で、老舗VCや政財界の重鎮（キッシンジャー元国務長官ら）を取締役会に並べて批判を封殺。',
        '破滅の瞬間: WSJ記者ジョン・キャリールーの徹底取材と、内部告発者（タイラー・シュルツら）の証言により虚偽検査が暴かれ会社清算。'
      ],
      metrics: [
        { label: '騙し取った調達額', value: '約¥1,000億円 ($945M)', isHighlight: true },
        { label: 'ピーク評価額', value: '約¥1.3兆円 ($9B)' },
        { label: '実際の検査売上', value: 'ほぼ¥0' },
        { label: '創業者判決', value: '懲役11年3ヶ月' }
      ],
      sourceNote: 'SEC公式告発状 / 米連邦地方裁判所 判決記録 / WSJスクープ書籍「Bad Blood」'
    },
    {
      id: 'ev_theranos_lesson',
      type: 'THE_CRIME',
      title: '【失敗からの教訓】科学的検証（ピアレビュー）を拒絶する「ブラックボックス」への盲信の罠',
      badge: '失敗からの教訓',
      evidenceStatus: 'VERIFIED',
      punchline: '「企業秘密・特許防御」を口実に第三者検証を一切拒絶する技術は99%詐欺である。デューデリジェンスを怠り、著名人の推薦という「社会的証明」だけで群がった投資家コミュニティの集団心理の敗北。',
      details: [
        '錯覚の前提: ソフトウェア業界の「Fake it till you make it（成功するまでハッタリをかませ）」を、人命に関わる医療・ヘルスケア分野に持ち込んだことによる悲劇。',
        '得られた教訓: 技術的正しさを第三者が検証できないブラックボックス事業には1円たりとも投資してはならない。'
      ],
      sourceNote: 'Bad Blood（ジョン・キャリールー著）'
    }
  ],

  ent_ftx_postmortem_dead: [
    {
      id: 'ev_ftx_bleed',
      type: 'FATAL_BLEED',
      title: '【失敗の検証】顧客の預託金1兆円以上を裏ファンドに横流しし、わずか72時間の取り付け騒ぎで即死',
      badge: '失敗の検証',
      evidenceStatus: 'VERIFIED',
      punchline: '「機関投資家御用達の最も安全な取引所」を自称しながら、裏では顧客資産を秘密のバックドアから関連ヘッジファンド（Alameda Research）に全額不正流用。バイナンスCEOのツイートを発端とする出金ラッシュで資金が枯渇し破産。',
      details: [
        '横領のメカニズム: 取引所FTXのコードにAlameda限定の「清算免除・残高マイナス許可」バックドアを秘密裏に実装し、顧客のビットコインやドルを勝手に投機に浪費。',
        'ガバナンスゼロの杜撰さ: 社内に経理部門すらまともに存在せず、数十億ドルの取引をチャットツール（Slack/Signal）のメッセージと絵文字で承認していた実態が破産管財人により露呈。',
        '創業者の末路: 創業者サム・バンクマン＝フリード（SBF）は詐欺・共謀罪など7つの重罪で有罪評決を受け、懲役25年の実刑判決。'
      ],
      metrics: [
        { label: '不正流用額', value: '約¥1.2兆円 ($8B+)', isHighlight: true },
        { label: 'ピーク評価額', value: '約¥4.8兆円 ($32B)' },
        { label: '破綻所要時間', value: 'わずか72時間' },
        { label: '創業者判決', value: '懲役25年' }
      ],
      sourceNote: '米デラウェア州連邦破産裁判所 破産管財人ジョン・レイ3世 報告書'
    },
    {
      id: 'ev_ftx_lesson',
      type: 'THE_CRIME',
      title: '【失敗からの教訓】「利害関係者による市場独占」と「分別管理のない取引所」の即死リスク',
      badge: '失敗からの教訓',
      evidenceStatus: 'VERIFIED',
      punchline: '取引所（胴元）とマーケットメイカー（プレイヤー）が同一人物に支配されている構造は、顧客資産を自分の財布と勘違いするモラルハザードを必然的に生み出す。',
      details: [
        '錯覚の前提: 慈善活動（効果的利他主義）をアピールし、ワシントン政界へ巨額献金を行うことで規制当局の追及を逃れられると過信。',
        '得られた教訓: カストディ（資産保全）と取引執行が分離されていないプラットフォームは、どれほど巨大であっても一瞬で破綻する。'
      ],
      sourceNote: 'SECおよびCFTC 告発記録'
    }
  ],

  ent_typingmind_3a81f902: [
    {
      id: 'ev_typingmind_model',
      type: 'LOOT_BLUEPRINT',
      title: '【儲かる仕組み】推論API原価をユーザーに丸投げし、完全1人で月商¥900万・利益率85%を抜くUI関所',
      badge: 'ビジネスモデル',
      evidenceStatus: 'REPORTED',
      punchline: '公式ChatGPTの「検索できない・フォルダ整理できない・モデル切り替えが面倒」という不満を、ローカルストレージ動作のWebUIで解決。推論サーバーを持たずAPIキーを自己入力させるため原価ほぼゼロ。',
      details: [
        '【課題の特定】: 公式ChatGPTのUIは会話履歴の検索が貧弱で、プロンプト保存やチーム共有ができない。',
        '【独自の工夫】: ユーザー自身のOpenAI/AnthropicのAPIキーを使わせるため、開発者は高額な推論サーバー代を1円も負担しない。全データはブラウザのLocalStorageに保存。',
        '【収益化の仕組み】: 買い切りライセンス（$39〜$99）およびチーム向けサブスクで月商約$60,000（約900万円）、利益率85%以上。'
      ],
      metrics: [
        { label: '月商規模', value: '¥900万円 ($60k)', isHighlight: true },
        { label: '営業利益率', value: '85.6%' },
        { label: '運営体制', value: '完全1人' },
        { label: '推論インフラ原価', value: 'ほぼ¥0' }
      ],
      sourceNote: 'Tony Dinh 公式X・MRR公表ログ (2024年)'
    },
    {
      id: 'ev_typingmind_crime',
      type: 'THE_CRIME',
      title: '【初動の突破口】Twitterで開発過程を画面録画で実況し、公開初日に数千ドルをStripe即着金させたゲリラ',
      badge: '集客の事実ログ',
      evidenceStatus: 'REPORTED',
      punchline: '「公式UIが使いにくいから自分用に作った」と画面動画をXにポストしたところ爆発的に拡散。Gumroadの決済リンクを即座に貼り、数日で初期ユーザー数千人を獲得。',
      details: [
        '初動のアクション: #buildinpublic のハッシュタグで、毎日の機能追加動画をテンポよく投稿してファンを育成。',
        '顧客が即決した理由: 公式Plus（月$20）を払い続けるより、APIキー入力＋UI買い切りの方がヘビーユーザーにとって圧倒的に安く高性能だったため。'
      ],
      sourceNote: 'Tony Dinh ブログ「How I built TypingMind」'
    },
    {
      id: 'ev_typingmind_trap',
      type: 'INCUMBENT_TRAP',
      title: '【ライバルが真似できない理由】なぜOpenAIなどの巨人はこのUI改善を自らやらないのか',
      badge: '競合の弱点',
      evidenceStatus: 'REPORTED',
      punchline: 'OpenAIの至上命題はフロンティアモデルの研究開発と大衆向けシンプルUIの維持であり、パワーユーザー向けのニッチな機能（プロンプト変数・詳細フォルダ等）を作り込む優先順位が極端に低い。',
      details: [
        '巨人の弱点: 一般ユーザー8,000万人に配慮すると、画面をボタンだらけにするプロ向けUIは導入できない。',
        '身軽さの強み: 開発者1人がユーザーのリクエストをTwitterで拾い、即日リリースする超高速開発ループで巨人の死角を埋め続ける。'
      ]
    }
  ],

  ent_bannerbear_9e1204c3: [
    {
      id: 'ev_bannerbear_model',
      type: 'LOOT_BLUEPRINT',
      title: '【儲かる仕組み】「毎回Figmaでバナーを作る激痛」をAPI1行で代行し、1人で月商¥750万・利益率72%',
      badge: 'ビジネスモデル',
      evidenceStatus: 'REPORTED',
      punchline: 'ブログのOGP画像やECの商品バナー生成をREST APIとZapier/Airtable連携で完全自動化。ノーコードツール愛好者を取り込み、MRR $50,000（月商約750万円）を完全1人で回収。',
      details: [
        '【課題の特定】: メディア運営者やEC事業者が、記事や商品を公開するたびにデザイナーにバナー画像を依頼する時間の浪費とコスト。',
        '【独自の工夫】: テンプレートをブラウザ上でデザインし、テキストや画像をAPI経由で流し込むだけで数秒でPNG/JPGを自動生成。Zapierプラグインで非エンジニアでも自動化可能。',
        '【収益化の仕組み】: 月額$49〜$299のサブスクリプション。インフラはAWS LambdaとRuby on Railsで低コスト運用。'
      ],
      metrics: [
        { label: 'MRR規模', value: '¥750万円 ($50k)', isHighlight: true },
        { label: '営業利益率', value: '72.0%' },
        { label: '運営体制', value: '完全1人' },
        { label: '生成画像数', value: '月数百〜千万枚' }
      ],
      sourceNote: 'Jon Yongfook 公式ブログ「Open Startup」MRRメトリクス'
    },
    {
      id: 'ev_bannerbear_crime',
      type: 'THE_CRIME',
      title: '【初動の突破口】過去に多数のプロダクトを爆死させた末に「Airtable連携」で跳ねたピボットの軌跡',
      badge: '集客の事実ログ',
      evidenceStatus: 'REPORTED',
      punchline: '創業者は1年で12個のプロダクトを作る挑戦の中で幾度も失敗。当初はInstagram向け自動化だったが、Airtable/Zapierと連携させた瞬間にノーコード界隈で口コミが爆発。',
      details: [
        '初動の集客ログ: IndieHackersやTwitterでの開発実況、およびノーコードコミュニティ向けチュートリアル動画を大量投稿。',
        '顧客が即決した理由: 「記事を書いたら自動でTwitter用画像とアイキャッチが作られる」という完全放置パイプラインの実現。'
      ],
      sourceNote: 'Bannerbear 開発日誌 / IndieHackers ポッドキャスト'
    },
    {
      id: 'ev_bannerbear_trap',
      type: 'INCUMBENT_TRAP',
      title: '【ライバルが真似できない理由】なぜCanvaやAdobeなどのデザイン巨人は対抗できないのか',
      badge: '競合の弱点',
      evidenceStatus: 'REPORTED',
      punchline: 'CanvaやAdobeは「人間がUI上で手動デザインするツール」として設計されており、プログラムから数万枚を一括レンダリングするREST API基盤はビジネスモデルが根本的に異なるため手を出せない。',
      details: [
        '大企業の弱点: 人間向けGUIの課金体系と、システム間連携のAPI課金体系は営業・サポート体制が合致しない。',
        '他社へ乗り換えられない仕組み: 企業の社内ワークフロー（Zapierや社内スクリプト）に一度組み込まれると、解約すると画像が生成されなくなるため解約率が極めて低い。'
      ]
    }
  ],

  ent_convertkit_5b219e84: [
    {
      id: 'ev_convertkit_model',
      type: 'LOOT_BLUEPRINT',
      title: '【儲かる仕組み】Mailchimpの複雑さに絶望したクリエイターを救い、外部調達ゼロで年商¥60億円',
      badge: 'ビジネスモデル',
      evidenceStatus: 'VERIFIED',
      punchline: 'ECや大企業向けに機能が肥大化したMailchimpを捨て、ブロガー・YouTuber・作家に特化した直感的なメルマガ配信・自動販売ファネルを提供。ARR $40M（年商約60億円）、年利約13億円を回収。',
      details: [
        '【課題の特定】: 既存のメール配信スタンドは大企業向けで複雑怪奇、配信リストごとに課金されて重複課金が発生する不条理。',
        '【独自の工夫】: 1人の読者は1つのアカウントでタグ管理。直感的なビジュアルオートメーションで、ステップメールとデジタル商品販売を即座に構築。',
        '【収益化の仕組み】: 読者数に応じた従量サブスクリプション。外部VCの調達ゼロで創業し、巨額のキャッシュフローを配当と自社開発に投資。'
      ],
      metrics: [
        { label: 'ARR規模', value: '¥60億円 ($40M)', isHighlight: true },
        { label: '年間利益手残り', value: '約¥13億円' },
        { label: '外部資金調達', value: '¥0 (完全自力)' },
        { label: '顧客クリエイター数', value: '60万人+' }
      ],
      sourceNote: 'Nathan Barry 公式Baremetrics公開ダッシュボード (2024年)'
    },
    {
      id: 'ev_convertkit_crime',
      type: 'THE_CRIME',
      title: '【初動の突破口】創業者がプロブロガーへ直接スカイプで電話し「無料お引越し代行」で泥臭く強奪',
      badge: '集客の事実ログ',
      evidenceStatus: 'VERIFIED',
      punchline: '創業者ネイサン・バリーが、有力なプロブロガー一人ひとりに直接連絡を取り、「Mailchimpからの移行作業を僕が全部手動で無料でやります」と提案して初期の有力顧客を丸ごと乗り換えさせた。',
      details: [
        '初動のゲリラ戦術: スイッチングコスト（移行の手間）を創業者自らの手作業労働でゼロにし、トップブロガーを仲間に引き入れた。',
        '紹介プログラムの威力: 乗り換えたトップブロガーたちに売上の30%を永続還元するアフィリエイトを提供し、彼らが自発的にConvertKitを記事や動画で宣伝するループを確立。'
      ],
      sourceNote: 'Nathan Barry 著書およびポッドキャスト記録'
    },
    {
      id: 'ev_convertkit_trap',
      type: 'INCUMBENT_TRAP',
      title: '【ライバルが真似できない理由】なぜMailchimpはConvertKitの猛追を止められなかったのか',
      badge: '競合の弱点',
      evidenceStatus: 'REPORTED',
      punchline: 'Mailchimpはインテュイット（Intuit）に120億ドルで買収され、中小企業全体の汎用マーケティングツールへ舵を切ったため、個人クリエイターの切実な要望（タグ付け・商品販売）にフォーカスできなくなった。',
      details: [
        '大企業の弱点: 大衆向けの多機能化を進めるほど、特定の高単価セグメント（プロクリエイター）の使い勝手が悪化する。',
        '他社へ乗り換えられない仕組み: メルマガ配信者の全顧客リスト、購入履歴、自動化シナリオがConvertKit内に蓄積され、移行コストが膨大になる。'
      ]
    }
  ],

  ent_tailwind_4c810a72: [
    {
      id: 'ev_tailwind_model',
      type: 'LOOT_BLUEPRINT',
      title: '【儲かる仕組み】無料OSSで世界のエンジニアを依存させ、有料テンプレで年商¥22.5億円・利益率80%',
      badge: 'ビジネスモデル',
      evidenceStatus: 'REPORTED',
      punchline: '「Tailwind CSS」を世界一のデファクトオープンソースとして無料配備。エンジニア全員に技術を依存させた上で、公式の高品質コンポーネント集「Tailwind UI」を買い切り直販し、年商15Mドル（約22.5億円）を叩き出す。',
      details: [
        '【課題の特定】: Bootstrapなどの既存CSSはデザインが画一的になり、自前CSSはクラス名の命名やファイル肥大化で破綻するエンジニアの苦痛。',
        '【独自の工夫】: ユーティリティファーストという新しい思想をオープンソースで定着させ、GitHubスター数千万人規模の巨大エコシステムを構築。',
        '【収益化の仕組み】: 企業の開発者が「車輪の再発明」を避けるために喜んで経費精算する公式UIコンポーネントライブラリを$299等で直販。原価ゼロ・利益率80%超。'
      ],
      metrics: [
        { label: '年商規模', value: '¥22.5億円 ($15M)', isHighlight: true },
        { label: '営業利益率', value: '80.3%' },
        { label: 'npm月間DL数', value: '数千万回' },
        { label: '外部資金調達', value: '¥0' }
      ],
      sourceNote: 'Adam Wathan 公式ポッドキャスト「Full Stack Radio」/ 決算公表'
    },
    {
      id: 'ev_tailwind_crime',
      type: 'THE_CRIME',
      title: '【初動の突破口】リリース初日でStripeに数千万円が着金した「開発者コミュニティの信頼預金」',
      badge: '集客の事実ログ',
      evidenceStatus: 'REPORTED',
      punchline: '何年も無料で最高のツールを提供し続け、YouTubeで美しいUIを組み上げるライブコーディングを配信。圧倒的な信頼を築いた上で「Tailwind UI」を公開した瞬間、数時間で数千万円の注文が殺到。',
      details: [
        '初動のマーケティング: 広告費は完全ゼロ。創業者TwitterとYouTubeでの圧倒的な技術発信のみで需要を極限まで加熱。',
        '法人の財布を直撃: 「デザイナーに外注すると数十万円かかるUIが数万円で手に入る」ため、エンジニアが上司に1秒で経費承認させた。'
      ],
      sourceNote: 'Adam Wathan Twitter / Stripe管理画面公開ログ'
    },
    {
      id: 'ev_tailwind_trap',
      type: 'INCUMBENT_TRAP',
      title: '【ライバルが真似できない理由】なぜBootstrapや他社フレームワークはこの収益モデルを作れなかったのか',
      badge: '競合の弱点',
      evidenceStatus: 'REPORTED',
      punchline: '多くのオープンソース開発者は「寄付」や「コンサル・受託」に逃げてしまい、フレームワークと完全に調和した直販デジタル資産（自社テンプレート）のプロダクト化に専念できなかった。',
      details: [
        '競合の弱点: コミュニティ運営と商用プロダクト販売の境界設計が下手で、ユーザーの反発を恐れてマネタイズに踏み切れない。',
        '圧倒的なブランド認知とスピード: 「Tailwind公式が作ったデザイン」という権威性があるため、サードパーティのテンプレート業者が太刀打ちできない。'
      ]
    }
  ],

  ent_disco_6146_jp: [
    {
      id: 'ev_disco_model',
      type: 'LOOT_BLUEPRINT',
      title: '【儲かる仕組み】半導体を「切る・削る・磨く」砥石と装置で世界シェア80%独占、営業利益1,000億円超',
      badge: 'ビジネスモデル',
      evidenceStatus: 'VERIFIED',
      punchline: 'シリコンウェーハを極限まで薄く切り分けるダイシングソー装置と、消耗品であるダイヤモンドブレード（砥石）の両方を自社製造。世界中の半導体工場に装置を設置させ、消耗品で永続的に現金を回収する日本の怪物。',
      details: [
        '【課題の特定】: AI半導体（GPU）やスマートフォン向けチップは極限の薄さと高密度化が求められ、ウェーハを切断する際の微小なヒビ割れすら許されない。',
        '【独自の工夫】: 顧客の半導体材料に応じた特注の砥石と切断装置をワンストップで最適化。他社製砥石を使うと歩留まりが落ちるため他社を完全排除。',
        '【収益化の仕組み】: 2024年3月期売上3,077億円、営業利益1,061億円（営業利益率34.5%）。高価格装置の販売に加え、稼働するほど売れる消耗品（砥石）のストックビジネス。'
      ],
      metrics: [
        { label: '年商規模', value: '¥3,077億円', isHighlight: true },
        { label: '年間営業利益', value: '¥1,061億円' },
        { label: '世界市場シェア', value: '70〜80%' },
        { label: '従業員平均年収', value: '約¥1,500万円' }
      ],
      sourceNote: '株式会社ディスコ 2024年3月期 有価証券報告書'
    },
    {
      id: 'ev_disco_crime',
      type: 'THE_CRIME',
      title: '【初動の突破口】「難削材の切断」という他社が嫌がる最も面倒な課題に現場密着で食い込んだ歴史',
      badge: '集客の事実ログ',
      evidenceStatus: 'VERIFIED',
      punchline: 'かつて万年筆のペン先スリットを入れる砥石から始まり、半導体メーカーが新素材の切断に悩むたびに自社研究所で無償テスト切断を代行。「ディスコに相談すれば必ず切れる」という信頼を構築して独占へ。',
      details: [
        '現場密着のアプリケーションラボ: 顧客のシリコン材料を預かり、最適な切断条件を導き出すラボを全世界で展開。',
        '社内通貨「Will」による超高効率経営: 全社員が社内通貨で仕事を受発注する独自制度により、無駄な社内官僚主義を完全排除。'
      ],
      sourceNote: 'ディスコ社史「高度技術への挑戦」/ 各種IR資料'
    },
    {
      id: 'ev_disco_trap',
      type: 'INCUMBENT_TRAP',
      title: '【ライバルが真似できない理由】なぜ海外の巨大工作機械メーカーや競合はシェアを奪えないのか',
      badge: '競合の弱点',
      evidenceStatus: 'REPORTED',
      punchline: '半導体工場にとって、切断工程での失敗（ウェーハ破損）は数千万円単位の損害になるため、数%安いからといって信頼のない他社装置に乗り換える動機が絶対に存在しない。',
      details: [
        '大企業の弱点: 単に装置を作るだけでなく、素材ごとの砥石の調合（ケミカルノウハウ）と機械制御の擦り合わせが必要なため、模倣が極めて困難。',
        '他社へ乗り換えられない仕組み: TSMCやサムスン、インテル等の製造ラインに深く組み込まれており、切断プロセスの変更自体が莫大なリスクとなる。'
      ]
    }
  ],

  ent_fast_postmortem_dead: [
    {
      id: 'ev_fast_bleed',
      type: 'FATAL_BLEED',
      title: '【失敗の検証】180億円を調達し月15億円を広告・見栄に溶かして年商わずか70万円で即死',
      badge: '失敗の検証',
      evidenceStatus: 'VERIFIED',
      punchline: '「ネットショッピングの1クリック決済」という、すでにApple PayやShopify Payが無料で解決済みの領域に180億円を調達。ナスカーのスポンサーや派手なPRで月15億円を垂れ流し、実際の年商わずか数十万円で資金ショート。',
      details: [
        '致命的な市場の誤認: ブラウザやShopify、Stripeがすでに決済情報を記憶している時代に、わざわざ別アカウントを作らせるFastを導入するEC事業者は皆無だった。',
        '虚飾のマーケティング: 顧客獲得ではなく創業者Domm Holland自身のSNSインフルエンサー化と見栄に巨額資金を浪費。',
        '破滅の瞬間: 資金調達環境の悪化で追加出資を拒絶され、社員400人を抱えたまま創業からわずか2年で会社清算。'
      ],
      metrics: [
        { label: '調達総額', value: '約¥180億円 ($120M)', isHighlight: true },
        { label: '月間赤字出血', value: '約¥15億円 ($10M)' },
        { label: '公表直前の年商', value: '約¥75万円 ($50k)' },
        { label: 'ステータス', value: '即死倒産' }
      ],
      sourceNote: 'NPR報道 / The Information スクープ取材記録'
    },
    {
      id: 'ev_fast_lesson',
      type: 'THE_CRIME',
      title: '【失敗からの教訓】「プラットフォーム標準機能」と正面衝突する事業に大金を投じる愚行',
      badge: '失敗からの教訓',
      evidenceStatus: 'VERIFIED',
      punchline: 'ShopifyやApple、GoogleがOS・プラットフォームレベルで提供している無料機能（Shop Pay, Apple Pay）に対して、独立したSaaSが対抗することは構造的に不可能である。',
      details: [
        '錯覚の前提: Stripeが出資したという箔付けだけで、製品の実効性がないまま評価額が暴騰した典型的なバブルの被害。',
        '得られた教訓: ユーザーにとって「すでに解決済みの痛み」にどれほど巨額の広告費を投じても、真の需要は1ミリも生まれない。'
      ],
      sourceNote: 'The Information「Inside the Fast Collapse」'
    }
  ],

  ent_screenshotone_d87b1c42: [
    {
      id: 'ev_screenshotone_model',
      type: 'LOOT_BLUEPRINT',
      title: '【儲かる仕組み】「PuppeteerのCookieバナー・メモリリーク激痛」を1行APIで切除し月商¥495万',
      badge: 'ビジネスモデル',
      evidenceStatus: 'REPORTED',
      punchline: 'Webサイトのスクリーンショット撮影APIに特化。Cookie同意バナーやチャットウィジェットの自動非表示、広告ブロックを1行のURLパラメータで完結させ、利益率84.8%で月商$33,000を自律回収。',
      details: [
        '【課題の特定】: 自前でヘッドレスChrome（Puppeteer）を動かすと、サーバーのメモリ爆発、Cookieポップアップによる画面遮蔽、Webフォント読み込み遅延で開発者が病む。',
        '【独自の工夫】: あらゆる言語（Python, Node, Go）からURLを投げるだけで、きれいに広告やバナーが除去されたPNG/PDFをミリ秒で返却。',
        '【収益化の仕組み】: 月額$19〜$299のクレジット制サブスク。自前の低コストベアメタルサーバー（Hetzner）で稼働させ、AWSの1/5のインフラ原価を実現。'
      ],
      metrics: [
        { label: 'MRR規模', value: '¥495万円 ($33k)', isHighlight: true },
        { label: '営業利益率', value: '84.8%' },
        { label: '運営体制', value: '完全1人' },
        { label: 'インフラ原価率', value: '約8%' }
      ],
      sourceNote: 'Dmytro Krasun 公式X・MRR公表ログ (2024年)'
    },
    {
      id: 'ev_screenshotone_crime',
      type: 'THE_CRIME',
      title: '【初動の突破口】SEOとオープンソース代替ツールの比較ページを量産して検索流入を総取り',
      badge: '集客の事実ログ',
      evidenceStatus: 'REPORTED',
      punchline: '「Puppeteer screenshot cookie banner」「Html2canvas alternative」等のエンジニアが絶望してGoogle検索する超ニッチなキーワードに特化した技術ブログと比較LPを徹底作成し、広告費ゼロで集客。',
      details: [
        '初動のSEOパイプライン: 開発者が直面するエラーメッセージそのものをタイトルにした記事で、検索流入から即API無料登録へ誘導。',
        '顧客が即決した理由: 自前サーバーのメンテから解放され、月数十ドルで完璧な画像が撮れるため、エンジニアが即決で購入。'
      ],
      sourceNote: 'Dmytro Krasun 著「How I Grew ScreenshotOne」'
    },
    {
      id: 'ev_screenshotone_trap',
      type: 'INCUMBENT_TRAP',
      title: '【ライバルが真似できない理由】なぜAWSやGoogleなどの大企業はこのニッチに参入しないのか',
      badge: '競合の弱点',
      evidenceStatus: 'REPORTED',
      punchline: 'AWSのLambdaやGoogle Cloudにとって、市場規模数十億円のスクリーンショット特化APIは小さすぎて事業部門が立ち上がらない。個人開発者が細部（バナーブロック、絵文字対応）を磨き込むことで鉄壁のニッチ要塞を構築。',
      details: [
        '大企業の死角: 巨大インフラ企業は汎用サーバーを売るのが仕事であり、「特定のサイトのCookie同意バナーを消す」ような泥臭いメンテナンスは絶対にやらない。',
        '他社へ乗り換えられない仕組み: 顧客のサービス（SEO監視ツール、OGP生成）のコアパイプラインに組み込まれているため、チャーンレートが極めて低い。'
      ]
    }
  ],

  ent_scrapingbee_4f92a188: [
    {
      id: 'ev_scrapingbee_model',
      type: 'LOOT_BLUEPRINT',
      title: '【儲かる仕組み】CloudflareのBot対策を突破するスクレイピング代行で創業者2人で年商¥7.5億円',
      badge: 'ビジネスモデル',
      evidenceStatus: 'REPORTED',
      punchline: 'Webスクレイピング時のIPブロック、CAPTCHA突破、ヘッドレスブラウザ実行をすべて裏側で肩代わり。創業者2人でARR $5M（年商約7.5億円）、営業利益率67.2%を叩き出し、数年で数十億円で大手Bright Dataへエグジット。',
      details: [
        '【課題の特定】: 自前でWebクローラーを作ると、相手サイトのBot遮断（Cloudflare, Akamai）やプロキシ管理に莫大な時間と費用を取られる。',
        '【独自の工夫】: 数百万のローテーションプロキシとヘッドレスブラウザをAPIの裏に束ね、ユーザーは単純なGETリクエストを送るだけで生のHTMLを取得可能。',
        '【収益化の仕組み】: 成功したリクエストに応じた従量クレジット課金（月$49〜$999+）。高利益率を維持したまま大手へ巨額売却。'
      ],
      metrics: [
        { label: 'ARR規模', value: '¥7.5億円 ($5M)', isHighlight: true },
        { label: '営業利益率', value: '67.2%' },
        { label: '創業チーム', value: '創業者2名' },
        { label: 'エグジット先', value: 'Bright Data (買収)' }
      ],
      sourceNote: 'Etienne Dilocker / Kevin Sahin 公式公開ログ / 買収報道'
    },
    {
      id: 'ev_scrapingbee_crime',
      type: 'THE_CRIME',
      title: '【初動の突破口】圧倒的に詳しい「Webスクレイピング完全ガイド」を執筆しSEOを完全制圧',
      badge: '集客の事実ログ',
      evidenceStatus: 'REPORTED',
      punchline: '「Python web scraping tutorial」「How to scrape without getting blocked」といった長文の技術チュートリアルを創業者自ら徹底的に執筆。Google検索で1位を独占し、毎月数万人の開発者を無料流入させた。',
      details: [
        '初期のコンテンツマーケティング: 広告費ゼロ。プログラマーがコピペして動かせる高品質なコードサンプルを公開し、開発者の信頼を完全に掌握。',
        '顧客が即決した理由: 「自分でプロキシを契約して設定するより、ScrapingBeeを呼んだ方が開発期間が1ヶ月短縮できる」という明快な費用対効果。'
      ],
      sourceNote: 'Kevin Sahin 著書「Make Art from Technology」'
    },
    {
      id: 'ev_scrapingbee_trap',
      type: 'INCUMBENT_TRAP',
      title: '【ライバルが真似できない理由】なぜ大手のプロキシ業者やクラウド巨人はこのUXを作れなかったのか',
      badge: '競合の弱点',
      evidenceStatus: 'REPORTED',
      punchline: '既存の大手プロキシ販売会社（Luminati等）は通信量課金（GB単位）で契約が難解であり、開発者が欲しい「API 1本でレンダリング結果を返す」という超シンプルな開発者体験（DX）を提供できなかった。',
      details: [
        '大企業の弱点: 既存プロキシ業者はエンタープライズ向けの泥臭い営業モデルに固執し、セルフサーブでクレジットカード決済して即時使えるUIを作れなかった。',
        '他社へ乗り換えられない仕組み: 一度顧客のプロダクトにAPIが埋め込まれると、動作安定性を捨てて他社へ切り替えるリスクを誰も取らない。'
      ]
    }
  ],

  ent_plausible: [
    {
      id: 'ev_plausible_model',
      type: 'LOOT_BLUEPRINT',
      title: '【儲かる仕組み】GA4の重さとCookie同意バナーの離脱激痛を切除し、2人で月商¥2,025万・利益率77%',
      badge: 'ビジネスモデル',
      evidenceStatus: 'VERIFIED',
      punchline: '「Google Analytics（GA4）が複雑怪奇で使いにくく、Cookie同意バナーのせいでコンバージョンが落ちる」という全Web担当者の不満を、1KBの軽量スクリプトと1画面ダッシュボードで救済。月商約2,025万円（MRR $135k）を回収。',
      details: [
        '【課題の特定】: GA4は画面が複雑で知りたい数字に辿り着けず、GDPR準拠のためのクッキー同意バナーがサイト訪問者の離脱を引き起こす。',
        '【独自の工夫】: クッキーを一切使用しない完全プライバシー準拠。同意バナー不要で、サイトの全重要メトリクス（PV、参照元、ゴール達成）が1画面で0.1秒で把握可能。',
        '【収益化の仕組み】: サイトの月間PVに応じた月額$9〜のサブスクリプション。インフラはHetzner上で自社運用し、利益率77%を達成。'
      ],
      metrics: [
        { label: 'MRR規模', value: '¥2,025万円 ($135k)', isHighlight: true },
        { label: '営業利益率', value: '77.0%' },
        { label: '運営体制', value: '創業者2名' },
        { label: 'スクリプト容量', value: '1KB以下 (GA4の1/45)' }
      ],
      sourceNote: 'Plausible Analytics 公式Open Metrics公開ダッシュボード (2024年)'
    },
    {
      id: 'ev_plausible_crime',
      type: 'THE_CRIME',
      title: '【初動の突破口】「Googleの監視資本主義を拒絶する」という大義名分でHacker Newsの熱狂を獲得',
      badge: '集客の事実ログ',
      evidenceStatus: 'VERIFIED',
      punchline: '「なぜ我々はGoogle Analyticsを捨ててオープンソースで自作したのか」という理念記事をHacker Newsに投稿し、数万PVと数千人の初期有料会員を獲得。',
      details: [
        '初動のナラティブ構築: 「Googleに無料ユーザーデータを渡すな」「Webを軽量でプライバシー重視の場所に戻そう」という倫理的大義を掲げて開発者を味方につけた。',
        '完全な財務公開: 自社の売上、トラフィック、解約率をすべて公開する「Open Startup」として信頼を担保。'
      ],
      sourceNote: 'Plausible公式ブログ / Hacker News トレンドログ'
    },
    {
      id: 'ev_plausible_trap',
      type: 'INCUMBENT_TRAP',
      title: '【ライバルが真似できない理由】なぜGoogleはPlausibleのような使いやすいUIを作れないのか',
      badge: '競合の弱点',
      evidenceStatus: 'REPORTED',
      punchline: 'Google Analyticsの真の目的はサイト分析ではなく「Google広告のターゲティングのための個人データ収集」であるため、「Cookieを使わず個人追跡をしない」というPlausibleのモデルはGoogleの広告ビジネスモデルそのものと矛盾する。',
      details: [
        '巨人のジレンマ: Googleが個人追跡をやめたら、年間数百億ドルの広告最適化エンジンが機能不全に陥る。',
        '他社へ乗り換えられない仕組み: 過去のアクセス解析データが蓄積され、クライアントへの報告レポートに組み込まれることで解約を防止。'
      ]
    }
  ],

  ent_carrd_6a69c797d0b28fc91fe6: [
    {
      id: 'ev_carrd_model',
      type: 'LOOT_BLUEPRINT',
      title: '【儲かる仕組み】WordPressやWebflowの多機能・高額課金に疲弊した個人を年$19で救い年商¥3.7億円',
      badge: 'ビジネスモデル',
      evidenceStatus: 'REPORTED',
      punchline: '「1ページのシンプルなWebサイト（自己紹介、リンクまとめ、事前登録LP）」に極限特化。他社が月数千円を取る中、「年額$19（月150円）」という破壊的安さで年商2.5Mドル（約3.75億円）・利益率88%を完全1人で叩き出す。',
      details: [
        '【課題の特定】: 個人が簡単なプロフィールサイトやイベントLPを作りたいだけなのに、WebflowやSquarespaceは機能が多すぎて月$20以上と高すぎる。',
        '【独自の工夫】: 1ページ完結に機能を絞り込むことで、サーバー負荷とサポート工数を極小化。誰でも数分で美しいレスポンシブサイトを公開可能。',
        '【収益化の仕組み】: 年額$19〜$49のProプラン。一度払うと解約を忘れる「極小課金」により、累計数百万サイトがホストされ莫大なキャッシュフローを創出。'
      ],
      metrics: [
        { label: 'ARR規模', value: '¥3.75億円 ($2.5M)', isHighlight: true },
        { label: '営業利益率', value: '88.0%' },
        { label: '運営体制', value: '完全1人 (AJ)' },
        { label: '課金単価', value: '年$19〜' }
      ],
      sourceNote: '創業者AJ 公式Twitter・IndieHackers インタビュー'
    },
    {
      id: 'ev_carrd_crime',
      type: 'THE_CRIME',
      title: '【初動の突破口】フッターの「Made with Carrd」リンクが自己増殖する無料マーケティングウイルス',
      badge: '集客の事実ログ',
      evidenceStatus: 'REPORTED',
      punchline: '無料プランの全サイトの最下部に控えめなバッジを配置。Carrdで作られた美しいサイトを見た訪問者が「これ何で作ったの？」とクリックして新規顧客になる自走ループを構築。',
      details: [
        '初動のプロダクトバイラル: 広告費ゼロ。Twitter（X）のプロフィール欄やInstagramの「link in bio」にCarrdのURLが大量に貼られ、自然流入が指数関数的に拡大。',
        'Twitter上での神対応: 創業者AJがユーザーの質問にTwitterで数分以内に直接リプライし、熱狂的なファンコミュニティを形成。'
      ],
      sourceNote: 'IndieHackers「How Carrd hit $1M ARR as a Solo Founder」'
    },
    {
      id: 'ev_carrd_trap',
      type: 'INCUMBENT_TRAP',
      title: '【ライバルが真似できない理由】なぜSquarespaceやWixなどの上場企業はこの低価格を出せないのか',
      badge: '競合の弱点',
      evidenceStatus: 'REPORTED',
      punchline: '上場Webビルダー企業は数千人の社員と巨額のテレビCM広告費を抱えており、「年額$19」のプランを出すとARPU（顧客平均単価）が崩壊して株価が暴落するため、指をくわえて見逃すしかない。',
      details: [
        '大企業の弱点: 巨大な固定費と広告宣伝費を回収するため、プランを年々値上げせざるを得ない構造。',
        '完全1人の極限身軽さ: 社員ゼロ・固定費最小のため、顧客が年間19ドルしか払わなくても利益率88%が残るという非対称な戦い方。'
      ]
    }
  ],

  ent_gumroad_164534dd22fa6c2e2793: [
    {
      id: 'ev_gumroad_model',
      type: 'LOOT_BLUEPRINT',
      title: '【儲かる仕組み】「フルタイム社員ゼロ」の極限身軽組織で、クリエイター流通額の10%を抜く年商¥15億円',
      badge: 'ビジネスモデル',
      evidenceStatus: 'REPORTED',
      punchline: 'クリエイターが電子書籍やフォント、コード、デザイン素材を1分で直販できる決済プラットフォーム。フルタイム社員を全員解雇して業務委託のみに移行し、一律10%の関所手数料で年商約15億円・利益率55%を自走回収。',
      details: [
        '【課題の特定】: クリエイターが自作デジタル商品を売りたいが、ECサイトを立ち上げるのは面倒で、既存プラットフォームは審査や月額固定費が高い。',
        '【独自の工夫】: リンク1つでクレジットカード決済が完了する極限のシンプルさ。月額固定費ゼロで「売れた時だけ10%」というノーリスクモデル。',
        '【収益化の仕組み】: 年間約1,500億円の流通総額から10%の手数料（Stripe手数料控除後の純取り分約6〜7%）を自動徴収。固定人件費ゼロで利益率55%以上。'
      ],
      metrics: [
        { label: '年商規模', value: '¥15億円 ($10M)', isHighlight: true },
        { label: '営業利益率', value: '55.0%' },
        { label: 'フルタイム社員数', value: '0名 (完全委託)' },
        { label: '年間流通総額', value: '約¥1,500億円 ($100M+)' }
      ],
      sourceNote: 'Sahil Lavingia 公式ブログ「No Meetings, No Deadlines, No Full-Time Employees」'
    },
    {
      id: 'ev_gumroad_crime',
      type: 'THE_CRIME',
      title: '【初動の突破口】Pinterest第1号デザイナーが週末の思いつきで作った「1クリック直販リンク」',
      badge: '集客の事実ログ',
      evidenceStatus: 'REPORTED',
      punchline: '創業者が自作アイコンをTwitterでフォロワーに売ろうとした際、「なぜこんなに販売手続きが面倒なのか」と疑問に思い、週末の数日でプロトタイプを組んでTwitterに投稿したところ大バズを起こした。',
      details: [
        '初動の拡散: デザイン界隈のトップクリエイターたちが一斉に自分の作品をGumroadで販売し始め、作品購入者が次の販売者になるバイラルが成立。',
        '死線からの復活: 一度VC調達で拡大に失敗し破滅寸前になったが、社員を全員解雇してミニマリスト経営に転換したことで奇跡の超高収益復活を遂げた。'
      ],
      sourceNote: 'Sahil Lavingia 著書「The Minimalist Entrepreneur」'
    },
    {
      id: 'ev_gumroad_trap',
      type: 'INCUMBENT_TRAP',
      title: '【ライバルが真似できない理由】なぜShopifyやStripeはGumroadを飲み込めないのか',
      badge: '競合の弱点',
      evidenceStatus: 'REPORTED',
      punchline: 'Shopifyは本格的な自社ECストアを作りたい法人向け、Stripeは自前でコードを書くエンジニア向けであり、Gumroadが握る「コードも書けずストア構築も面倒な個人クリエイターが1分でリンクを貼る」超ライト層には手を出せない。',
      details: [
        '巨人の死角: 大手は「月額固定費（Shopify 月$39〜）」を取るため、売れるかどうかわからない個人のロングテール需要を拾えない。',
        '他社へ乗り換えられない仕組み: クリエイターの全顧客リストと過去の販売履歴が人質となり、他社への移行コストが極めて高い。'
      ]
    }
  ],

  ent_quibi_failure: [
    {
      id: 'ev_quibi_bleed',
      type: 'FATAL_BLEED',
      title: '【失敗の検証】2,600億円を集めてハリウッド流10分動画を月$8で売り、半年で即死・全額焼却',
      badge: '失敗の検証',
      evidenceStatus: 'VERIFIED',
      punchline: '「スマホ専用・縦横両対応の高品質ショート動画」という看板でメガ投資家から約2,600億円（$1.75B）を調達。スピルバーグら巨匠を起用したが、YouTubeやTikTokが無料で見られる時代に月額課金とSNSスクショ禁止を強制し、わずか6ヶ月で会社解散。',
      details: [
        '致命的な顧客理解の欠如: 「移動中に10分だけスマホで映画品質のドラマを見る」というハリウッド幹部の机上の空論。若者はTikTokの素人動画やYouTubeを求めていた。',
        'シェア禁止という自滅バグ: 当初はアプリからのスクリーンショットやSNSシェアを技術的に禁止していたため、ネット上で口コミが全く広がらなかった。',
        '破滅の瞬間: 有料会員転換率が数%に留まり、巨額コンテンツ制作費で毎月数十億円を出血。残存現金を投資家に返還してわずか半年でサービス終了。'
      ],
      metrics: [
        { label: '調達総額', value: '約¥2,600億円 ($1.75B)', isHighlight: true },
        { label: '月間赤字出血', value: '約¥40.5億円' },
        { label: 'サービス寿命', value: 'わずか6ヶ月' },
        { label: '最終ステータス', value: '全額焼却・会社解散' }
      ],
      sourceNote: 'The Wall Street Journal / 会社解散声明文 / SEC清算記録'
    },
    {
      id: 'ev_quibi_lesson',
      type: 'THE_CRIME',
      title: '【失敗からの教訓】「大金をかければ客が見る」という供給者目線の傲慢と無料プラットフォームの引力',
      badge: '失敗からの教訓',
      evidenceStatus: 'VERIFIED',
      punchline: 'コンテンツの品質とは「製作費の高さ」ではなく「視聴者の共感と共有可能性」である。TikTokやYouTubeという無料のモンスターが存在する戦場に、有料の閉鎖的アプリで正面衝突した歴史的敗北。',
      details: [
        '錯覚の前提: ディズニー元会長ジェフリー・カッツェンバーグと元eBay CEOメグ・ホイットマンという老害経営陣が、現代のスマホカルチャーを全く理解していなかった。',
        '得られた教訓: 「ユーザーがSNSで勝手に宣伝できない仕組み」を持つコンシューマープロダクトは確実に死ぬ。'
      ],
      sourceNote: 'WSJ「The Fall of Quibi」'
    }
  ]
};

// 2. 残存造語の置換マップ
function cleanJargon(text: string): string {
  if (!text) return text;
  return text
    .replace(/地雷検死/g, '失敗事例')
    .replace(/検死開示/g, '破綻後の調査開示')
    .replace(/検死レポート/g, '破綻レポート')
    .replace(/検死教訓/g, '失敗からの教訓')
    .replace(/検死報道開示/g, '破綻報道開示')
    .replace(/検死/g, '失敗の検証')
    .replace(/カニバリズム障壁/g, '大企業が手を出せない理由')
    .replace(/カニバリズム/g, '既存売上の共食い（カニバリ）')
    .replace(/サバンナ/g, '弱肉強食の環境');
}

function cleanEntityRecursive(obj: unknown): unknown {
  if (typeof obj === 'string') {
    return cleanJargon(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(cleanEntityRecursive);
  }
  if (obj && typeof obj === 'object') {
    const record = obj as Record<string, unknown>;
    const res: Record<string, unknown> = {};
    for (const k of Object.keys(record)) {
      res[k] = cleanEntityRecursive(record[k]);
    }
    return res;
  }
  return obj;
}

// 3. 全エンティティの処理
let updatedCardsCount = 0;
const processedEntities = entities.map(e => {
  // 残存造語のクリーンアップ
  const cleaned = cleanEntityRecursive(e) as FinancialEntity;

  // 17社へのカード付与
  if (CARDS_MAP[cleaned.id]) {
    cleaned.evidenceCards = CARDS_MAP[cleaned.id];
    updatedCardsCount++;
  }

  // observations と observationsStream の両立
  if (cleaned.observations && (!cleaned.observationsStream || cleaned.observationsStream.length === 0)) {
    cleaned.observationsStream = cleaned.observations.map((text, i) => ({
      id: `obs-str-${i}`,
      category: 'MARKET_DISTORTION',
      categoryLabel: '現場メモ',
      text: typeof text === 'string' ? text : JSON.stringify(text),
      originType: 'observed',
      verificationStatus: 'SUPPORTED',
    }));
  } else if (cleaned.observationsStream && (!cleaned.observations || cleaned.observations.length === 0)) {
    cleaned.observations = cleaned.observationsStream.map(o => o.text);
  }

  return cleaned;
});

fs.writeFileSync(indexPath, JSON.stringify(processedEntities, null, 2), 'utf8');
console.log(`Successfully enriched ${updatedCardsCount} entities with evidence cards.`);
console.log(`Cleaned jargon across all ${processedEntities.length} entities in data/entities-index.json.`);
