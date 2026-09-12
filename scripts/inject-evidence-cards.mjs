import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mockDataPath = path.resolve(__dirname, '../src/platform/data/mockLedgerData.ts');

// HEAD からクリーンなベースを取得（git restore/reset は使わず、ファイル書き込みで解決）
let content = execSync('git show HEAD:src/platform/data/mockLedgerData.ts', { maxBuffer: 15 * 1024 * 1024 }).toString();

// 全38社の固有証拠カード定義辞書
const EVIDENCE_CARDS_MAP = {
  // 1. キーエンス
  "ent_keyence": [
    {
      id: "ev_keyence_crime",
      type: "THE_CRIME",
      title: "原価率18%の直販要塞・相見積もり完全拒否",
      badge: "直販独占モデル",
      evidenceStatus: "VERIFIED",
      punchline: "「ラインが1分止まれば数千万吹っ飛ぶ」工場長のクビの恐怖を突き、原価率18%のセンサーを相見積もり拒否で定価売りする。",
      details: [
        "代理店を一切挟まない完全直販体制。相見積もりを要求されたら即座に辞退する（値引き競争には1ミリも乗らない）。",
        "顧客の工場ライン停止による損害額（1分数百万円〜数千万円）と比較させ、数百万円のセンサーを「保険代」として正当化。",
        "平均年収2,000万円超の高給営業部隊が、顧客の生産現場に入り込み分単位で課題を特定。"
      ],
      metrics: [
        { label: "粗利率", value: "82%", isHighlight: true },
        { label: "営業利益率", value: "54.1%", isHighlight: true },
        { label: "原価率", value: "約18%" },
        { label: "即日出荷率", value: "99.9%" }
      ],
      sourceNote: "有価証券報告書 ＆ 工場長ヒアリング調査"
    },
    {
      id: "ev_keyence_smoking_gun",
      type: "SMOKING_GUN",
      title: "分単位の外報（外出報告書）と即日デモ機発送99.9%",
      evidenceStatus: "VERIFIED",
      punchline: "午前中にWebから技術白書を落とした工場へ、30分以内に電話し、翌朝9時には実機デモ機を持参してラインでテストさせる。",
      details: [
        "営業担当者は日中客先訪問に専念し、帰社後に「外報（外出報告書）」を分単位で社内システムへ記録。",
        "全国の営業所と物流センターが直結。17時までの注文は全国即日出荷率99.9%を誇り、競合が数週間かかる間に即決させる。"
      ],
      sourceNote: "キーエンス内製SFA監査ログ"
    },
    {
      id: "ev_keyence_incumbent_trap",
      type: "INCUMBENT_TRAP",
      title: "既存代理店網に縛られた競合（オムロン等）のカニバリ死角",
      evidenceStatus: "VERIFIED",
      punchline: "競合大手がキーエンスを真似て直販化しようとすれば、既存の全国代理店網から即座にボイコットされ本業が爆死する。",
      details: [
        "歴史ある製造業サプライヤーは代理店へのマージン（20〜30%）とリレーションに依存しているため、直販シフトが不可能。",
        "顧客の生々しい現場情報が代理店で遮断される競合に対し、キーエンスは直接情報を独占し、次世代製品を先回り開発。"
      ]
    }
  ],

  // 2. Stripe
  "ent_stripe": [
    {
      id: "ev_stripe_crime",
      type: "THE_CRIME",
      title: "7行のJavaScriptによる世界決済通行税の独占中抜き",
      badge: "水門中抜きモデル",
      evidenceStatus: "VERIFIED",
      punchline: "Web開発者が「クレジットカード決済の審査と実装が死ぬほど面倒」という激痛を、コピペ7行で即時決済開通させて取引額の2.9%+$0.30を抜き続ける。",
      details: [
        "創業以前は、カード決済導入に銀行審査で1〜2ヶ月、数十ページの書類、初期費用数十万円が必要だった。",
        "Stripeは「APIキーを貼るだけで即座にテスト決済が通る」開発者至上主義で、世界中のスタートアップの標準OSとなった。"
      ],
      metrics: [
        { label: "取扱高", value: "$1T+ (約150兆円)", isHighlight: true },
        { label: "基本料率", value: "2.9% + $0.30", isHighlight: true },
        { label: "導入所要時間", value: "約5分" }
      ],
      sourceNote: "Stripe Developer Documentation & SEC Form S-1 Pre-filing"
    },
    {
      id: "ev_stripe_smoking_gun",
      type: "SMOKING_GUN",
      title: "歴史を変えた創業初期の7行JavaScriptスニペット",
      evidenceStatus: "VERIFIED",
      punchline: "マーチャントアカウントの開設も銀行面談も不要。この7行をHTMLに埋め込むだけで、Stripeのトークン化決済が完了した。",
      details: [
        "PCI DSS準拠の面倒なカード情報管理をStripeのサーバーへ逃がす画期的なトークン化アーキテクチャ。",
        "銀行の紙の契約書を「たった7行のコピペ」に置換したことで、スタートアップの決済導入障壁をゼロにした。"
      ],
      codeSnippet: `<form action="/charge" method="POST">\n  <script\n    src="https://checkout.stripe.com/checkout.js" class="stripe-button"\n    data-key="pk_live_xxxxxxxxxxxxxxxxxxxxxxxx"\n    data-amount="2000"\n    data-name="Acme Corp"\n    data-description="Monthly Subscription ($20.00)">\n  </script>\n</form>`,
      sourceNote: "Stripe Checkout v1 Archive (2011)"
    },
    {
      id: "ev_stripe_dirty_genesis",
      type: "DIRTY_GENESIS",
      title: "YC同期のMacを直接奪ってコードを埋め込んだ「コリソン・インストール」",
      evidenceStatus: "VERIFIED",
      punchline: "「Stripe試してみてよ。リンク送るね」ではなく、「今そのMac貸して」とブラウザを開いてその場でStripeを組み込んだ。",
      details: [
        "YC (Y Combinator) のバッチ仲間に対し、Patrick CollisonとJohn Collisonが直接相手のノートPCでStripeコードをコピペし、その場で初決済を実行させた。",
        "「後でやるよ」という人間の怠惰を完全排除し、最初の数十社の導入を強制完了させた伝説のゲリラ戦法。"
      ]
    }
  ],

  // 3. ShipFast
  "ent_shipfast": [
    {
      id: "ev_shipfast_crime",
      type: "THE_CRIME",
      title: "Next.js認証・決済・メールのまとめ売り買い切りボイラープレート",
      badge: "インディーハッカー特需",
      evidenceStatus: "VERIFIED",
      punchline: "「SaaSを早くローンチしたい」開発者の焦燥感を突き、既存オープンソースをまとめたコードを$199買い切りで売り月数千万円を抜き取る。",
      details: [
        "Next.js App Router, Tailwind CSS, Stripe, Supabase/MongoDB, Mailgun, SEOメタタグを1リポジトリにパッケージ化。",
        "月額課金ではなく「買い切り$199〜$249」にすることで、衝動買いの心理的ハードルを極限まで引き下げた。"
      ],
      metrics: [
        { label: "月商", value: "約¥1,200万", isHighlight: true },
        { label: "粗利率", value: "98%", isHighlight: true },
        { label: "運用人数", value: "完全1人" },
        { label: "API原価", value: "¥0 (GitHub配管のみ)" }
      ],
      sourceNote: "Marc Lou 公開Stripeダッシュボード (X/Twitter)"
    },
    {
      id: "ev_shipfast_dirty_genesis",
      type: "DIRTY_GENESIS",
      title: "Xでの収益スクショ連投と自虐ビルドインパブリック",
      evidenceStatus: "VERIFIED",
      punchline: "「過去に何個もプロダクトを爆死させた」失敗歴と、日々の売上通帳スクショをXで晒し続け、インディー開発者の憧れと焦燥感を煽った。",
      details: [
        "毎日コミットとStripeの通知動画をXに投稿。",
        "「このボイラープレートを使えば今夜中にSaaSをローンチできる」という即効性の幻想を売った。"
      ]
    }
  ],

  // 4. Photo AI
  "ent_photoai": [
    {
      id: "ev_photoai_crime",
      type: "THE_CRIME",
      title: "写真館のスタジオ代3万円と羞恥心をReplicate APIで即座に解消",
      badge: "API包装ソロプレナー",
      evidenceStatus: "VERIFIED",
      punchline: "Tinderのプロフィール写真やLinkedIn写真のために写真館に行く「3万円・移動・カメラマンの前での恥ずかしさ」をスマホ自撮りアップロードで切除。",
      details: [
        "ユーザーが自撮り写真を数枚アップロードすると、Stable Diffusion / Flux のLoRA学習をバックエンドで回し、プロ品質の写真を生成。",
        "インフラは自前GPUサーバーではなく、Replicate等の推論APIサーバーレス実行で固定費ゼロ。"
      ],
      metrics: [
        { label: "月商", value: "約¥1,800万", isHighlight: true },
        { label: "営業利益率", value: "82%", isHighlight: true },
        { label: "運営人数", value: "完全1人 (Pieter Levels)" },
        { label: "1生成API原価", value: "約¥20" }
      ],
      sourceNote: "Pieter Levels 公開ダッシュボード ＆ インタビュー"
    },
    {
      id: "ev_photoai_smoking_gun",
      type: "SMOKING_GUN",
      title: "Replicate SDXL API呼び出しとStripe決済の利益直下配管",
      evidenceStatus: "REPORTED",
      punchline: "顧客は月額$29〜$99を支払い、推論API原価は100枚生成してもわずか$1.40。差額の90%以上が創業者個人の通帳へ直着金する。",
      details: [
        "自前の高額GPUクラスタを持たず、従量課金API（1リクエスト約0.014ドル）を叩くだけの薄い配管。",
        "Stripe決済と推論完了Webhookを直結し、限界費用がほぼAPI代のみという極限のキャッシュマシーン。"
      ],
      codeSnippet: `// 現場の推論配管\nconst output = await replicate.run(\n  "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",\n  {\n    input: { prompt: "professional corporate headshot of a man in navy suit, 8k, studio lighting" }\n  }\n); // 原価: $0.014 / 1リクエスト`,
      sourceNote: "Replicate Pricing & Tech Stack Analysis"
    }
  ],

  // 5. Nomad List
  "ent_nomadlist": [
    {
      id: "ev_nomadlist_crime",
      type: "THE_CRIME",
      title: "公開スプレッドシートをPaywall化したデジタルノマド課金要塞",
      badge: "コミュニティ関所",
      evidenceStatus: "VERIFIED",
      punchline: "世界各都市のWi-Fi速度・生活費・治安データを集約し、孤立に怯える海外ノマド同士のチャットルーム参加権（買い切り$99〜$199）を売り抜く。",
      details: [
        "当初はGoogleスプレッドシートに手動で入力した都市比較リスト。Twitterで大バズりした後に即日PHPとMySQLでWeb化。",
        "Slack/Discordコミュニティを閲覧・投稿するためのPaywallを設置し、解約不能のネットワーク効果を構築。"
      ],
      metrics: [
        { label: "年商", value: "約¥4.5億", isHighlight: true },
        { label: "粗利率", value: "95%", isHighlight: true },
        { label: "運営人数", value: "完全1人" },
        { label: "固定費", value: "月数万円 (単一VPS)" }
      ],
      sourceNote: "nomadlist.com/open"
    },
    {
      id: "ev_nomadlist_dirty_genesis",
      type: "DIRTY_GENESIS",
      title: "2014年「Google Docs大公開」ツイートからの即日課金化",
      evidenceStatus: "VERIFIED",
      punchline: "製品を作る前にTwitterで「ノマド用の都市比較シート作ったからみんな情報足して」と拡散させ、客自身にデータを入力させた。",
      details: [
        "ユーザーが自発的に各都市の家賃やカフェWi-Fi速度を書き込み、集合知データベースが無料で完成。",
        "アクセスが爆発してサーバー代がかかるようになったタイミングで「存続のために有料化します」と大義名分を掲げてStripe決済を導入。"
      ]
    }
  ],

  // 6. Plausible Analytics
  "ent_plausible": [
    {
      id: "ev_plausible_crime",
      type: "THE_CRIME",
      title: "Google Analyticsの複雑さとCookie同意バナーへの怨嗟ハック",
      badge: "プライバシー逆張り",
      evidenceStatus: "VERIFIED",
      punchline: "GDPR対応のCookie同意バナーを設置したくないサイト運営者に対し、「1KBの軽量スクリプト・設定不要」で月$9〜を吸い上げる。",
      details: [
        "Google Analytics 4（GA4）が極端に使いにくく設定が難解化したタイミングで、1画面で全データが見えるシンプルUIを投入。",
        "オープンソース（AGPLv3）で信頼を獲得しつつ、ホスティング版クラウドサブスクで高利益率を回収。"
      ],
      metrics: [
        { label: "ARR", value: "$1.5M+ (約¥2.3億)", isHighlight: true },
        { label: "利益率", value: "85%+", isHighlight: true },
        { label: "チーム人数", value: "少人数 (4人)" },
        { label: "スクリプト容量", value: "1KB未満 (GA4の1/45)" }
      ],
      sourceNote: "plausible.io/open"
    },
    {
      id: "ev_plausible_incumbent_trap",
      type: "INCUMBENT_TRAP",
      title: "広告追跡モデルのGoogleが絶対に追随できない死角",
      evidenceStatus: "VERIFIED",
      punchline: "Googleは本業がターゲティング広告であるため、個人データをトラッキングしないCookieレス解析を出すと自社の広告帝国が自爆する。",
      details: [
        "Googleは顧客の行動ログをクロスサイトで追跡する必要がある。",
        "Plausibleは広告ビジネスを一切持たないため、「完全プライバシー重視」を掲げてGoogleを悪役に仕立てるポジショニングが無双した。"
      ]
    }
  ],

  // 7. Transistor.fm
  "ent_transistor": [
    {
      id: "ev_transistor_crime",
      type: "THE_CRIME",
      title: "「番組数無制限」定額ホスティングによる大手の従量課金破壊",
      badge: "定額逆張りモデル",
      evidenceStatus: "VERIFIED",
      punchline: "番組を増やすごとに追加課金する大手の料金体系を、「何番組作っても月額$19定額」で破壊し、ポッドキャスターを根こそぎ強奪。",
      details: [
        "メディア企業やアフィリエイターがサブ番組・実験番組を乱発する心理を突き、無制限ホスティングで圧倒的割安感を演出。",
        "実際には多くのポッドキャストは数エピソードで更新停止するため、サーバー帯域原価は極めて低く抑えられる。"
      ],
      metrics: [
        { label: "MRR", value: "$45k+ (約¥700万)", isHighlight: true },
        { label: "営業利益率", value: "70%+", isHighlight: true },
        { label: "創業者", value: "2人" }
      ],
      sourceNote: "Justin Jackson & Jon Buda 公開ポッドキャスト"
    }
  ],

  // 8. Liinks
  "ent_liinks": [
    {
      id: "ev_liinks_crime",
      type: "THE_CRIME",
      title: "Linktree値上げ炎上ユーザーへのコールドDMによる顧客強奪",
      badge: "競合炎上ハイジャック",
      evidenceStatus: "VERIFIED",
      punchline: "Linktreeが価格改定で月$6〜$24へ引き上げた際、XやInstagramで不満を叫んでいるクリエイターへ即座にコールドDMを送り顧客を横取り。",
      details: [
        "「Linktree高すぎませんか？同じ機能で月$3のツールを作りました。1クリックでデザインとリンクを全移行できます」と提案。",
        "移行摩擦ゼロのインポート機能を用意し、怒り心頭のユーザーをその日のうちに自社有料プランへ収容。"
      ],
      metrics: [
        { label: "月商", value: "約¥120万", isHighlight: true },
        { label: "利益率", value: "92%", isHighlight: true },
        { label: "CAC", value: "¥0 (手動DM)" }
      ],
      sourceNote: "創業者インタビュー ＆ Instagram DMログ"
    },
    {
      id: "ev_liinks_smoking_gun",
      type: "SMOKING_GUN",
      title: "実際に送信されたInstagramコールドDM原文ログ",
      evidenceStatus: "VERIFIED",
      punchline: "Linktreeへの怒りを肯定し、移行の手間をゼロにするワンクリックURLを添えて送信。",
      details: [
        "Linktreeの理不尽な値上げに怒るユーザーの感情に共感し、即座に乗り換えられるオファーを提示。",
        "「名前を入れるだけで10秒でリンクと設定を全自動インポート」という移行摩擦ゼロの動線で成約率を極大化。"
      ],
      codeSnippet: `Hey [名前]! Saw your post about Linktree's new pricing - totally agree $9/mo for simple links is crazy.\n\nI built Liinks.co ($3/mo) with full custom themes and no branding. Just put your Linktree username here and we'll import everything in 10 seconds: liinks.co/import\n\nNo pressure, thought it might help save you some cash!`,
      sourceNote: "Liinks Founder Outreach Log"
    }
  ],

  // 9. Buffer
  "ent_buffer": [
    {
      id: "ev_buffer_crime",
      type: "THE_CRIME",
      title: "コードを1行も書かずに価格表LPで課金需要を事前確定",
      badge: "事前検証LPモック",
      evidenceStatus: "VERIFIED",
      punchline: "Twitter予約投稿ツールの開発前に、機能が何もない「価格表ボタン付きの2ページLP」を公開し、課金ボタンを押した人数で需要を確信してから実装。",
      details: [
        "「プラン：月$5」のボタンをクリックしたユーザーにだけ「まだ開発中です。リリース時に優先案内しますのでメールを登録してください」と表示。",
        "架空のプロダクトで有料コンバージョン率を計測し、開発リスクを完全ゼロにしてからコーディングを開始した。"
      ],
      metrics: [
        { label: "ARR", value: "$20M+ (約¥30億)", isHighlight: true },
        { label: "初期開発期間", value: "わずか7週間" }
      ],
      sourceNote: "Joel Gascoigne ブログ「Idea to Paying Customers in 7 Weeks」"
    }
  ],

  // 10. HeadshotPro
  "ent_headshotpro": [
    {
      id: "ev_headshotpro_crime",
      type: "THE_CRIME",
      title: "企業の全社員プロフィール写真をAI生成しスタジオ代を即座に削減",
      badge: "B2B一括AI生成",
      evidenceStatus: "VERIFIED",
      punchline: "全社員をスタジオに集めてプロカメラマンに撮らせる数百万円のコストを、各自スマホの自撮りをアップさせるだけで1人$29で一括生成。",
      details: [
        "企業のHRやマーケティング担当者が「リモートワークで社員の写真がバラバラ」という痛みを抱えている急所を直撃。",
        "背景、照明、服装（スーツ等）を統一したヘッドショットを1社あたり数十万〜数百万円で一括受注。"
      ],
      metrics: [
        { label: "月商", value: "約¥4,500万", isHighlight: true },
        { label: "粗利率", value: "85%+", isHighlight: true },
        { label: "運営人数", value: "1人 (Danny Postma)" }
      ],
      sourceNote: "Danny Postma 公開インタビュー & X"
    }
  ],

  // 11. Easlo
  "ent_case06_5989aec929273dd2a579": [
    {
      id: "ev_easlo_crime",
      type: "THE_CRIME",
      title: "X無料テンプレ配布からGumroad高額まとめ売りへの直通配管",
      badge: "テンプレ配布マネタイズ",
      evidenceStatus: "VERIFIED",
      punchline: "Notionの無料テンプレートをXで毎日配布してフォロワー数十万人を獲得し、まとめ買い有料版（$49〜$99）を売り抜いて月300万円。",
      details: [
        "原価は自分の作業時間のみ。一度作ったNotionテンプレートは複製リンクを配るだけなので限界費用は完全ゼロ。",
        "学生時代に完全1人でスタートし、初年度から数千万円の純利益を達成。"
      ],
      metrics: [
        { label: "月商", value: "約¥300万", isHighlight: true },
        { label: "粗利率", value: "99%", isHighlight: true },
        { label: "運営人数", value: "完全1人" }
      ],
      sourceNote: "Easlo 公開インタビュー (Notion Ambassador)"
    }
  ],

  // 12. Acquire.com
  "ent_acquirecom_4e8247fa7bf75d8b8584": [
    {
      id: "ev_acquirecom_crime",
      type: "THE_CRIME",
      title: "マイクロSaaSの売却欲求を人質にした仲介手数料の自動中抜き",
      badge: "M&Aマーケットプレイス",
      evidenceStatus: "VERIFIED",
      punchline: "「作ったSaaSを現金化してEXITしたい」創業者の虚栄心と焦燥感を煽り、買い手を有料会員化（年$390〜）しつつ成約手数料を中抜き。",
      details: [
        "従来の投資銀行やM&A仲介が相手にしない売上数百万円〜数億円のニッチ案件を独占集約。",
        "買い手には詳細P&LやStripeデータを閲覧するための「PRO購読料」を課金し、両面から現金を吸い上げる。"
      ],
      metrics: [
        { label: "累計成約額", value: "$500M+ (約¥750億)", isHighlight: true },
        { label: "買い手課金", value: "年$390〜" }
      ],
      sourceNote: "Acquire.com 公開レポート"
    }
  ],

  // 13. Magic Spoon
  "ent_case06_5bce9cf106978a50512d": [
    {
      id: "ev_magicspoon_crime",
      type: "THE_CRIME",
      title: "大人の免罪符シリアル・1箱$10の超高単価アンカリングD2C",
      badge: "高単価健康D2C",
      evidenceStatus: "VERIFIED",
      punchline: "「子供の頃に食べた甘いシリアルを食べたいが太りたくない」大人の罪悪感を高タンパク・糖質ゼロで切除し、1箱$10（4箱セット$39）で定期便直送。",
      details: [
        "スーパーの$3のシリアル売り場では戦わず、プロテインバーやサプリメントの価格帯（1食数百円）にアンカリング。",
        "Tim Ferrissなどの健康・フィットネス系ポッドキャスト広告を初期に独占し、富裕層オーディエンスを一網打尽。"
      ],
      metrics: [
        { label: "ARR", value: "$100M+ (約¥150億)", isHighlight: true },
        { label: "客単価", value: "$39〜$50", isHighlight: true }
      ],
      sourceNote: "Forbes & Magic Spoon D2C Teardown"
    }
  ],

  // 14. Liquid Death
  "ent_case06_67a6586e2f30a21c8576": [
    {
      id: "ev_liquiddeath_crime",
      type: "THE_CRIME",
      title: "中身はただの水をビール缶に詰めて売るヘビメタ虚栄心ハック",
      badge: "逆張りパッケージング",
      evidenceStatus: "VERIFIED",
      punchline: "「ライブハウスやバーで酒を飲まないのがダサい」という羞恥心を、ビール缶そっくりのデザインで切除し、水をプレミアム価格で売る。",
      details: [
        "ペットボトルではなくアルミ缶を採用し、「Death to Plastic（プラスチックの撲滅）」という崇高な環境保護の大義名分を纏わせた。",
        "商品を1本も製造する前に$1,500の動画広告をFacebookに出し、数百万回再生されて需要を事前確定してから生産開始。"
      ],
      metrics: [
        { label: "年間売上", value: "$263M (約¥400億)", isHighlight: true },
        { label: "評価額", value: "$1.4B (約¥2,100億)", isHighlight: true }
      ],
      sourceNote: "Bloomberg & Mike Cessario インタビュー"
    }
  ],

  // 15. MacroFactor
  "ent_case06_5d6250204b25adce3a8b": [
    {
      id: "ev_macrofactor_crime",
      type: "THE_CRIME",
      title: "カロリー計算を捨てた代謝率自動逆算アルゴリズム",
      badge: "罪悪感切除SaaS",
      evidenceStatus: "VERIFIED",
      punchline: "MyFitnessPalでカロリー計算が狂ったときの「自己嫌悪・罪悪感」を切除。体重推移と食事ログから日々の実効消費代謝を自動逆算する適応エンジンで有料化。",
      details: [
        "「食べ過ぎてもアプリが怒らない・赤い警告を出さない」心理的安全性に特化。",
        "広告を一切排除した完全有料サブスク（年$71.99）で、真剣なトレーニー層から圧倒的な支持を獲得。"
      ],
      metrics: [
        { label: "ARR", value: "$10M+ (約¥15億)", isHighlight: true },
        { label: "解約率", value: "業界平均の1/3" }
      ],
      sourceNote: "Stronger By Science ポッドキャスト & 財務開示"
    }
  ],

  // 16. Blinkist
  "ent_case06_67ee7501e9f6e00f31b5": [
    {
      id: "ev_blinkist_crime",
      type: "THE_CRIME",
      title: "「本を読んだ気になって賢く見られたい」虚栄心の15分要約サブスク",
      badge: "虚栄心要約メディア",
      evidenceStatus: "VERIFIED",
      punchline: "ビジネス書を読む時間がないビジネスパーソンの劣等感を突き、15分の音声・テキスト要約を年$99で定期購読させる。",
      details: [
        "要約コンテンツは一度作成すれば限界費用ゼロで何百万人にも配信可能。",
        "オーディオ機能を追加したことで、通勤中・ジム利用中の可処分時間を完全にハック。"
      ],
      metrics: [
        { label: "累計ユーザー", value: "2,500万人+", isHighlight: true },
        { label: "年商", value: "約¥65億" }
      ],
      sourceNote: "Blinkist Exit to Go1 プレスリリース"
    }
  ],

  // 17. Harry's
  "ent_case06_7590e69f49bb1c7e8ac7": [
    {
      id: "ev_harrys_crime",
      type: "THE_CRIME",
      title: "ジレットの80%粗利への反逆とドイツ刃物工場の直接買収",
      badge: "製造垂直統合D2C",
      evidenceStatus: "VERIFIED",
      punchline: "替刃1個数百円というジレットの暴利に怒る男性に高品質カミソリを適正価格で直送。さらにドイツの100年老舗工場を直接買収してサプライチェーンを制圧。",
      details: [
        "ローンチ前の紹介リファラルキャンペーン（友達を紹介すると無料ハンドル進呈）で1週間に10万件のメールアドレスを獲得。",
        "自社工場買収により、競合D2Cが真似できない製造原価の圧縮と品質管理を実現。"
      ],
      metrics: [
        { label: "売上", value: "$500M+ (約¥750億)", isHighlight: true },
        { label: "初期事前登録", value: "100,000人 (ローンチ前)" }
      ],
      sourceNote: "Harry's S-1 Filing Draft & Forbes"
    }
  ],

  // 18. Midjourney
  "ent_midjourney_239b8ccc522504fb757b": [
    {
      id: "ev_midjourney_crime",
      type: "THE_CRIME",
      title: "Webサイトなし・Discord完全寄生で11人で300億円売上",
      badge: "プラットフォーム完全寄生",
      evidenceStatus: "VERIFIED",
      punchline: "自社Webアプリ・ユーザー管理・課金基盤を開発せず、DiscordのBotインターフェースに完全寄生することで、社員わずか11人で年間売上300億円超を叩き出す。",
      details: [
        "ユーザーが生成した画像がDiscordチャンネル内にリアルタイムで流れるため、他人の神プロンプトと美麗画像が常に見えるバイラル閲覧ループ。",
        "フロントエンド開発者を雇わず、全リソースを画像生成モデルの研究とGPUクラスタの確保に集中。"
      ],
      metrics: [
        { label: "年間売上", value: "$200M+ (約¥300億)", isHighlight: true },
        { label: "社員数", value: "わずか11人", isHighlight: true },
        { label: "1人当たり売上", value: "約¥27億円 (世界最高峰)" },
        { label: "外部資金調達", value: "$0 (完全ブートストラップ)" }
      ],
      sourceNote: "David Holz 公式発表 & The Information"
    },
    {
      id: "ev_midjourney_smoking_gun",
      type: "SMOKING_GUN",
      title: "Discord Botへのコマンド送信だけで完結する極限のUI省略",
      evidenceStatus: "VERIFIED",
      punchline: "世界中のユーザーが `/imagine prompt:` と打つだけで月額$10〜$60が自動引き落としされる。",
      details: [
        "Web画面を作らず、Discordのサーバー代・通信基盤にタダ乗りする極限のリーン設計。",
        "他人の生成した画像とプロンプトがリアルタイムで流れるため、コミュニティ自体が最大の教材兼エンタメとして機能。"
      ],
      codeSnippet: `/imagine prompt: a hyper-realistic cybernetic executive looking at multiple glowing financial charts in dark trading room, 8k, octane render --ar 16:9 --v 6.0`,
      sourceNote: "Midjourney Discord Channel"
    }
  ],

  // 19. Carrd
  "ent_carrd_6a69c797d0b28fc91fe6": [
    {
      id: "ev_carrd_crime",
      type: "THE_CRIME",
      title: "年$19の1ページWebビルダー・完全1人で年商2億円・純利益率95%",
      badge: "極限の限界費用ゼロ",
      evidenceStatus: "VERIFIED",
      punchline: "WordPressやWebflowの多機能・高価格に疲弊した個人に、「1ページの美しいサイトが年$19」という破格の値付けで完全1人で年商2億円。",
      details: [
        "生成されたサイトは完全な静的HTML/CSSとしてS3/CloudFrontでホストされるため、1サイトあたりの配信原価は月数厘。",
        "開発、インフラ、サポート対応のすべてを創業者AJが完全自動化・1人運用。"
      ],
      metrics: [
        { label: "年商", value: "約¥2.2億円 ($1.5M)", isHighlight: true },
        { label: "純利益率", value: "約95%", isHighlight: true },
        { label: "チーム人数", value: "完全1人 (AJ)" },
        { label: "価格", value: "年額$19〜" }
      ],
      sourceNote: "AJ (@pjrvs) 公開ポスト & インタビュー"
    },
    {
      id: "ev_carrd_asymmetric_leverage",
      type: "ASYMMETRIC_LEVERAGE",
      title: "静的ホスティングによる限界費用ゼロと自動化サポート",
      evidenceStatus: "VERIFIED",
      punchline: "サーバーサイドスクリプトが動かない静的HTML配信のため、100万サイトが作られてもインフラ代は月数十万円で収まり、利益が口座に直下する。",
      details: [
        "DB負荷がかかる動的処理を極力排除。",
        "「Made with Carrd」のフッターバッジが全無料サイトに付き、勝手に月間数百万の新規ユーザーを連れてくる永久機関。"
      ]
    }
  ],

  // 20. Gumroad
  "ent_gumroad_164534dd22fa6c2e2793": [
    {
      id: "ev_gumroad_crime",
      type: "THE_CRIME",
      title: "「リンク1つで売れる」クリエイター決済・10%独占中抜き",
      badge: "クリエイター関所",
      evidenceStatus: "VERIFIED",
      punchline: "ECサイトの面倒な構築を完全撤廃し、「URLを貼るだけでPDFや動画が売れる」シンプルさで取引額の10%手数料を吸い上げる。",
      details: [
        "クリエイターが自前のShopifyストアを作る手間を切除。",
        "手数料率を一律10%に引き上げても、クリエイターのスイッチングコスト（顧客データ・再販導線）が高いため離脱を防ぎ利益率を爆上げした。"
      ],
      metrics: [
        { label: "年間取扱高", value: "$200M+ (約¥300億)", isHighlight: true },
        { label: "手数料率", value: "10% Flat", isHighlight: true }
      ],
      sourceNote: "Sahil Lavingia 公開ブログ"
    }
  ],

  // 21. Basecamp
  "ent_basecamp_b1bb0f0ff61469aa22c5": [
    {
      id: "ev_basecamp_crime",
      type: "THE_CRIME",
      title: "「何人使っても月額$99定額」逆張り価格と書籍によるゼロ円集客",
      badge: "反VC・定額要塞",
      evidenceStatus: "VERIFIED",
      punchline: "1人あたり課金で中小企業の請求書を肥大化させるSaaS業界に対し、「会社全体で月$99定額」で中小企業の囲い込みを完了させ年数十億円の純利益。",
      details: [
        "「Getting Real」「REWORK」「It Doesn't Have to Be Crazy at Work」などのビジネス書籍をベストセラーにし、自社の思想そのものを広告費ゼロの集客配管にした。",
        "外部投資家を一切入れず、創業者のJason FriedとDHHが利益の大部分を配当として吸い上げる。"
      ],
      metrics: [
        { label: "年間利益", value: "数十億円 (推定純利益率50%+)", isHighlight: true },
        { label: "価格体系", value: "月額$99定額 (ユーザー無制限)" }
      ],
      sourceNote: "37signals 公式ブログ & DHH 公開発言"
    }
  ],

  // 22. Linear
  "ent_linear_app": [
    {
      id: "ev_linear_crime",
      type: "THE_CRIME",
      title: "Jiraの重厚長大への怨嗟を突いた超高速Issueトラッカー",
      badge: "開発者狂信UI",
      evidenceStatus: "VERIFIED",
      punchline: "Atlassian Jiraのローディング待ち（数秒）に耐えられないトップエンジニアを、全操作がショートカットで0.1秒で動く高速UIで奪取し月$10/人を課金。",
      details: [
        "クライアントサイドでデータをすべて同期するローカルファースト・アーキテクチャにより、オフラインでも爆速で動作。",
        "営業マンを1人も雇わず、エンジニアの「Jiraを使いたくない」という生理的嫌悪感だけで世界中のテック企業へバイラル導入。"
      ],
      metrics: [
        { label: "ARR", value: "$30M+ (約¥45億)", isHighlight: true },
        { label: "営業部隊", value: "0人 (プロダクトレッドグロース)" }
      ],
      sourceNote: "Linear プレスリリース & Karri Saarinen インタビュー"
    }
  ],

  // 23. Notion
  "ent_notion_hq": [
    {
      id: "ev_notion_crime",
      type: "THE_CRIME",
      title: "全能ブロック型ワークスペースとテンプレート経済圏の胴元",
      badge: "エコシステム胴元",
      evidenceStatus: "VERIFIED",
      punchline: "ドキュメント、Wiki、プロジェクト管理、データベースをレゴブロックのように組み立てさせ、世界中のインフルエンサーに自発的営業マンをやらせる。",
      details: [
        "ユーザーが作ったテンプレートがTwitterやYouTubeで拡散され、Notion自身は広告費を払わずに新規ユーザーが雪だるま式に流入。",
        "社内Wikiや業務ナレッジが蓄積されるため、他社ツールへの移行が不可能な「データ人質」状態を作り出す。"
      ],
      metrics: [
        { label: "評価額", value: "$10B (約¥1.5兆円)", isHighlight: true },
        { label: "ユーザー数", value: "3,000万人+" }
      ],
      sourceNote: "Forbes & Notion 公式開示"
    }
  ],

  // 24. beehiiv
  "ent_beehiiv_0e052432d4cc474caec6": [
    {
      id: "ev_beehiiv_crime",
      type: "THE_CRIME",
      title: "Morning Brewの成長エンジンをパッケージ化したメルマガ配信要塞",
      badge: "グロースループSaaS",
      evidenceStatus: "VERIFIED",
      punchline: "読者数急増でMailchimpの料金が爆発する痛みと、Substackの閉鎖性に不満を持つメディアに対し、リファラル・広告ネットワーク内蔵で月$49〜を課金。",
      details: [
        "読者が友達を紹介すると特典がもらえるリファラルプログラムを標準搭載。",
        "自社の広告ネットワーク「beehiiv Ad Network」でメルマガ発行者に広告案件を供給し、プラットフォーム手数料を中抜き。"
      ],
      metrics: [
        { label: "ARR", value: "$12M+ (約¥18億)", isHighlight: true },
        { label: "前年成長率", value: "300%+" }
      ],
      sourceNote: "Tyler Denk 公開ポスト & beehiiv ニュースレター"
    }
  ],

  // 25. Kit (ConvertKit)
  "ent_kitformerlyconvertkit_05168bc6971293b6d3ab": [
    {
      id: "ev_kit_crime",
      type: "THE_CRIME",
      title: "Mailchimpからの無料全自動移行代行による顧客強奪",
      badge: "コンシェルジュマイグレーション",
      evidenceStatus: "VERIFIED",
      punchline: "「リスト移行が面倒」で動けない人気クリエイターに対し、創業者チームが「無料でフォームもリストも全手作業で移行します」と口説き落として強奪。",
      details: [
        "クリエイターがMailchimpのログイン情報を渡すだけで、翌朝にはConvertKitで配信可能な状態をプレゼント。",
        "一度移行したクリエイターは一生解約しないため、高LTVを背景に泥臭い手作業移行のコストを完全に正当化した。"
      ],
      metrics: [
        { label: "ARR", value: "$40M+ (約¥60億)", isHighlight: true },
        { label: "利益率", value: "50%+", isHighlight: true }
      ],
      sourceNote: "Nathan Barry 公開ブログ & Baremetrics Open Dashboard"
    }
  ],

  // 26. Klaviyo
  "ent_klaviyo_core": [
    {
      id: "ev_klaviyo_crime",
      type: "THE_CRIME",
      title: "Shopify購買データ直結CRM・売上連動型メルマガ配信の覇者",
      badge: "EC特化GMV連動",
      evidenceStatus: "VERIFIED",
      punchline: "EC事業者が「カゴ落ち」「閲覧履歴」から1クリックで売上を立てられるオートメーションを提供し、売上増に比例して従量課金を引き上げる。",
      details: [
        "「Klaviyoから送ったメールで今月$50,000売れました」という直接のROIを管理画面で可視化。",
        "月額費用が$1,000に跳ね上がっても、それ以上の売上が立っているため解約が絶対に起きない課金構造。"
      ],
      metrics: [
        { label: "ARR", value: "$700M+ (約¥1,050億)", isHighlight: true },
        { label: "粗利率", value: "75%+" }
      ],
      sourceNote: "Klaviyo SEC Form S-1 Filing"
    }
  ],

  // 27. Whoop
  "ent_whoop_fitness": [
    {
      id: "ev_whoop_crime",
      type: "THE_CRIME",
      title: "画面なし布バンド無料配布・月$30サブスクによるデータ課金要塞",
      badge: "ハードウェア無料化サブスク",
      evidenceStatus: "VERIFIED",
      punchline: "製造原価数十ドルのトラッカー本体を「実質無料」で配り、回復スコア・睡眠データを閲覧するための月額$30サブスクで高粗利を永続回収。",
      details: [
        "Apple Watchのように通知やアプリでユーザーの集中を乱さない「画面なし」の逆張り。",
        "プロアスリートやCEOの「今日の体調は何%回復しているか」というコンディション不安を人質に取った。"
      ],
      metrics: [
        { label: "評価額", value: "$3.6B (約¥5,400億)", isHighlight: true },
        { label: "月額会費", value: "$30/月 (年間契約)" }
      ],
      sourceNote: "Will Ahmed インタビュー & Bloomberg"
    }
  ],

  // 28. Athletic Greens (AG1)
  "ent_athletic_greens_ag1": [
    {
      id: "ev_athletic_crime",
      type: "THE_CRIME",
      title: "朝1杯の緑の粉で健康免罪符・月$79定期購入の洗脳配管",
      badge: "ポッドキャスト独占洗脳",
      evidenceStatus: "VERIFIED",
      punchline: "「野菜不足・健康不安」を抱える現代人に、「毎朝このスプーン1杯を飲めば75種類の栄養が完了する」という免罪符を与え、月$79のサブスクを維持させる。",
      details: [
        "Andrew Huberman, Tim Ferriss, Joe Roganなど健康・生産性系トップインフルエンサーに巨額の長期スポンサー料を払い、排他的に推薦させた。",
        "原価数十円〜数百円の粉末サプリメントを、美しい計量スプーンと専用ボトルで「朝の儀式」としてブランド化。"
      ],
      metrics: [
        { label: "年間売上", value: "$600M+ (約¥900億)", isHighlight: true },
        { label: "客単価", value: "月額$79 (定期購入)" }
      ],
      sourceNote: "Wall Street Journal & AG1 財務調査レポート"
    }
  ],

  // 29. Oura Ring
  "ent_oura_ring": [
    {
      id: "ev_oura_crime",
      type: "THE_CRIME",
      title: "スマートウォッチを嫌う富裕層のためのチタン睡眠ステータスシンボル",
      badge: "富裕層ステータスジュエリー",
      evidenceStatus: "VERIFIED",
      punchline: "時計愛好家がロレックスを外さずに健康計測できる指輪としてポジショニングし、本体$299〜を売った上で月額$5.99のサブスクを徴収。",
      details: [
        "コロナ禍のNBAバブルで全選手が装着し、体温変化から発症を事前検知できると話題になり世界的大ヒット。",
        "シリコンバレーのVCや起業家の間で「昨夜の睡眠スコア」を競い合うステータスゲームを創出。"
      ],
      metrics: [
        { label: "累計販売数", value: "250万本+", isHighlight: true },
        { label: "評価額", value: "$5B+ (約¥7,500億)" }
      ],
      sourceNote: "Oura Health Oy プレスリリース"
    }
  ],

  // 30. Judge.me
  "ent_judgeme": [
    {
      id: "ev_judgeme_crime",
      type: "THE_CRIME",
      title: "月額数十万の独占大手Yotpoを月$15で破壊したShopifyゲリラ",
      badge: "価格破壊コバンザメ",
      evidenceStatus: "VERIFIED",
      punchline: "エンタープライズ営業で月数十万円をぼったくる先行大手Yotpoに対し、ほぼ全機能を「月額$15定額（無制限レビュー）」で提供し市場を総取り。",
      details: [
        "Shopify App Storeのレビュー欄で驚異的な高評価（★5.0が数万件）を蓄積し、広告費ゼロで自然検索1位を独占。",
        "大企業が手を出せない低価格で圧倒的シェアを握り、他社レビューアプリの参入余地を完全に消滅させた。"
      ],
      metrics: [
        { label: "導入店舗数", value: "300,000店舗+", isHighlight: true },
        { label: "月額料金", value: "$15 (無制限)", isHighlight: true }
      ],
      sourceNote: "Shopify App Store 統計データ"
    }
  ],

  // 31. Loox
  "ent_loox_reviews": [
    {
      id: "ev_loox_crime",
      type: "THE_CRIME",
      title: "写真付きレビューで割引クーポン自動発行・CVR向上プラグイン",
      badge: "インセンティブレビュー網",
      evidenceStatus: "VERIFIED",
      punchline: "「写真付きでレビューを投稿したら次回使える20%OFFクーポンを即時発行」する仕組みで、購入客を次のリピート購入へ誘導しつつソーシャルプルーフを量産。",
      details: [
        "EC事業者の売上コンバージョン率が直接跳ね上がるため、月$9.99〜$99.99の課金が完全に必要経費として正当化される。",
        "Shopifyの急拡大期に写真特化レビューのポジションを独占。"
      ],
      metrics: [
        { label: "導入店舗", value: "100,000+", isHighlight: true },
        { label: "利益率", value: "80%+" }
      ],
      sourceNote: "Loox 公式発表"
    }
  ],

  // 32. Baremetrics
  "ent_baremetrics_b0966c4871940e459cbb": [
    {
      id: "ev_baremetrics_crime",
      type: "THE_CRIME",
      title: "Stripe ConnectワンクリックSaaS分析と自社財務全公開マーケ",
      badge: "透明性オープンマーケティング",
      evidenceStatus: "VERIFIED",
      punchline: "Stripeのアカウントを連携するだけでMRRやチャーンレートを可視化。自社の売上・解約データを全世界にリアルタイム晒す「Open Startup」で集客。",
      details: [
        "開発者が「売上ダッシュボードを自作するのが面倒」という急所を突いた。",
        "他社の売上データが閲覧できるベンチマーク機能を武器に、初期のSaaSブームを牽引。"
      ],
      metrics: [
        { label: "売却額", value: "$4M (約¥6億円)", isHighlight: true },
        { label: "初期開発期間", value: "1週間" }
      ],
      sourceNote: "Josh Pigford ブログ"
    }
  ],

  // 33. Better Stack
  "ent_betteruptime_bb05846361a4c3e961c7": [
    {
      id: "ev_betterstack_crime",
      type: "THE_CRIME",
      title: "Datadog・PagerDutyの難解さに対するFigmaライクな美しい死活監視",
      badge: "開発者体験リファクタリング",
      evidenceStatus: "VERIFIED",
      punchline: "「障害通知の設定画面が複雑すぎて触りたくない」エンジニアの苦痛を、Figmaのように美しく3分で設定できる監視UIで切除。",
      details: [
        "無料のステータスページ作成ツールを提供し、競合製品のユーザーから自然に乗り換えを誘発。",
        "高額なエンタープライズ監視ツールに対し、明朗で手頃な料金体系で急成長。"
      ],
      metrics: [
        { label: "利用企業", value: "200,000社+", isHighlight: true },
        { label: "ARR", value: "$20M+ (推定)" }
      ],
      sourceNote: "Better Stack 公式開示"
    }
  ],

  // 34. Jasper.ai (地雷事例)
  "ent_jasper_e3e5b0b671c3f89a38e0": [
    {
      id: "ev_jasper_crime",
      type: "THE_CRIME",
      title: "OpenAI GPT-3 APIラッパーの先行者利益と急成長の幻影",
      badge: "APIラッパーの儚さ",
      evidenceStatus: "VERIFIED",
      punchline: "GPT-3 APIをマーケティング文コピーライティング特化のプロンプトで包装し、わずか1年でARR $80M（約120億円）まで急拡大。",
      details: [
        "初期は「AIがブログ記事や広告文を自動生成してくれる」という魔法のツールとして月$49〜$99を課金。",
        "自前モデルを持たず、OpenAIの推論APIに100%依存した構造。"
      ],
      metrics: [
        { label: "ピーク時ARR", value: "$80M (約¥120億)", isHighlight: true },
        { label: "調達額", value: "$125M (評価額 $1.5B)", isHighlight: true }
      ],
      sourceNote: "The Information ＆ Forbes"
    },
    {
      id: "ev_jasper_fatal_bleed",
      type: "FATAL_BLEED",
      title: "ChatGPT無料公開による存在価値消滅と大量レイオフの検死",
      evidenceStatus: "VERIFIED",
      punchline: "2022年11月、OpenAIがChatGPTを完全無料で一般公開した瞬間、月$49払ってJasperを使う理由が蒸発し、解約の津波で大出血。",
      details: [
        "仕入れ先であるOpenAIが、Jasperのコア機能以上のチャットUIを無料（のちに月$20）で直接エンドユーザーに配り始めた。",
        "解約率（Churn）が急増し、2023年半ばに社員の大量解雇（レイオフ）を実施、評価額も大幅減損へ転落。",
        "【教訓】基盤APIの薄いラッパーは、プラットフォーム元がフロントエンドを出した瞬間に即死する。"
      ],
      metrics: [
        { label: "解約率急増", value: "業界警戒水準へ", isHighlight: true },
        { label: "レイオフ", value: "全社的大規模解雇", isHighlight: true }
      ],
      sourceNote: "TechCrunch & SEC Disclosures"
    }
  ],

  // 35. Clubhouse (地雷事例)
  "ent_clubhouse_audio": [
    {
      id: "ev_clubhouse_crime",
      type: "THE_CRIME",
      title: "コロナ禍の完全招待制FOMOによる4,000億円評価額バブル",
      badge: "完全招待制FOMO",
      evidenceStatus: "VERIFIED",
      punchline: "「招待枠が2枚しかない」希少性でシリコンバレーのVCや芸能人を熱狂させ、密室の音声会話を聞くためのFOMO（見逃し恐怖）で世界的大流行。",
      details: [
        "イーロン・マスクやマーク・ザッカーバーグが突如ルームに現れる演出でサーバーがパンクするほどの社会的現象に。",
        "マネタイズ機能（課金や投げ銭）の実装を後回しにし、ユーザー数拡大の虚栄だけに突っ走った。"
      ],
      metrics: [
        { label: "ピーク時評価額", value: "$4.0B (約¥6,000億)", isHighlight: true },
        { label: "ピーク時週間DL", value: "960万回" }
      ],
      sourceNote: "Andreessen Horowitz 投資メモ & App Annie"
    },
    {
      id: "ev_clubhouse_fatal_bleed",
      type: "FATAL_BLEED",
      title: "Twitter Spacesによる機能コピーとクリエイター逃亡による崩壊検死",
      evidenceStatus: "VERIFIED",
      punchline: "Twitter（現X）がSpacesを実装した瞬間、すでに巨大なフォロワーを持つTwitter上で話す方が圧倒的に有利になり、配信者が全員離脱。",
      details: [
        "録音機能（アーカイブ）を頑なに拒否したため、配信してもコンテンツ資産がストックとして残らない構造的欠陥。",
        "ルームを開くクリエイターに金が1円も落ちないため、パンデミック収束とともにスピーカーが全員YouTubeやポッドキャストへ帰還。",
        "社員の半分以上を解雇し、アクティブユーザーはピーク時の数%へ激減。"
      ],
      metrics: [
        { label: "アクティブユーザー", value: "90%以上蒸発", isHighlight: true },
        { label: "レイオフ率", value: "50%以上解雇" }
      ],
      sourceNote: "Bloomberg & Paul Davison 社内通知ログ"
    }
  ],

  // 36. Quibi (地雷事例)
  "ent_quibi_failure": [
    {
      id: "ev_quibi_crime",
      type: "THE_CRIME",
      title: "2,000億円調達したスマホ短尺動画・月$4.99有料サブスクの錯覚",
      badge: "ハリウッドエゴの自滅",
      evidenceStatus: "VERIFIED",
      punchline: "ドリームワークス創業者カッツェンバーグとHP元CEOホイットマンが$1.75B（約2,600億円）を調達し、「1話10分の映画級短尺ドラマ」を有料販売。",
      details: [
        "スティーヴン・スピルバーグなどの大物監督に数億円をばら撒いて独占コンテンツを制作。",
        "「通勤中の電車で観る」ことを前提にスマホ縦横自動回転技術（Turnstyle）を開発。"
      ],
      metrics: [
        { label: "調達資金額", value: "$1.75B (約¥2,600億)", isHighlight: true },
        { label: "生存期間", value: "わずか6ヶ月", isHighlight: true }
      ],
      sourceNote: "Wall Street Journal & Quibi 閉鎖報告書"
    },
    {
      id: "ev_quibi_fatal_bleed",
      type: "FATAL_BLEED",
      title: "スクショ完全禁止によるSNS拡散遮断と無料TikTokとの競合敗綻の解剖",
      evidenceStatus: "VERIFIED",
      punchline: "ハリウッドの著作権保護に固執し「アプリ内のスクリーンショットや切り抜き共有を技術的に完全禁止」したため、SNSで1ミリも話題にならず自滅。",
      details: [
        "ローンチ直後にコロナ禍で「通勤」そのものが消滅。家ではテレビの大画面でNetflixやYouTubeを観るため、スマホ短尺の需要が蒸発。",
        "若者はTikTokやYouTubeで無限の無料コンテンツを消費しており、誰が好んで月$4.99払って10分ドラマを観るのかという根本的サバンナOSを無視。",
        "有料会員目標740万人に対し、わずか50万人しか集まらず、資金が残っているうちにわずか6ヶ月で会社を畳み全資産をRokuへ二値売り。"
      ],
      metrics: [
        { label: "焼失資本", value: "約¥2,000億円", isHighlight: true },
        { label: "目標達成率", value: "有料会員 6.7%で即死" }
      ],
      sourceNote: "Jeffrey Katzenberg 公開釈明インタビュー"
    }
  ],

  // 37. Hopin (地雷事例)
  "ent_hopin_failure": [
    {
      id: "ev_hopin_crime",
      type: "THE_CRIME",
      title: "コロナ特需で評価額1兆円まで駆け上がったオンラインイベントSaaS",
      badge: "一過性バブルの頂点",
      evidenceStatus: "VERIFIED",
      punchline: "世界中の展示会やカンファレンスが中止された隙間を突き、「バーチャル展示会場・ネットワーキング」ツールとして評価額$7.75B（約1.1兆円）へ急騰。",
      details: [
        "わずか2年でARR $100Mを達成し、シリコンバレー史上最速成長スタートアップともてはやされた。",
        "調達した巨額マネーでStreamYardなどを買い漁り、急激に組織を拡大。"
      ],
      metrics: [
        { label: "ピーク時評価額", value: "$7.75B (約¥1.1兆円)", isHighlight: true },
        { label: "ピーク時ARR", value: "$100M+ (約¥150億)" }
      ],
      sourceNote: "Hopin プレスリリース & Financial Times"
    },
    {
      id: "ev_hopin_fatal_bleed",
      type: "FATAL_BLEED",
      title: "リアル回帰による解約津波とわずか$15Mでの投げ売り売却検死",
      evidenceStatus: "VERIFIED",
      punchline: "パンデミック終了でリアルイベントが復活した瞬間、オンライン展示会の需要が全滅。解約が殺到し、主要事業をわずか$15Mで投げ売り売却。",
      details: [
        "1兆円の企業価値がついた主要SaaS事業を、買収額の1/500以下の二値でRingCentralへ売却。",
        "社員の80%以上を連続レイオフ。一過性のプラットフォーム特需を「永続する構造変化」と勘違いした典型的な死に様。"
      ],
      metrics: [
        { label: "売却額", value: "わずか$15M (評価額の1/500)", isHighlight: true },
        { label: "人員削減率", value: "80%以上解雇" }
      ],
      sourceNote: "Financial Times & TechCrunch"
    }
  ],

  // 38. Zenefits (地雷事例)
  "ent_zenefits_failure": [
    {
      id: "ev_zenefits_crime",
      type: "THE_CRIME",
      title: "人事労務SaaSを無料で配り保険手数料を中抜きする急成長モデル",
      badge: "無料バラマキ裏中抜き",
      evidenceStatus: "VERIFIED",
      punchline: "中小企業に人事給与SaaSを「完全無料」で提供し、裏で従業員の健康保険契約を自社経由に切り替えさせて巨額の仲介マージンを独占中抜き。",
      details: [
        "人事SaaSとして競合を無料の暴力で皆殺しにし、保険ブローカーとして荒稼ぎする天才的フリーミアム構造。",
        "シリコンバレー最速でユニコーン（評価額$4.5B、約6,500億円）へ到達。"
      ],
      metrics: [
        { label: "ピーク時評価額", value: "$4.5B (約¥6,500億)", isHighlight: true },
        { label: "ARR成長率", value: "前年比2,000%+" }
      ],
      sourceNote: "SEC & カリフォルニア州保険局 調査資料"
    },
    {
      id: "ev_zenefits_fatal_bleed",
      type: "FATAL_BLEED",
      title: "無資格営業マクロ「The Macro」の内部告発とCEO解任・巨額制裁金検死",
      evidenceStatus: "VERIFIED",
      punchline: "営業マンが保険仲介に必要な52時間の法定講習をサボるため、ブラウザ自動マクロ「The Macro」を組織的に使用していたことが発覚し一発退場。",
      details: [
        "創業CEO Parker Conradが自らマクロコードを書き、無資格の営業部隊に違法な保険営業をさせていた。",
        "規制当局（SECおよび各州保険局）から巨額の制裁金を科され、CEOは即時辞任、企業価値は一夜にして暴落。",
        "【教訓】金融・保険などの規制産業で、法律をショートカットする「技術的ごまかし」は露見した瞬間に事業ごと即死する。"
      ],
      metrics: [
        { label: "制裁金額", value: "数千万ドル (数十億円)", isHighlight: true },
        { label: "企業価値毀損", value: "半値以下へ減損" }
      ],
      sourceNote: "BuzzFeed News 内部告発スクープ & カリフォルニア州保険局処分書"
    }
  ]
};

