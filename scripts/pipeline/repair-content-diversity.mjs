import { readFileSync, writeFileSync, renameSync, statSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import crypto from 'node:crypto';

/**
 * Audit the catalog's descriptive fields without mutating the catalog.
 *
 * IMPORTANT: this file used to have a catalogue-wide --write path that
 * replaced accepted Japanese business summaries with generated citations and
 * disclaimers. That path is permanently disabled. The catalog's descriptive
 * fields are preserved data, not repair targets.
 *
 * Usage:
 *   node scripts/pipeline/repair-content-diversity.mjs --check
 *
 * --write is rejected deliberately. Use an explicitly reviewed historical
 * snapshot restore outside this generator when recovery is required.
 */

const root = process.cwd();
const indexPath = path.join(root, 'data/entities-index.json');
const args = new Set(process.argv.slice(2));
if (args.has('--write')) {
  console.error('[repair] write mode is permanently disabled; descriptive catalog fields must not be regenerated');
  process.exit(2);
}
const shouldWrite = false;
const shouldCheck = true;
const revisionFlag = process.argv.indexOf('--base-revision');
const baseRevision = revisionFlag >= 0 ? process.argv[revisionFlag + 1] : 'c2c39fd';

const BAD_GENERATED_MARKERS = [
  '特化型課題解決ソリューション',
  '特化ソリューション',
  '現場のボトルネックを解消し',
  '少数精鋭で手堅く現金を回収する',
  '高利益率特化型SaaS',
  '高収益ビジネスモデル',
  '特化型高収益サービス',
  '不要な手作業や非効率を徹底的に削ぎ落とした仕組みで高い利益率とキャッシュ創出力を実現するビジネスモデル',
  '高い利益率とキャッシュ創出力',
  '大手が「機能の多さ」ではなく',
  '大手が『機能の網羅性』で勝負する間',
  '直感の1クリックと痛みの即時解消',
  '特定業務ソリューションにおける稼働・収益再現性の検証レコード',
  '実在財務シグナル検証レポート',
  '公式プロダクト検証レポート',
  '大手が自社の既存主力モデルや商流の自社競合',
  '【既存大手の見落とし】',
  '顧客がお金を払っているのは「多機能さ」ではなく',
  '少数精鋭または完全1人運用',
  '対象の推定範囲:',
  '確認できた課題候補:',
  'NICHE_SAASの非効率や高コストに不満を持ち',
  '既存の汎用ツールの使いにくさや高額な価格設定',
  '現場責任者やプロフェッショナル層',
  '提供方式・実装詳細は公開情報で未確認',
  '公開情報で固有の提供内容は未確認',
  '台帳内で確認できる提供内容',
  '大手との参入条件・共食い構造は未確認',
  '面倒な手作業や高額な固定費負担を解消し',
  '解約不能の強固な基盤',
  '継続率、独自データ、供給制約などの防御要因は公開情報では未確認',
  '継続率・独自データ・供給制約・ブランド優位は未確認',
  '大手が参入できないニッチ領域を特化機能で独占',
  '業務の属人化、余計な手間、高額な仲介手数料の苦痛を解消',
  '開発者および事業者の保守・運用コスト',
  'Next.js + Stripe + Vercel',
  'Web UI × Stripe × Cloudflare × CDN',
  'Next.js × Cloudflare × Stripe × PostgreSQL',
  '特化の単一急所×高レバレッジ自走配管',
  '特化の高レバレッジ自走配管',
  '特化収益配管',
  '最短即日で解決し、業務効率を劇的に改善',
  '大手汎用サービスがマニアックな現場の細かな要望を放置',
  '創業者が自身の課題を解決する最小限のツール',
  'Next.js/モダンWeb基盤 × 特化ロジックAPI × セルフサーブ決済配管',
  '現場密着ワークフロー',
  '一度業務に組み込んだら乗り換えが面倒',
  '日々の業務で発生する手作業や非効率',
  '既存のやり方や高額なツールに不満を抱え',
  'まずは無料でお試し',
  '特定業務摩擦直撃',
  '公開情報では詳細不明だが',
  '固有スタック:',
  '専用Web基盤 × クラウドAPI',
  '初期見込み客へのパーソナライズ',
  '高いリピート率と口コミ紹介',
  '大手競合が汎用機能ばかり',
  '既存の大手プレイヤーは',
  '高いスイッチングコスト',
  '広告費に依存せず手堅く現金を回収',
  '手作業の工数浪費や専門知識不足による機会損失',
  '手動運用の非効率と高額な外注コスト',
  '特定業務の定型作業を最新AIモデルで自動化',
  'LEVERAGED_SOLO_PIPELINE',
  '高利益率特化型',
  '特化型MVPの公開と初期ユーザー獲得',
  'コミュニティでの口コミ拡散',
  'ターゲットが集まる現場やコミュニティに直接アプローチ',
  'コアな課題を抱えるコミュニティ（GitHub / Reddit / X / 専門業界フォーラム）への直接告知',
  '大手の機能肥大化に対して',
  '単一急所を突いたミニマリズム設計',
  '高粗利かつ低運用固定費による強固な手残り現金構造',
  '少数精鋭または完全1人運用による極小の固定費と高利益率',
  '解約を防ぐ構造的要因',
  '創業初期の顧客獲得ログ',
  '市場の死角と優位性',
  '実運用ツール構成',
  '日々の面倒な手作業の繰り返し',
  '大手が参入すると既存の単価・代理店ネットワークを破壊してしまう',
  '既存業界の構造的バグ',
  '関所候補:',
  '構造上の未確認点:',
  '確認できた防御要因:',
  '大手との参入条件・共食い構造は未確認',
  '確認できた提供経路は',
  '台帳観測（要照合）:',
  '累計売上4億円超',
  'エンジニアが作った画面が絶望的にダサい',
];

const TOPIC_RULES = [
  // Prefer concrete domain signals over incidental words such as "video",
  // "finance", "flight", or "social" that frequently appear in unrelated
  // descriptions.  These rules intentionally run before the broad legacy
  // rules below.
  { test: /local news|local journalism|paid subscribers|community news|newspaper|地方紙|地域ニュース/i, topic: '地域メディア', mechanism: '地域情報の取材・購読・読者接点' },
  { test: /buys? or shorts?|wall street|stock(?:s)?|investor|investing|investment portfolio|consumer shifts.*stocks|株式|投資|証券/i, topic: '投資・市場分析', mechanism: '公開シグナルの収集・投資判断' },
  { test: /competitor pricing|product ingredients|beauty products?|market intelligence|競合価格|商品トレンド|市場調査/i, topic: '市場調査・競合分析', mechanism: '公開商品情報・競合シグナルの収集比較' },
  { test: /facebook marketplace|tiktok shop|amazon (?:seller|arbitrage|listing)|resell(?:ing)?|retail arbitrage|marketplace seller|\be-?commerce\b|物販|通販/i, topic: 'EC・物販', mechanism: '商品情報と販売導線の接続' },
  { test: /one-page sites?|qr[- ]?code postcard|local contractors?|garage floor coating|concrete coating|balloon arches?|party chair rental|canopy tents?|dog walking|dog adventure|doggy daycare|pet service|pet breeder|laundromat|lemonade stand|burrito|flower truck|window cleaning|portable toilet|drone spraying|permit expedit|coffee cart|cotton candy machine|junk removal|pressure washing|mobile detailing|line[- ]striping|sealcoating|wall printing|prints? murals?|mural printing|custom photo magnets|現場施工|出張サービス|地域密着/i, topic: '現場サービス', mechanism: '地域の現場提供・予約・集客' },
  { test: /\bshopify app\b|\bapp portfolio\b|micro[- ]?saas portfolio|アプリポートフォリオ/i, topic: 'ニッチSaaS', mechanism: '特定業務向けアプリの継続提供' },
  { test: /prayer app|prayer session|habit app|mobile app|app developer|phone.*lock|locks? the phone|subscription.*app|calorie tracker|focus timer|モバイルアプリ|アプリ開発/i, topic: 'モバイルアプリ', mechanism: '端末上の単一行動・習慣への機能提供' },
  { test: /\bquot(?:e|es|ing)\b|\bestimate(?:s|d)?\s+(?:quote|price|cost|job|project)\b|\binvoice(?:s)?\b|\bdigital signature\b|job description.*(?:quote|price)|見積|請求|電子署名/i, topic: '見積・請求業務', mechanism: '見積作成・承認・請求の業務接続' },
  { test: /document.*podcast|podcast.*document|turning any document|文書.*ポッドキャスト|ポッドキャスト.*文書/i, topic: '音声処理', mechanism: '文書の音声化・編集・聴取' },
  { test: /facebook page|page growth|social media (?:marketing|management|content|posts?)|linkedin ghostwriter|influencer marketing|follower growth|sns運用|ソーシャルリスニング/i, topic: 'SNS発信・成長', mechanism: '投稿・配信・反応計測' },
  { test: /software test|quality assurance|cat検定|ソフトウェアテスト|テスター|品質保証|テスト工程/i, topic: '品質保証・テスト', mechanism: 'テスト工程の標準化・検証' },
  { test: /\btranslation\b|\btranslator\b|\btranslate\b|\btranslating\b|翻訳|翻訳者|言語変換/i, topic: '翻訳', mechanism: '文脈・用語を踏まえた多言語変換' },
  { test: /\bmusic (?:production|producer|business|distribution|course)\b|\bsong(?:s)?\b|\blyrics?\b|\baudio music\b|音楽|楽曲|作曲/i, topic: '音楽制作', mechanism: 'テキスト・歌詞からの楽曲制作' },
  { test: /essay|academic writing|作文|エッセイ|学術執筆/i, topic: '文章・学術執筆', mechanism: '文章構成・執筆支援' },
  { test: /lead tracking|lead scoring|crm|whatsapp automation|見込み客|リード管理/i, topic: 'リード管理・CRM', mechanism: '問い合わせの記録・スコアリング・追客' },
  { test: /erp|managed it|business process outsourcing|\bbpo\b|業務システム|運用代行/i, topic: 'IT運用・BPO', mechanism: '業務システム導入・運用支援' },
  { test: /guest blogging|content platform|content marketing|blog posts?|publishing platform|記事|ブログ記事|コンテンツ出版/i, topic: 'コンテンツ出版', mechanism: '記事の制作・掲載・読者接点' },
  { test: /freelanc(?:er|ing).*?(?:client|project|business|work)|creative team|client[s ]+and operations|フリーランス|案件管理/i, topic: 'フリーランス業務管理', mechanism: '案件・顧客・請求・運用情報の一元管理' },
  { test: /social (?:media|network)|linkedin (?:posts?|influencer|marketing)|content creator|influencer|sns運用|ソーシャルリスニング/i, topic: 'SNS発信・成長', mechanism: '投稿作成・配信・反応計測' },
  { test: /search engine optimization|検索流入|organic seo|backlinks|\bseo\b/i, topic: '検索流入・SEO', mechanism: '検索意図に沿う発見導線の計測' },
  { test: /photo sharing|event photography|photographer|写真共有|写真館|顔認識/i, topic: '写真共有', mechanism: '撮影写真の同期・検索・配布' },
  { test: /crossfit|emom|amrap|tabata|gym timer|workout|fitness|筋トレ|フィットネス/i, topic: 'トレーニング計測', mechanism: '運動種目のタイマー・記録' },
  { test: /browser games?|online games?|html5 games?|casual games?|ゲーム配信|ブラウザゲーム/i, topic: 'ブラウザゲーム配信', mechanism: 'ゲームの厳選・ブラウザ配信' },
  { test: /video games?|gaming platform|game wiki|game community|game developer|mods? for|ゲーム|ゲーム配信/i, topic: 'ゲーム・コミュニティ', mechanism: 'ゲーム情報・作品・プレイヤー接点' },
  { test: /kyb|due diligence|companies house|company data|登記|コンプライアンス/i, topic: '企業情報/KYB', mechanism: '公的企業データの取得・正規化' },
  { test: /astrology|birth chart|astrologer|占星術|出生図/i, topic: 'AI占星術相談', mechanism: '出生図を会話型の解釈へ変換' },
  { test: /cashback|coupon|aliexpress|shopee|lazada|キャッシュバック|クーポン/i, topic: 'EC還元・クーポン', mechanism: '複数ECの還元情報・クーポン集約' },
  { test: /job search|job board|recruit|recruitment|hiring|求人|採用|人材/i, topic: '求人・採用', mechanism: '求人情報と候補者の検索・接続' },
  { test: /newsletter|substack|medium|blog (?:posts?|site)|publishing platform|メルマガ|ニュースレター|出版/i, topic: '出版・ニュースレター', mechanism: '記事配信と購読者接点' },
  { test: /\bpdf\b|\bdocument(?:s)?\b|\bocr\b|\bcontract\b|\bpaper\b|論文|文書|書類/i, topic: 'PDF・文書処理', mechanism: '文書の検索・抽出・要約' },
  { test: /\bvideo (?:editor|editing|generator|creation|production|maker)\b|\bscreen recorder\b|\bsubtitle\b|\bcaption(?:ing)?\b|\btiktok (?:tool|analytics|marketing)\b|\breels? (?:tool|editor)\b|動画|字幕|録画/i, topic: '動画制作', mechanism: '録画・字幕・編集の自動化' },
  { test: /\baudio (?:editor|processing|generator)\b|\bpodcast(?:ing)?\b|\bvoice\b|\btranscri(?:be|ption)\b|音声|議事録|録音/i, topic: '音声処理', mechanism: '音声の文字起こし・要約' },
  { test: /email automation|email marketing|email outreach|mailbox|send.*mail|sales email|営業メール|メール配信/i, topic: '営業メール', mechanism: '送信・到達・返信の管理' },
  { test: /\bsql\b|\bdatabase\b|\bquery\b|データベース|クエリ/i, topic: 'データ・SQL', mechanism: 'スキーマを踏まえたデータ検索' },
  { test: /micro[- ]?saas|niche saas|saas (?:tools?|product|business)|diagram editor|rhyming dictionary/i, topic: 'ニッチSaaS', mechanism: '単一業務向けソフトウェア提供' },
  { test: /\bapi\b|\bsdk\b|developer tool|\bgithub\b|\bopen[- ]source (?:project|tool|software)\b|オープンソース|開発者向け/i, topic: '開発者向け基盤', mechanism: '開発者向けAPI・コード接点' },
  { test: /design tool|design system|\bui\b|\bux\b|\bfigma\b|\billustration\b|designer|デザイン|イラスト/i, topic: 'デザイン制作', mechanism: 'UI・ビジュアル制作の部品化' },
  { test: /real estate|property|不動産|賃貸|物件/i, topic: '不動産情報', mechanism: '物件情報の探索・仲介接点' },
  { test: /amazon|ecommerce|e-commerce|shopify|retail|小売|物販|通販/i, topic: 'EC・物販', mechanism: '商品情報と販売導線の接続' },
  { test: /\btravel (?:booking|search|planner|platform)\b|\bflight (?:search|booking|api)\b|\bairline\b|\bhotel booking\b|旅行|航空|ホテル予約/i, topic: '旅行・航空情報', mechanism: '旅行商品の検索・予約接点' },
  { test: /\bfinancial (?:data|service|platform)\b|\bbank(?:ing)?\b|\bpayment (?:processing|platform|api|gateway)\b|\bcheckout\b|\bbilling platform\b|\bfintech\b|\bcredit card\b|決済|金融/i, topic: '金融・決済', mechanism: '金融データ・決済接続' },
  { test: /saas|micro-saas|software tool|software|diagram editor|dictionary|アプリ|ソフトウェア/i, topic: 'ニッチSaaS', mechanism: '単一業務向けソフトウェア提供' },
];

const CUSTOMER_BY_TOPIC = {
  '地域メディア': '地域の出来事を知りたい住民、または地域情報を届ける購読者・広告主',
  '投資・市場分析': '公開情報から投資判断を行う投資家・市場参加者',
  '市場調査・競合分析': '競合商品・価格・需要の変化を把握したい事業者・商品担当者',
  '現場サービス': '地域で施工・設営・清掃・運搬などを依頼する顧客',
  'モバイルアプリ': '端末上の特定行動や習慣を継続したい利用者',
  '見積・請求業務': '見積・承認・請求を扱う現場サービス事業者',
  '音楽制作': '文章や歌詞から楽曲を作りたい音楽制作者・クリエイター',
  '文章・学術執筆': 'レポートやエッセイの構成・推敲を行う学生・執筆者',
  'リード管理・CRM': '問い合わせや見込み客への追客を管理する営業チーム',
  'IT運用・BPO': '業務システム導入やIT運用を外部へ委託する企業',
  'コンテンツ出版': '記事を作成・掲載し読者へ届ける発行者・メディア運営者',
  'フリーランス業務管理': '案件・顧客・請求・日々の運用をまとめたいフリーランスや小規模チーム',
  'トレーニング計測': 'EMOM・AMRAP・Tabataなどを行うトレーニーやジム利用者',
  'ブラウザゲーム配信': '短時間でインストールなしのゲームを探すプレイヤー',
  '企業情報/KYB': '企業確認・デューデリジェンスを行う開発者やコンプライアンス担当者',
  'AI占星術相談': '出生図について会話型の解釈を求める利用者',
  'EC還元・クーポン': '複数のECで価格・還元・クーポンを比較する買い物客',
  '求人・採用': '求人を探す候補者、または採用候補へ接触したい企業',
  '出版・ニュースレター': '読者へ継続的に記事・ニュースを届ける発行者',
  'PDF・文書処理': '契約書・論文・社内文書を扱う実務担当者',
  '動画制作': '短尺動画やプロダクトデモを作るクリエイター・マーケター',
  '音声処理': '会議・取材・ポッドキャストの音声を扱う利用者',
  '営業メール': '新規顧客へのアウトバウンド営業を行うチーム',
  'データ・SQL': 'データ抽出や意思決定を行うマーケター・事業担当者',
  '開発者向け基盤': 'APIやOSSを使ってプロダクトを作る開発者',
  'デザイン制作': 'Webサイトやプロダクトの見た目を作るデザイナー・開発者',
  '不動産情報': '物件を探す購入者・入居者、または物件を扱う事業者',
  'EC・物販': '商品を買う消費者、または販売在庫を扱う事業者',
  '旅行・航空情報': '旅行条件を比較して予約したい利用者',
  '金融・決済': '支払いや金融データを業務に組み込む企業・開発者',
};

const PAIN_BY_TOPIC = {
  '地域メディア': '地域情報の取材・編集・購読者獲得を継続する負担',
  '投資・市場分析': '分散した公開シグナルを比較し、判断へ変換する時間',
  '市場調査・競合分析': '商品・価格・競合シグナルを複数の場所から集めて比較する時間',
  '現場サービス': '地域顧客の獲得、見積もり、現場作業を安定して回す負担',
  'モバイルアプリ': '特定の行動を続ける際の誘惑・中断・記録の負担',
  '見積・請求業務': '現場情報を見積・承認・請求へ転記する手作業',
  '音楽制作': '作曲・編曲・試作を一から行う時間と、既存AI音楽ツールの出力制約',
  '文章・学術執筆': '考えを構造化し、読みやすい文章へ仕上げるまでの時間',
  'リード管理・CRM': '問い合わせの取りこぼしと、見込み客への追客を手作業で繰り返す負担',
  'IT運用・BPO': '複数の業務システム・運用作業を社内だけで維持する負担',
  'コンテンツ出版': '記事の制作・掲載先の確保・読者への到達を別々に運用する手間',
  'フリーランス業務管理': '案件・顧客・請求・作業状況が複数ツールに分散する負担',
  'トレーニング計測': '多機能な既存アプリを操作する時間が運動中の集中を削ること',
  'ブラウザゲーム配信': '面白くてすぐ遊べるゲームを見つける探索コスト',
  '企業情報/KYB': '公的APIのレート制限と未加工データを手作業で解析する負担',
  'AI占星術相談': '静的な鑑定しか得られず、対話には高い従量料金がかかること',
  'EC還元・クーポン': '販売店ごとに還元条件やクーポンを探し直す手間',
  '求人・採用': '総合サイトで必要な候補者や求人へ絞り込めないこと',
  '出版・ニュースレター': '発行・購読者管理・課金を別々に運用する負担',
  'PDF・文書処理': '大量の文書から必要な箇所を手作業で探す時間',
  '動画制作': '録画・字幕・編集を別工程で繰り返す制作時間',
  '音声処理': '長い音声を聞き直して記録へ変換する時間',
  '営業メール': '見込み客の調査・送信・返信管理を手作業で繰り返す負担',
  'データ・SQL': '必要なデータ抽出をエンジニアへ依頼して待つ時間',
  '開発者向け基盤': '既存APIやOSSを組み合わせる際の設定・保守負担',
  'デザイン制作': '同じUI部品や制作工程を毎回作り直す時間',
  '不動産情報': '分散した物件情報を比較し、条件に合う候補へ到達する手間',
  'EC・物販': '商品情報・在庫・販売先をつなぐ作業負担',
  '旅行・航空情報': '条件に合う便や宿泊先を横断比較する時間',
  '金融・決済': '複数の金融接続や決済処理を個別に実装する負担',
};

const get = (object, dotted) => dotted.split('.').reduce((value, key) => value?.[key], object);

function decodeHtml(value) {
  return String(value ?? '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#([0-9]+);/g, (_, code) => String.fromCodePoint(Number(code)));
}

function sanitizeUnicode(value) {
  const text = String(value ?? '');
  let result = '';
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = text.charCodeAt(index + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        result += text[index] + text[index + 1];
        index += 1;
      } else {
        result += '\ufffd';
      }
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      result += '\ufffd';
    } else {
      result += text[index];
    }
  }
  return result;
}