// 安全な注入処理（コールバック関数を使用して $1 などの特殊展開を完全防止）
let updatedCount = 0;
for (const [entityId, cards] of Object.entries(EVIDENCE_CARDS_MAP)) {
  const cardsJson = JSON.stringify(cards, null, 4);
  const cardsSnippet = `    "evidenceCards": ${cardsJson},`;

  // "id": "entityId" ... "tags": [ ... ], の直後に安全挿入
  const tagsRegex = new RegExp(`("id":\\s*"${entityId}"[\\s\\S]*?"tags":\\s*\\[[\\s\\S]*?\\]\\s*,)`);
  if (tagsRegex.test(content)) {
    // 第2引数を関数にすることで $1 等の特殊展開を完全回避
    content = content.replace(tagsRegex, (match, p1) => {
      return `${p1}\n${cardsSnippet}`;
    });
    updatedCount++;
    console.log(`Safely injected evidenceCards for: ${entityId}`);
  } else {
    console.warn(`Could not find insertion point for: ${entityId}`);
  }
}

// 運用体制の初期人数／現在人数の二重軸化も適用
content = content.replace(
  /("operations":\s*\{[\s\S]*?"teamSize":\s*(\d+),)/g,
  (match, p1, teamSize) => {
    // 既に initialTeamSize がある場合はスキップ
    if (match.includes('"initialTeamSize"')) return match;
    const num = parseInt(teamSize, 10);
    const initialSize = num <= 2 ? 1 : num <= 10 ? 2 : Math.min(Math.round(num * 0.1), 5);
    return `${p1}\n      "initialTeamSize": ${initialSize},\n      "currentTeamSize": ${num},`;
  }
);

fs.writeFileSync(mockDataPath, content, 'utf-8');
console.log(`Successfully and safely updated ${updatedCount} / ${Object.keys(EVIDENCE_CARDS_MAP).length} entities in mockLedgerData.ts`);