function clean(value) {
  return sanitizeUnicode(decodeHtml(value))
    .replace(/<[^>]+>/g, ' ')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/「+/g, '「')
    .replace(/」+/g, '」')
    .replace(/Indie Hackers表示/g, 'Indie Hackers報告値')
    .replace(/報告値・利益ではない/g, '第三者報告値（利益未確認）')
    .replace(/掲載タグラインが示す課題/g, '公開タグラインの課題')
    .replace(/防御要因は未確認/g, '防御要因は公開情報では未確認')
    .trim();
}

function clip(value, max = 220) {
  const text = clean(value);
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(1, max - 1)).trim()}…`;
}

function textOf(value) {
  if (Array.isArray(value)) return value.map(textOf).filter(Boolean).join(' | ');
  if (value && typeof value === 'object') return Object.values(value).map(textOf).filter(Boolean).join(' | ');
  return value == null ? '' : clean(value);
}

function hashNumber(value) {
  return Number.parseInt(crypto.createHash('sha256').update(String(value)).digest('hex').slice(0, 8), 16);
}

function tailOf(entity) {
  return String(entity.id || hashNumber(entity.name)).replace(/[^a-z0-9]/gi, '').slice(-8).toUpperCase();
}

function hasGeneratedMarker(value) {
  const text = textOf(value);
  return BAD_GENERATED_MARKERS.some((marker) => text.includes(marker))
    || /型アプローチ[】】]/.test(text)
    || /大手の死角Googleや|広告費に依存せず手堅く/.test(text);
}

function isLegacyGeneratedText(value) {
  return /台帳観測（要照合）|創業初期の顧客獲得ログ|市場の死角と優位性|実運用ツール構成|累計売上4億円超|エンジニアが作った画面が絶望的にダサい/.test(textOf(value));
}

function isConcrete(value) {
  const text = textOf(value);
  if (text.length < 18 || hasGeneratedMarker(text) || isLegacyGeneratedText(text)) return false;
  if (/^(?:UNKNOWN|未確認|不明|なし|公開情報では.+未確認。?)$/i.test(text)) return false;
  if (/顧客属性の詳細未確認|実装方式は公開.+未確認|継続率・独自データ.+未確認/.test(text)) return false;
  return true;
}

function uniqueStrings(values) {
  const result = [];
  const seen = new Set();
  for (const value of values) {
    const item = clean(value);
    if (!item || seen.has(item)) continue;
    seen.add(item);
    result.push(item);
  }
  return result;
}

function isFinancialLine(value) {
  return /(?:月商|年商|営業利益|revenue|profit|reported revenue|報告値|財務|原価|営業経費|損益)/i.test(textOf(value));
}

function isStackOnly(value) {
  const text = clean(value);
  if (!text) return false;
  const separators = (text.match(/[×x+]/g) || []).length;
  const technologyTokens = (text.match(/\b(?:Vue(?:\.js)?|React(?:\.js)?|Node(?:\.js)?|AWS|Stripe|Vercel|Supabase|Cloudflare|PostgreSQL|OpenAI|Python|Next(?:\.js)?)\b/gi) || []).length;
  return separators >= 2 || (technologyTokens >= 3 && !/[。！？]/.test(text) && text.length < 180);
}

function topicCorpus(value) {
  return clean(value)
    .replace(/\[[^\]]*(?:https?:\/\/|出典[:：]|source[:：])[^\]]*\]/gi, ' ')
    .replace(/https?:\/\/\S+/gi, ' ')
    .replace(/(?:出典|source)[:：]\s*\S+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function observationStrings(entity) {
  return uniqueStrings([
    ...(Array.isArray(entity?.observations) ? entity.observations : []),
    ...(Array.isArray(entity?.observationsStream) ? entity.observationsStream.map((item) => item?.text) : []),
  ]);
}

function mergedObservations(current, base, raw) {
  return uniqueStrings([...observationStrings(raw), ...observationStrings(base), ...observationStrings(current)]);
}

function extractSource(entity, base, raw) {
  const lines = mergedObservations(entity, base, raw);
  const indieDescriptions = [];
  const ebizSummaries = [];
  const titles = [];
  const financialLines = [];
  const explicitFacts = [];

  for (const line of lines) {
    const normalized = clean(line);
    let match = normalized.match(/^Indie Hackers公開説明:\s*(.+)$/i);
    if (match?.[1] && match[1].length > 8) indieDescriptions.push(match[1]);
    match = normalized.match(/^Indie Hackers listing:\s*(.+)$/i);
    if (match?.[1] && match[1].length > 8) indieDescriptions.push(match[1]);
    match = normalized.match(/Indie Hackersの掲載説明は[「"](.+?)[」"]。?$/i);
    if (match?.[1] && match[1].length > 8) indieDescriptions.push(match[1]);
    match = normalized.match(/^(?:記事要約|eBiz Facts記事要約|プロフィール記事要約):\s*(.+)$/i);
    if (match?.[1] && match[1].length > 8) ebizSummaries.push(match[1]);
    match = normalized.match(/^eBiz Factsプロフィール記事:\s*(.+)$/i);
    if (match?.[1] && match[1].length > 8) explicitFacts.push(match[1]);
    match = normalized.match(/title=([^;]+)/i);
    if (match?.[1] && !/タイトル未取得|HTTP ERROR|Just a moment/i.test(match[1])) titles.push(match[1]);
    if (/(?:Indie Hackers表示|記事記載金額|月商|年商|monthly revenue|monthly profit|reported money signal|revenue|profit)/i.test(normalized)) {
      if (!/公開報告値$|売上・利益は未確認$/.test(normalized)) financialLines.push(normalized);
    }
    if (/^【/.test(normalized) && !hasGeneratedMarker(normalized) && !isLegacyGeneratedText(normalized) && normalized.length > 24) explicitFacts.push(normalized);
  }

  const description = [...indieDescriptions, ...ebizSummaries]
    .sort((a, b) => b.length - a.length)[0] || '';
  const title = uniqueStrings(titles)[0] || '';
  // Prefer the old concise product description. Do not use a generated
  // blindspot/tagline as the "source" merely because it is longer.
  const fallbackCandidates = [
    raw?.essence?.whatItDoes,
    raw?.essence?.targetCustomer,
    raw?.essence?.painRelief,
    raw?.strategy?.blindspot,
    raw?.strategy?.secretInsight,
    base?.essence?.whatItDoes,
    base?.essence?.targetCustomer,
    base?.essence?.painRelief,
    ...explicitFacts,
    base?.pipelineStack,
    title,
    base?.tagline,
  ].filter((value) => isConcrete(value) && !hasGeneratedMarker(value) && !isFinancialLine(value) && !isStackOnly(value));
  const observationFallback = lines
    .filter((line) => isConcrete(line) && !hasGeneratedMarker(line))
    .filter((line) => !isFinancialLine(line))
    .filter((line) => !isStackOnly(line))
    .sort((a, b) => b.length - a.length)[0] || '';
  const fallback = observationFallback || fallbackCandidates[0] || '';
  const descriptor = clip(description || title || fallback || `公開説明未取得。記録名: ${entity.name}`, 230);
  const sourceLabel = description
    ? (indieDescriptions.length > 0 ? 'Indie Hackers公開説明' : 'eBiz Facts記事要約')
    : title
      ? '公式ページタイトル'
      : fallback
        ? '台帳内の観測（要照合）'
        : '公開説明未取得';
  const financial = financialLines.sort((a, b) => b.length - a.length)[0] || '';
  const url = clean(entity.url || base?.url || '');
  return { lines, description, title, fallback, descriptor, sourceLabel, financial, url, explicitFacts };
}

function selectTopic(source) {
  // If an explicit source exists, do not let polluted legacy fields decide
  // the category. The source text and official title are the only admissible
  // classification corpus for that record.
  const explicitCorpus = [source.description, source.title].filter(Boolean).join(' ');
  const found = TOPIC_RULES.find((rule) => rule.test.test(topicCorpus(explicitCorpus)));
  if (found) return found;
  if (source.description || source.title) {
    return { topic: '用途未確認', mechanism: `提供物「${clip(source.descriptor, 42)}」の実装・課金経路を照合` };
  }
  // A fallback observation can remain useful as an audit anchor, but it is
  // not strong enough to classify the business. In particular, old generated
  // fields and channel/tool labels have repeatedly misclassified products
  // (for example, a mail tool as a game or an airline as retail software).
  return {
    topic: '用途未確認',
    mechanism: '提供方式・実装詳細は公開情報で未確認',
  };
}

function sourceToken(source, entity) {
  const base = source.descriptor || entity.name;
  const token = clean(base)
    .replace(/^公開説明(?:に記載された提供内容)?[:：]?\s*/i, '')
    .replace(/[「」『』【】]/g, '')
    .trim();
  return clip(token || entity.name, 64);
}

function financialNote(entity, base, source) {
  const label = entity?.pnl?.revenueLabel || base?.pnl?.revenueLabel || source.financial;
  const status = entity?.pnl?.financialStatus || base?.pnl?.financialStatus;
  if (status === 'POST_MORTEM') return '財務観測: 失敗・撤退側の記録。死因と数値の根拠をP&L欄で照合する。';
  if (label || status === 'VERIFIED' || status === 'REPORTED' || status === 'ESTIMATED') {
    return '財務観測: 報告・推計値の候補はあるが、現在の月商・利益・原価・税・手残りとして独立確認していない。';
  }
  return '財務観測: 売上・原価・利益の独立確認は未取得。';
}

const PNL_UNCONFIRMED_FIELDS = [
  ['monthlyRevenue', 'isRevenueUnconfirmed'],
  ['operatingProfit', 'isOperatingProfitUnconfirmed'],
  ['operatingMargin', 'isMarginUnconfirmed'],
  ['grossProfit', 'isGrossProfitUnconfirmed'],
  ['grossMargin', 'isGrossMarginUnconfirmed'],
  ['cogs', 'isCogsUnconfirmed'],
  ['operatingExpenses', 'isCostsUnconfirmed'],
  ['estimatedAnnualNetProfit', 'isNetProfitUnconfirmed'],
];

function hasExactSupportedBinding(entity, claimKey, value) {
  return (Array.isArray(entity?.claimBindings) ? entity.claimBindings : []).some((binding) => {
    if (binding?.claimKey !== `pnl.${claimKey}`) return false;
    if (binding?.verificationStatus !== 'SUPPORTED' || binding?.supportCheck !== 'PASS') return false;
    if (!binding.foundationEvidenceId || binding.claimValue !== value) return false;
    const target = textOf(binding.locator?.targetText || binding.locator?.excerpt || '');
    // A peak, approximate, range, or ceiling is not an exact current value.
    return !/約|〜|～|から|まで|peak|range|up to|maximum|最高|最盛期/i.test(target);
  });
}

function reportedRevenueLabel(entity, pnl) {
  const existing = clean(pnl.revenueLabel || '');
  const lines = observationStrings(entity);
  const rawLine = lines.find((line) => /(?:月商|年商|US\$|USD|monthly revenue|reported revenue)/i.test(line));
  const bindingLine = (entity.claimBindings || [])
    .map((binding) => clean(binding?.locator?.targetText || ''))
    .find((line) => line && /(?:月商|年商|US\$|USD|revenue|売上)/i.test(line));
  const candidate = (bindingLine || rawLine || existing)
    .replace(/^(?:報告値（未検証）:\s*)+/u, '')
    .trim();
  if (!candidate) return '報告値（未検証・金額表示なし）';
  if (/¥\s*\d{4,}万円|(?:月商|年商)\s*[^。]{0,20}\d{4,}万円/i.test(candidate)) {
    return '報告値（原文の単位表記を要監査）';
  }
  return `報告値（未検証）: ${clip(candidate, 150)}`;
}

function normalizeFinancialConfidence(entity) {
  const pnl = entity.pnl;
  if (!pnl || typeof pnl !== 'object') return;

  // The catalogue contains reports and modelled P&L, not a complete set of
  // independently verified current accounts. Preserve all numeric values and
  // observations, but prevent them from being rendered as confirmed facts.
  for (const [field, flag] of PNL_UNCONFIRMED_FIELDS) {
    pnl[flag] = !hasExactSupportedBinding(entity, field, pnl[field]);
  }
  if (pnl.financialStatus === 'VERIFIED') pnl.financialStatus = 'REPORTED';
  pnl.revenueLabel = reportedRevenueLabel(entity, pnl);
  let sourceDoc = clean(pnl.sourceDoc || '');
  const wrapper = '原本URL未結合（旧台帳ラベル:';
  while (sourceDoc.startsWith(wrapper) && sourceDoc.endsWith('）')) {
    sourceDoc = sourceDoc.slice(wrapper.length, -1).trim();
  }
  if (/実在財務シグナル検証レポート|公式プロダクト検証レポート/.test(sourceDoc)) {
    pnl.sourceDoc = `原本URL未結合（旧台帳ラベル: ${sourceDoc}）`;
  }

  entity.isGrowthUnconfirmed = true;
  const operations = entity.operations;
  if (operations && typeof operations === 'object') {
    operations.isTeamSizeUnconfirmed = true;
    operations.isWeeklyHoursUnconfirmed = true;
    operations.isCapitalUnconfirmed = true;
    operations.isAutomationUnconfirmed = true;
    for (const tool of Array.isArray(operations.toolStack) ? operations.toolStack : []) {
      if (tool && typeof tool === 'object') tool.isCostUnconfirmed = true;
    }
  }
}

function isSpecificUnboundFinancialObservation(text) {
  return /公開報告値|記事記載金額|Indie Hackers報告値|reported money signal|monthly\s+(?:revenue|profit)|(?:月商|年商)\s*[^。]{0,80}\d|(?:US\$|USD|\$)\s*\d[\d,.]*\s*[KMB]?/i.test(text);
}

function quarantineUnboundFinancialClaims(entity) {
  const pnl = entity.pnl;
  if (!pnl || typeof pnl !== 'object') return;
  if (hasExactSupportedBinding(entity, 'monthlyRevenue', pnl.monthlyRevenue)) return;

  // Keep the raw number in incoming/raw evidence, but never project an
  // unbound amount into the catalogue label or the observable stream. This
  // prevents malformed community claims from looking like usable revenue.
  pnl.revenueLabel = '財務値未確認（原本照合待ち）';
  if (pnl.estimationLogic) pnl.estimationLogic = '原本照合前のモデル値は表示対象外。';

  if (Array.isArray(entity.observationsStream)) {
    let replaced = false;
    entity.observationsStream = entity.observationsStream.filter((observation) => {
      const text = clean(observation?.text || '');
      if (!isSpecificUnboundFinancialObservation(text)) return true;
      if (replaced) return false;
      replaced = true;
      observation.text = '公開報告値（具体額は原本照合待ち。利益・原価・手残りは未確認。）';
      observation.category = 'RESEARCH_LIMIT';
      observation.categoryLabel = '報告値と利益の分離';
      observation.originType = 'reported';
      observation.verificationStatus = 'UNVERIFIED';
      return true;
    });
  }

  if (Array.isArray(entity.observations)) {
    let replaced = false;
    entity.observations = entity.observations.filter((observation) => {
      const text = clean(observation);
      if (!isSpecificUnboundFinancialObservation(text)) return true;
      if (replaced) return false;
      replaced = true;
      return '公開報告値（具体額は原本照合待ち。利益・原価・手残りは未確認。）';
    });
  }
}

function quarantineUnboundOperations(entity) {
  const operations = entity.operations;
  if (!operations || typeof operations !== 'object') return;
  const oldToolCount = Array.isArray(operations.toolStack) ? operations.toolStack.length : 0;
  const oldChannelCount = Array.isArray(operations.primaryChannels) ? operations.primaryChannels.length : 0;
  if (oldToolCount || oldChannelCount) {
    entity.unknownsNotes = uniqueStrings([
      ...(Array.isArray(entity.unknownsNotes) ? entity.unknownsNotes : []),
      `ツール構成${oldToolCount}件・集客チャネル${oldChannelCount}件は事例固有の原本結合が未確認のため画面表示から隔離した。元候補はincoming/rawと監査バックアップを照合する。`,
    ]);
  }
  // These fields were populated by a broad generator and can be materially
  // wrong for a particular business (for example, retail POS on an airline).
  // Keep the financial entity usable while refusing to present them as facts.
  operations.toolStack = [];
  operations.primaryChannels = [];
}

function addUnknownNote(entity, note) {
  entity.unknownsNotes = uniqueStrings([
    ...(Array.isArray(entity.unknownsNotes) ? entity.unknownsNotes : []),
    note,
  ]);
}

function hasSupportedBinding(entity, prefix) {
  return (Array.isArray(entity?.claimBindings) ? entity.claimBindings : []).some((binding) => (
    typeof binding?.claimKey === 'string' &&
    binding.claimKey.startsWith(prefix) &&
    binding.verificationStatus === 'SUPPORTED' &&
    binding.supportCheck === 'PASS' &&
    Boolean(binding.foundationEvidenceId)
  ));
}

function quarantineUnboundCommercialClaims(entity) {
  if (entity.acquisition && typeof entity.acquisition === 'object') {
    addUnknownNote(entity, 'CAC・集客ファネル・獲得施策は事例固有の原本結合が未確認のため画面表示から隔離した。元候補はincoming/rawと監査バックアップを照合する。');
    delete entity.acquisition;
  }

  const originalTags = Array.isArray(entity.tags) ? entity.tags : [];
  const retainedTags = originalTags.filter((tag) => (
    tag === '収集事例' ||
    (entity.pnl?.financialStatus === 'POST_MORTEM' && tag === '失敗・撤退の検証')
  ));
  if (retainedTags.length !== originalTags.length) {
    addUnknownNote(entity, `業種・優位性・運用方式を示すタグ${originalTags.length - retainedTags.length}件は事例固有の原本結合が未確認のため画面表示から隔離した。`);
  }
  entity.tags = retainedTags;

  // A legacy "verified" bit was populated without a current, independently
  // bound evidence card. Never let that bit turn an unverified record into a
  // verified UI state.
  if (entity.verifiedBadge === true) {
    addUnknownNote(entity, '旧verifiedBadgeは独立した原本・主張結合を確認できないため無効化した。');
    entity.verifiedBadge = false;
  }

  const temporal = entity.temporal;
  if (!temporal || typeof temporal !== 'object') return;
  const hasTemporalProof = hasSupportedBinding(entity, 'temporal.');
  if (!hasTemporalProof) {
    const hadTemporalClaim = Boolean(
      Number(temporal.foundedYear) > 0 ||
      temporal.viabilityStatus && temporal.viabilityStatus !== 'UNKNOWN' ||
      temporal.currentViabilityAnalysis
    );
    if (hadTemporalClaim) {
      addUnknownNote(entity, '創業年・時代背景・現在の稼働/再現性判定は事例固有の原本結合が未確認のため画面表示から隔離した。');
    }
    temporal.foundedYear = 0;
    temporal.initialTractionPeriod = '創業年・初動獲得経路は未確認。';
    temporal.dataSnapshotPeriod = 'データ観測時点・原本結合は未確認。';
    temporal.viabilityStatus = 'UNKNOWN';
    temporal.viabilityLabel = '現在の稼働・継続性は未確認';
    temporal.eraContext = '時代背景・規制環境・プラットフォーム条件は原本照合後に評価する。';
    temporal.currentViabilityAnalysis = '現在の稼働・継続性・再現性は未確認。掲載説明や登録日だけでは断定しない。';
  }
}

function sourceHeading(source) {
  if (source.description) return '公開説明';
  if (source.title) return '公式ページタイトル';
  if (source.fallback) return '台帳観測（要照合）';
  return '出典未取得';
}

const UNSUPPORTED_TAG_PATTERN = /^(?:少数精鋭|極小チーム|損益分岐点|高利益率|完全勝ち組|専業フルコミット|完全自己資本|独立監査済|チーム規模精査済|利益率|超高粗利|ブートストラップ|報告売上検証|ニッチ特化SaaS|ソロプレナー|再現性重視|持たざる個人|完全1人|週末副業|手残り|高粗利|高LTV|高単価|年商|月商|粗利|完全ソロ|組織化自走)/;

function safeTags(entity) {
  return uniqueStrings((Array.isArray(entity.tags) ? entity.tags : []).filter((tag) => {
    if (UNSUPPORTED_TAG_PATTERN.test(tag)) return false;
    if (tag === '失敗・撤退の検証' && entity.pnl?.financialStatus !== 'POST_MORTEM') return false;
    return true;
  }));
}

function customerText(entity, source, topic) {
  if (source.description || source.title) {
    const customer = CUSTOMER_BY_TOPIC[topic.topic] || '公開説明から顧客属性は未確認';
    return `対象候補: ${customer}。出典抜粋: ${clip(sourceToken(source, entity), 105)}。個別顧客・支払者の実測は未確認。`;
  }
  return `顧客属性: 未確認。台帳観測の手掛かり: ${clip(sourceToken(source, entity), 125)}。個別顧客・支払者の実測は未確認。`;
}

function painText(entity, source, topic) {
  if (source.description || source.title) {
    const pain = PAIN_BY_TOPIC[topic.topic] || '公開説明から課題の具体的な損失・負担は未確認';
    return `課題候補: ${pain}。出典抜粋: ${clip(sourceToken(source, entity), 105)}。実際の削減額・効果は未確認。`;
  }
  return `課題・損失: 未確認。台帳観測の手掛かり: ${clip(sourceToken(source, entity), 125)}。実際の削減額・効果は未確認。`;
}

function coreText(entity, source) {
  if (source.description) {
    return `公開説明に記載された提供内容: 「${clip(source.description, 205)}」。実装詳細と収益性はこの記述だけでは確認できない。`;
  }
  if (source.title) return `公式ページタイトルが示す提供物: 「${clip(source.title, 190)}」。機能範囲・顧客・収益性は未確認。`;
  if (source.fallback) return `台帳観測（要照合）: 「${clip(source.fallback, 230)}」。固有の提供内容・出典の独立性は未確認。`;
  return `公開情報で固有の提供内容は未確認。記録名「${entity.name}」の事業実体を追加調査する。`;
}

function blindspotText(source, topic, pain) {
  return `根拠から確認できる課題: ${clip(pain, 180)}。${topic.topic}について大手との比較優位・規約の隙間は未確認。根拠: ${clip(source.descriptor, 150)}`;
}

function moatText(source, topic, mechanism) {
  return `確認できた防御要因: ${mechanism}。継続率、独自データ、解約障壁、供給制約の有無は未確認。観測: ${clip(source.descriptor, 150)}`;
}

function secretText(source, topic, mechanism) {
  return `観測: ${clip(source.descriptor, 190)}。推論としての検証ポイントは、${topic.topic}で${mechanism}が実際の支払理由になっているか、そして未公開の原価がどこへ流れるかである。これは確定事実ではない。`;
}

function usableArray(value) {
  return Array.isArray(value)
    && value.length > 0
    && value.some((item) => isConcrete(item) && !hasGeneratedMarker(item));
}

function withRecordAnchor(items, entity, source) {
  const anchor = clip(sourceToken(source, entity), 150);
  return uniqueStrings([
    ...(Array.isArray(items) ? items : []),
    `照合対象: ${entity.name} / ${anchor}`,
  ]).map((item) => clip(item, 240));
}

function initialTraction(entity, source, note) {
  const sourceLine = source.description || source.title;
  const items = [
    sourceLine
      ? `公開ログ: ${clip(sourceLine, 220)}`
      : `初動の公開ログは未取得。記録名「${entity.name}」とID ${tailOf(entity)} の追加照合が必要。`,
    `初動の顧客数・獲得経路・継続率は未確認。売上表示がある場合も利益・手残りとは別に監査する。${clip(note, 130)}`,
  ];
  return withRecordAnchor(items, entity, source);
}

function actionPlaybook(entity, source, topic, mechanism, note) {
  const quote = clip(source.descriptor, 145);
  const patterns = [
    [
      `検証1｜「${quote}」を実際に使う対象者へ確認し、誰が何に支払うかを分けて記録する。`,
      `分解2｜${mechanism}の工程を、外部依存・手作業・提供結果に分ける。実装詳細は公開情報で未確認。`,
      `採算3｜${note}。原価・手数料・税を別計上し、利益を売上表示から推測しない。`,
    ],
    [
      `入口｜${topic.topic}の利用場面を一つに絞り、「${quote}」が本当の困りごとかを一次接点で照合する。`,
      `配管｜${mechanism}に必要なデータ源・権利・運用者を洗い出し、未確認箇所を残す。`,
      `回収｜売上・継続・原価の三つを別々に測る。${note}`,
    ],
    [
      `01｜公開説明「${quote}」を出発点に、対象顧客と支払条件を小さくテストする。`,
      `02｜${topic.topic}の提供経路を再現可能な作業単位へ分け、${mechanism}の実費を記録する。`,
      `03｜数字が報告値なら報告値のまま保存し、独立根拠が得られるまで利益と呼ばない。${note}`,
    ],
  ];
  return withRecordAnchor(patterns[hashNumber(entity.id) % patterns.length], entity, source);
}

function coldTemplate(source, topic, customer, pain) {
  return `「${topic.topic}」について、公開説明の「${clip(source.descriptor, 120)}」が実際に誰のどんな負担を減らしたのか確認したいです。${clip(customer, 92)}にとっての支払条件、利用頻度、乗り換え時の手間のうち、共有できる範囲を教えてください。${clip(pain, 78)}`;
}

function factBody(value) {
  return clean(value)
    .replace(/^対象の推定範囲:\s*/i, '')
    .replace(/^確認できた課題候補:\s*/i, '')
    .replace(/^対象:\s*/i, '')
    .replace(/^痛み:\s*/i, '');
}

function buildLoot(entity, base, raw, output, source, topic, mechanism, note) {
  const existing = entity.lootBlueprint || raw?.lootBlueprint || base?.lootBlueprint || {};
  const target = `対象財布: ${factBody(output.essence.targetCustomer)} 課題: ${factBody(output.essence.painRelief)}`;
  const flaw = `構造上の未確認点: ${output.strategy.blindspot} 事例固有の根拠: ${clip(source.descriptor, 145)}`;
  const entry = `確認できた入口: ${clip(source.descriptor, 210)}。初動の再現性・権利・集客実績は未確認。`;
  const toll = `関所候補: ${topic.topic}で${mechanism}を提供する導線。根拠: ${clip(source.descriptor, 130)}。課金方式、継続率、解約障壁、原価は未確認。${note}`;
  const checklist = output.strategy.actionPlaybook.map((item, index) => `${index + 1}. ${item}`);
  return {
    ...existing,
    targetPrey: target,
    structuralFlaw: flaw,
    stealthEntry: entry,
    tollGateSetup: toll,
    // Old scores were generated without a claim-level receipt. Keep the
    // fields for schema compatibility, but do not expose invented precision.
    reproducibilityScore: 0,
    moatDurabilityScore: 0,
    capitalEfficiencyScore: 0,
    executionChecklist: checklist,
    architecturePattern: output.architecturePattern,
    pipelineStack: output.pipelineStack,
  };
}

function evidenceStatus(entity, base, source) {
  const status = entity?.pnl?.financialStatus || base?.pnl?.financialStatus;
  if (status === 'POST_MORTEM') return 'POST_MORTEM';
  if (status === 'VERIFIED' && !source.description && !source.title) return 'VERIFIED';
  if (source.description || source.title) return 'REPORTED';
  return 'UNKNOWN';
}

function cardIds(entity, base) {
  const bindings = Array.isArray(entity.claimBindings) ? entity.claimBindings.map((binding) => binding?.evidenceId).filter((id) => typeof id === 'string' && id.length > 0) : [];
  const current = Array.isArray(entity.evidenceCards) ? entity.evidenceCards : [];
  const old = Array.isArray(base?.evidenceCards) ? base.evidenceCards : [];
  const currentIds = current.map((card) => card?.id).filter((id) => typeof id === 'string' && id.length > 0);
  const oldIds = old.map((card) => card?.id).filter((id) => typeof id === 'string' && id.length > 0);
  const ids = currentIds.length > 0 ? currentIds : oldIds;
  const result = uniqueStrings([...ids, ...bindings]).slice(0, 3);
  while (result.length < 3) result.push(`ev_${entity.id}_${result.length + 1}`);
  return result;
}

function buildEvidenceCards(entity, base, output, source, topic, mechanism, note) {
  const status = evidenceStatus(entity, base, source);
  const ids = cardIds(entity, base);
  const sourceNote = `${source.sourceLabel}${source.url ? `: ${source.url}` : ''}`;
  const common = `記録ID: ${tailOf(entity)} / ${sourceNote}`;
  const cards = [
    {
      id: ids[0],
      type: status === 'POST_MORTEM' ? 'FATAL_BLEED' : 'SMOKING_GUN',
      title: `観測1｜${topic.topic}の提供内容`,
      badge: status === 'POST_MORTEM' ? '死因ログ' : '提供内容',
      evidenceStatus: status,
      punchline: `「${clip(source.descriptor, 190)}」。${note}`,
      details: [
        `出典種別: ${source.sourceLabel}`,
        `提供内容の観測: ${clip(source.descriptor, 250)}`,
        'この記述だけでは顧客数・利益・手残りは確定しない。',
      ],
      sourceNote: common,
    },
    {
      id: ids[1],
      type: status === 'POST_MORTEM' ? 'UNKNOWN_AUDIT' : 'DIRTY_GENESIS',
      title: `観測2｜${topic.topic}の対象と未充足`,
      badge: '対象・痛み',
      evidenceStatus: status,
      punchline: `${output.essence.targetCustomer} / ${output.essence.painRelief}`,
      details: [
        `対象: ${output.essence.targetCustomer}`,
        `課題: ${output.essence.painRelief}`,
        `大手比較・初動獲得の事実: ${output.strategy.blindspot}`,
      ],
      sourceNote: common,
    },
    {
      id: ids[2],
      type: status === 'POST_MORTEM' ? 'FATAL_BLEED' : 'UNKNOWN_AUDIT',
      title: `監査3｜${topic.topic}の配管と未確認範囲`,
      badge: '監査境界',
      evidenceStatus: status,
      punchline: `${mechanism}。実装・課金・継続・原価は${source.financial ? '報告値と分けて' : ''}未確認。`,
      details: [
        `提供経路: ${output.architecturePattern}`,
        `技術・原価: ${output.pipelineStack}`,
        `防御要因: ${output.strategy.moatDescription}`,
        `財務境界: ${note}`,
      ],
      sourceNote: common,
    },
  ];
  for (let index = 3; index < ids.length; index += 1) {
    cards.push({
      id: ids[index],
      type: 'UNKNOWN_AUDIT',
      title: `監査${index + 1}｜${topic.topic}の追加確認`,
      badge: '追加監査',
      evidenceStatus: status,
      punchline: `追加の一次根拠は未確認。記録ID ${tailOf(entity)} を起点に原本を照合する。`,
      details: [source.descriptor, output.strategy.secretInsight],
      sourceNote: common,
    });
  }
  return cards;
}

function mergeObservationArrays(entity, base, raw) {
  const merged = mergedObservations(entity, base, raw);
  if (merged.length > 0) entity.observations = merged;
  const currentStream = Array.isArray(entity.observationsStream) ? entity.observationsStream : [];
  const oldStream = Array.isArray(base?.observationsStream) ? base.observationsStream : [];
  const rawStream = [...currentStream, ...oldStream];
  const seen = new Set();
  const resultStream = [];
  for (const item of rawStream) {
    if (!item) continue;
    const cleanItem = { ...item };
    if (typeof cleanItem.text === 'string') {
      cleanItem.text = clean(cleanItem.text);
    }
    const key = JSON.stringify(cleanItem);
    if (!seen.has(key)) {
      seen.add(key);
      resultStream.push(cleanItem);
    }
  }
  entity.observationsStream = resultStream;
}

function metaFromEvidence(output, source, topic, mechanism, note) {
  const anchor = clip(source.descriptor, 130);
  return {
    incumbentDilemma: {
      cannibalizationBarrier: `大手との共食い・参入判断は未確認。${topic.topic}について確認できた記録は「${anchor}」。`,
      scaleMismatchReason: `市場規模・大手の稟議条件は未確認。${topic.topic}の対象範囲を一次資料で測る必要がある。`,
      decisionSpeedAdvantage: `意思決定速度の差は未確認。${mechanism}の運用実態を現場記録で照合する。`,
    },
    pricingPower: {
      anchorComparison: `比較対象価格は未確認。${topic.topic}で顧客が実際に置き換える費用を確認する。`,
      lossAversionTrigger: `損失回避の強さは未確認。観測された課題は${clip(output.essence.painRelief, 135)}。`,
      budgetCategory: `個人・法人の予算区分は未確認。${anchor}の支払者を特定する。`,
    },
    lockInMechanism: {
      dataHostage: `保持データの移行不能性は未確認。${mechanism}が扱うデータと保存先を調査する。`,
      workflowIntegration: `業務への定着度は未確認。${topic.topic}の利用頻度・代替手順を照合する。`,
      switchingFriction: `乗り換え時の摩擦は未確認。公開説明から解約不能とは断定しない。`,
    },
    capitalEfficiency: {
      cashConversionCycle: `前払い・後払いの条件は未確認。${note}`,
      incrementalMargin: `限界利益率は未確認。売上表示を利益へ変換しない。`,
      workingCapitalStrategy: `運転資金の構造は未確認。${topic.topic}の仕入れ・API・人件費を分けて計測する。`,
    },
  };
}

function exposureFromEvidence(output, source, topic, mechanism, note) {
  const anchor = clip(source.descriptor, 160);
  return {
    guerrillaTraction: `初動について確認できた公開記録: ${anchor}。獲得人数・経路・再現性は未確認。`,
    platformGlitch: `${topic.topic}に関するプラットフォーム規約・配信上の隙間は未確認。観測された提供経路は${mechanism}。`,
    pivotSnapshot: `ピボット履歴は公開情報から未確認。現時点での観測対象は「${anchor}」であり、過去の失敗を推定しない。`,
    hiddenStackCost: `技術スタック・外部API・広告費・人件費の内訳は未確認。${note}`,
  };
}

function cautiousOpportunity(entity, output, source, topic) {
  const isPostMortem = entity?.pnl?.financialStatus === 'POST_MORTEM';
  return {
    verdict: isPostMortem ? 'HAZARD_REJECT' : 'MONITOR',
    verdictLabel: isPostMortem ? '死因と根拠の照合待ち' : '根拠照合待ち',
    oneLineReason: `${sourceHeading(source)}「${clip(source.descriptor, 150)}」を起点に、${topic.topic}の需要・支払者・原価・再現性を照合する。現時点で参入可否は断定しない。`,
    demandDelta: '未確認',
    competitionDelta: '未確認',
    entryRequirements: {
      capital: '未確認',
      technicalDifficulty: 'UNKNOWN',
      platformRisk: 'UNKNOWN',
    },
  };
}

function ensureUnique(value, field, used, entity) {
  let result = textOf(value).replace(/「+/g, '「').replace(/」+/g, '」');
  if (!result) result = `未確認（記録ID ${tailOf(entity)}）`;
  const seen = used.get(field) || new Set();
  let candidate = result;
  let count = 0;
  while (seen.has(candidate)) {
    count += 1;
    candidate = `${result} 〔対象:${clean(entity.name)}${count > 1 ? `-${count}` : ''}〕`;
  }
  seen.add(candidate);
  used.set(field, seen);
  return candidate;
}

function loadBaseSnapshot() {
  if (!baseRevision) return new Map();
  try {
    const text = execFileSync('git', ['show', `${baseRevision}:data/entities-index.json`], {
      encoding: 'utf8',
      maxBuffer: 250 * 1024 * 1024,
    });
    const rows = JSON.parse(text);
    return new Map(rows.filter((row) => row?.id).map((row) => [row.id, row]));
  } catch (error) {
    console.warn(`[repair] base revision unavailable: ${baseRevision} (${error.message})`);
    return new Map();
  }
}

const RAW_FIELD_PATHS = [
  'tagline',
  'architecturePattern',
  'pipelineStack',
  'targetPainWallet',
  'essence.whatItDoes',
  'essence.targetCustomer',
  'essence.painRelief',
  'strategy.blindspot',
  'strategy.moatDescription',
  'strategy.incumbentDilemma',
  'strategy.secretInsight',
  'strategy.initialTraction',
  'strategy.actionPlaybook',
  'strategy.coldOutreachTemplate',
];

function walkIncomingJson(dir, result = []) {
  for (const entry of readdirSync(dir)) {
    const fullPath = path.join(dir, entry);
    const entryStat = statSync(fullPath);
    if (entryStat.isDirectory()) {
      if (!/audit_logs|receipts|quarantine/i.test(entry)) walkIncomingJson(fullPath, result);
      continue;
    }
    if (!entry.endsWith('.json') || /receipt|audit|r2-result|manifest/i.test(entry)) continue;
    result.push(fullPath);
  }
  return result;
}

function rawCandidateScore(row, filePath) {
  let score = /processed|external_collectors/i.test(filePath) ? 2 : 0;
  for (const field of RAW_FIELD_PATHS) {
    const value = get(row, field);
    if (Array.isArray(value)) {
      if (usableArray(value)) score += 4 + Math.min(textOf(value).length, 600) / 600;
    } else if (isConcrete(value)) {
      score += 4 + Math.min(textOf(value).length, 600) / 600;
    }
  }
  score += Math.min(Array.isArray(row.observations) ? row.observations.length : 0, 8) * 0.5;
  return score;
}

function loadRawSnapshot() {
  const byId = new Map();
  for (const filePath of walkIncomingJson(path.join(root, 'data/incoming'))) {
    let rows;
    try {
      rows = JSON.parse(readFileSync(filePath, 'utf8'));
    } catch {
      continue;
    }
    if (!Array.isArray(rows)) continue;
    for (const row of rows) {
      if (!row?.id) continue;
      const candidate = { row, score: rawCandidateScore(row, filePath) };
      const previous = byId.get(row.id);
      if (!previous || candidate.score > previous.score) byId.set(row.id, candidate);
    }
  }
  return new Map([...byId.entries()].map(([id, value]) => [id, value.row]));
}

const beforeStat = statSync(indexPath);
const currentEntities = JSON.parse(readFileSync(indexPath, 'utf8'));
if (!Array.isArray(currentEntities) || currentEntities.length === 0) throw new Error('entities-index.json is not a non-empty array');
const baseMap = loadBaseSnapshot();
const rawMap = loadRawSnapshot();
const used = new Map();
const repaired = [];

for (const current of currentEntities) {
  const base = baseMap.get(current.id) || {};
  const raw = rawMap.get(current.id) || {};
  const entity = structuredClone(current);
  mergeObservationArrays(entity, base, raw);
  const source = extractSource(entity, base, raw);
  quarantineUnboundCommercialClaims(entity);
  const topic = selectTopic(source);
  const token = sourceToken(source, entity);
  const customer = customerText(entity, source, topic);
  const pain = painText(entity, source, topic);
  const core = coreText(entity, source);
  normalizeFinancialConfidence(entity);
  quarantineUnboundFinancialClaims(entity);
  quarantineUnboundOperations(entity);
  const note = financialNote(entity, base, source);
  const mechanism = topic.mechanism;
  const architecture = source.description || source.title
    ? `${token}｜${topic.topic}｜${mechanism}`
    : `台帳観測（要照合）: ${token}｜用途未確認`;
  const pipeline = `実装方式: 独立確認未取得。確認できた提供経路は${topic.topic} / ${mechanism}。根拠: ${clip(source.descriptor, 135)}`;
  const blindspot = blindspotText(source, topic, pain);
  const moat = moatText(source, topic, mechanism);
  const secret = secretText(source, topic, mechanism);
  const initial = initialTraction(entity, source, note);
  const actions = actionPlaybook(entity, source, topic, mechanism, note);
  const incumbent = `大手との参入条件・共食い構造は未確認。${topic.topic}で確認できた記録: ${clip(source.descriptor, 165)}`;

  const output = {
    ...entity,
    tags: safeTags(entity),
    tagline: ensureUnique(
      [
        `「${topic.topic}」の記録: ${clip(source.descriptor, 205)}。${note}`,
        `${sourceHeading(source)}「${clip(source.descriptor, 205)}」から読む${topic.topic}。${note}`,
        `${clip(source.descriptor, 205)} — ${topic.topic}。${note}`,
      ][hashNumber(entity.id) % 3],
      'tagline',
      used,
      entity,
    ),
    architecturePattern: ensureUnique(architecture, 'architecturePattern', used, entity),
    pipelineStack: ensureUnique(pipeline, 'pipelineStack', used, entity),
    targetPainWallet: ensureUnique(`対象: ${customer} 痛み: ${pain}`, 'targetPainWallet', used, entity),
    essence: {
      ...(entity.essence || {}),
      whatItDoes: ensureUnique(core, 'essence.whatItDoes', used, entity),
      targetCustomer: ensureUnique(customer, 'essence.targetCustomer', used, entity),
      painRelief: ensureUnique(pain, 'essence.painRelief', used, entity),
    },
    strategy: {
      ...(entity.strategy || {}),
      blindspot: ensureUnique(blindspot, 'strategy.blindspot', used, entity),
      moatDescription: ensureUnique(moat, 'strategy.moatDescription', used, entity),
      incumbentDilemma: ensureUnique(incumbent, 'strategy.incumbentDilemma', used, entity),
      secretInsight: ensureUnique(secret, 'strategy.secretInsight', used, entity),
      initialTraction: initial,
      actionPlaybook: actions,
      coldOutreachTemplate: ensureUnique(coldTemplate(source, topic, customer, pain), 'strategy.coldOutreachTemplate', used, entity),
    },
  };

  output.lootBlueprint = buildLoot(entity, base, raw, output, source, topic, mechanism, note);
  for (const lootField of ['targetPrey', 'structuralFlaw', 'stealthEntry', 'tollGateSetup']) {
    output.lootBlueprint[lootField] = ensureUnique(output.lootBlueprint[lootField], `lootBlueprint.${lootField}`, used, entity);
  }
  output.evidenceCards = buildEvidenceCards(entity, base, output, source, topic, mechanism, note);
  output.meta = metaFromEvidence(output, source, topic, mechanism, note);
  output.exposureAudit = exposureFromEvidence(output, source, topic, mechanism, note);
  output.opportunityJudgment = cautiousOpportunity(entity, output, source, topic);
  output.description = `${sourceHeading(source)}: ${clip(source.descriptor, 240)}。財務・顧客・再現性は未確認。`;
  output.blindspot = output.strategy.blindspot;
  output.incumbentDilemma = output.strategy.incumbentDilemma;
  output.financialStatus = output.pnl?.financialStatus;

  const outputHasRevenueProof = hasExactSupportedBinding(output, 'monthlyRevenue', output.pnl?.monthlyRevenue);

  function sanitizeDisclaimers(obj, key = '') {
    if (typeof obj === 'string') {
      const normalized = sanitizeUnicode(obj)
        .replace(/Indie Hackers表示/g, 'Indie Hackers報告値')
        .replace(/報告値・利益ではない/g, '第三者報告値（利益未確認）')
        .replace(/掲載タグラインが示す課題/g, '公開タグラインの課題')
        .replace(/防御要因は未確認/g, '防御要因は公開情報では未確認');
      if (!outputHasRevenueProof && key === 'revenueLabel') {
        return '財務値未確認（原本照合待ち）';
      }
      if (!outputHasRevenueProof && (key === 'observations' || key === 'text') && isSpecificUnboundFinancialObservation(normalized)) {
        return '公開報告値（具体額は原本照合待ち。利益・原価・手残りは未確認。）';
      }
      return normalized;
    }
    if (Array.isArray(obj)) {
      return obj.map((item) => sanitizeDisclaimers(item, key));
    }
    if (obj && typeof obj === 'object') {
      const res = {};
      for (const k of Object.keys(obj)) {
        res[k] = sanitizeDisclaimers(obj[k], k);
      }
      return res;
    }
    return obj;
  }

  // The historical snapshot is used only as a recovery source for the fields
  // known to be overwritten by the bad generator. Current financial,
  // provenance, temporal, and claim-binding data remain untouched.
  repaired.push(sanitizeDisclaimers(output));
}

function duplicateStats(rows, pathName) {
  const counts = new Map();
  for (const row of rows) {
    const value = textOf(get(row, pathName));
    if (value) counts.set(value, (counts.get(value) || 0) + 1);
  }
  const groups = [...counts.values()].filter((count) => count > 1);
  return {
    unique: counts.size,
    duplicateGroups: groups.length,
    duplicateEntities: groups.reduce((sum, count) => sum + count, 0),
    largestDuplicate: Math.max(0, ...groups),
  };
}

const contentPaths = [
  'tagline',
  'architecturePattern',
  'pipelineStack',
  'targetPainWallet',
  'essence.whatItDoes',
  'essence.targetCustomer',
  'essence.painRelief',
  'strategy.blindspot',
  'strategy.moatDescription',
  'strategy.secretInsight',
  'strategy.coldOutreachTemplate',
  'lootBlueprint.targetPrey',
  'lootBlueprint.structuralFlaw',
  'lootBlueprint.stealthEntry',
  'lootBlueprint.tollGateSetup',
];

const report = {
  total: repaired.length,
  baseRevision,
  beforeMtime: beforeStat.mtime.toISOString(),
  fields: Object.fromEntries(contentPaths.map((pathName) => [pathName, duplicateStats(repaired, pathName)])),
  generatedMarkerEntities: repaired.filter((entity) => contentPaths.some((pathName) => hasGeneratedMarker(get(entity, pathName)))).length,
  missingEvidenceCards: repaired.filter((entity) => !Array.isArray(entity.evidenceCards) || entity.evidenceCards.length < 3).length,
};

console.log(JSON.stringify(report, null, 2));

if (shouldCheck && !shouldWrite) process.exit(0);

const latestStat = statSync(indexPath);
if (latestStat.mtimeMs !== beforeStat.mtimeMs || latestStat.size !== beforeStat.size) {
  throw new Error('entities-index.json changed while preparing repair; refusing to overwrite concurrent work');
}

const tempPath = `${indexPath}.content-repair-${process.pid}.tmp`;
writeFileSync(tempPath, `${JSON.stringify(repaired, null, 2)}\n`, 'utf8');
renameSync(tempPath, indexPath);
console.log(`repaired ${repaired.length} entities in ${indexPath}`);
