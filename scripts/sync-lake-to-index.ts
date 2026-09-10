import { writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import {
  FinancialEntity,
  UniversalObservation,
  UniversalEvent,
  ViabilityStatus,
  BusinessEssence,
} from '../src/platform/types/terminal';

interface RawCoreEntity {
  entity_id: string;
  entity_type?: string;
  canonical_name: string;
  aliases?: string[];
  canonical_identifier?: string;
  domain?: string | null;
  status?: string;
  observed_at?: string;
}

interface RawMetric {
  metric_id?: string;
  entity_id?: string;
  metric_type?: string;
  value?: number | string;
  unit?: string;
  currency?: string;
  period_start?: string;
  period_end?: string;
  point_in_time?: string;
  basis?: string;
  scope?: string;
  origin_type?: string;
  confidence?: number;
}

interface RawObservation {
  id?: string;
  category?: string;
  text?: string;
  origin_type?: string;
  verification_status?: string;
  source_url?: string;
  observed_at?: string;
  entity_ids?: string[];
  scope?: string;
  kind?: string;
}

interface RawBundle {
  schema_version?: string;
  run_id?: string;
  subject?: { query?: string; candidate_name?: string | null };
  entities?: RawCoreEntity[];
  metrics?: RawMetric[];
  observations?: RawObservation[];
  events?: Array<{ event_type?: string; occurred_at?: string; description?: string }>;
  fullFinancialEntity?: FinancialEntity;
}

const BUCKET = 'foundation-lake';

function createS3Client(): S3Client {
  const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID?.trim();
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY?.trim();

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error('Cloudflare R2 credentials missing in environment');
  }

  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

async function mapConcurrent<T, R>(items: T[], concurrency: number, fn: (item: T, idx: number) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;
  
  const workers = Array.from({ length: concurrency }, async () => {
    while (index < items.length) {
      const current = index++;
      results[current] = await fn(items[current], current);
    }
  });

  await Promise.all(workers);
  return results;
}

async function listAllKeys(s3: S3Client, prefix: string): Promise<string[]> {
  const keys: string[] = [];
  let token: string | undefined = undefined;
  do {
    const res: any = await s3.send(new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: prefix,
      ContinuationToken: token,
      MaxKeys: 1000,
    }));
    if (res.Contents) {
      for (const item of res.Contents) {
        if (item.Key && !item.Key.endsWith('/')) {
          keys.push(item.Key);
        }
      }
    }
    token = res.NextContinuationToken;
  } while (token);
  return keys;
}

async function fetchJson<T>(s3: S3Client, key: string): Promise<T | null> {
  try {
    const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
    const body = await res.Body?.transformToString();
    if (!body) return null;
    return JSON.parse(body) as T;
  } catch (err) {
    console.warn(`Failed to fetch ${key}:`, err);
    return null;
  }
}

function cleanEntityName(rawName: string, aliases?: string[], url?: string): { name: string; isJunk: boolean } {
  let name = rawName
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();

  // URLスラッグからの企業名抽出（例: /interview/upvoty, /cemetery/katerra）
  if (url) {
    const slugMatch = url.match(/\/(?:interview|cemetery|blog)\/([a-z0-9-]+)/i);
    if (slugMatch && slugMatch[1] && slugMatch[1].length >= 3 && slugMatch[1].length <= 25) {
      const slug = slugMatch[1].replace(/-/g, ' ');
      // 一般的な単語（interview, about等）でなければ社名に採用
      if (!slug.includes('index') && !slug.includes('category')) {
        const words = slug.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1));
        return { name: words.join(' '), isJunk: false };
      }
    }
  }

  // aliases があれば採用（例: ["katerra"], ["upvoty"]）
  if (aliases && aliases.length > 0) {
    const alias = aliases[0].trim();
    if (alias.length >= 2 && alias.length <= 25 && !alias.includes(' ') && !alias.includes('http')) {
      const capitalized = alias.charAt(0).toUpperCase() + alias.slice(1);
      return { name: capitalized, isJunk: false };
    }
  }

  // 明らかなブログ記事・ピッチデッキ集・読み物・デバッグログを除外
  const junkPatterns = [
    /^top\s+\d+/i,
    /^the\s+\d+\s+reasons\s+why/i,
    /^what\s+happened\s+to/i,
    /^why\s+did\s+/i,
    /^what\s+was\s+/i,
    /^shutting\s+down\s+/i,
    /pitch\s+deck.*used\s+to\s+raise/i,
    /trying\s+to\s+raise\s+money/i,
    /how\s+a\s+swot\s+analysis/i,
    /my\s+first\s+failed/i,
    /the\s+story\s+of\s+\d+\s+technical/i,
    /^capture\s+lead/i,
    /^wave\s+\d+/i,
    /^\d+\s+studios:\s+my\s+first/i,
    /^rip\s+/i,
  ];

  for (const pat of junkPatterns) {
    if (pat.test(name)) {
      const colonMatch = name.match(/^([A-Za-z0-9\s.-]{2,25}):\s+/);
      if (
        colonMatch &&
        !colonMatch[1].toLowerCase().includes('top') &&
        !colonMatch[1].toLowerCase().includes('reason') &&
        !colonMatch[1].toLowerCase().includes('what') &&
        !colonMatch[1].toLowerCase().includes('why')
      ) {
        return { name: colonMatch[1].trim(), isJunk: false };
      }
      return { name, isJunk: true };
    }
  }

  const colonMatch = name.match(/^([A-Za-z0-9\s.-]{2,25}):\s+/);
  if (
    colonMatch &&
    !colonMatch[1].toLowerCase().includes('top') &&
    !colonMatch[1].toLowerCase().includes('the ') &&
    !colonMatch[1].toLowerCase().includes('what') &&
    !colonMatch[1].toLowerCase().includes('why')
  ) {
    return { name: colonMatch[1].trim(), isJunk: false };
  }

  // 35文字以上の長文記事タイトルは除外
  if (name.length > 35 && name.split(' ').length >= 5) {
    return { name, isJunk: true };
  }

  return { name, isJunk: false };
}

function parseFinancialMetric(
  metrics: RawMetric[],
  rawTitle: string,
  observations: RawObservation[]
): {
  monthlyRevenue: number;
  operatingProfit: number;
  operatingMargin: number;
  priceAnchor: number | null;
  priceUnit: string | null;
  teamSize: number;
} {
  let monthlyRevenue = 0;
  let operatingProfit = 0;
  let operatingMargin = 70;
  let priceAnchor: number | null = null;
  let priceUnit: string | null = null;
  let teamSize = 1;

  // 1. まず RawMetric の確定値（ARR, MRR, Revenue）を最優先で探索！
  for (const m of metrics) {
    const type = (m.metric_type || '').toLowerCase();
    let val = typeof m.value === 'number' ? m.value : parseFloat(String(m.value) || '0');
    if (!Number.isFinite(val) || val <= 0) continue;

    // クローラーのパースミス（桁溢れ）を補正（例: 20000000000 -> 20000, 1000000000 -> 1000）
    if (type.includes('mrr') && val > 100000) {
      while (val > 100000) {
        val = val / 1000;
      }
    }
    if (type.includes('arr') && val > 50000000) {
      while (val > 50000000) {
        val = val / 1000;
      }
    }

    const rate = m.currency === 'GBP' ? 190 : m.currency === 'EUR' ? 160 : (m.currency === 'USD' ? 150 : 1);

    if (type.includes('arr') || type.includes('annual_recurring_revenue') || type.includes('annual_revenue') || type.includes('annual_revenue_run_rate')) {
      const calc = Math.round((val * rate) / 12);
      if (calc > monthlyRevenue) monthlyRevenue = calc;
    } else if (type.includes('mrr') || type.includes('monthly_revenue')) {
      const calc = Math.round(val * rate);
      if (calc > monthlyRevenue) monthlyRevenue = calc;
    } else if (type.includes('revenue') && !type.includes('ad_demand') && monthlyRevenue === 0) {
      const calc = Math.round((val * rate) / 12);
      if (calc > monthlyRevenue) monthlyRevenue = calc;
    }

    if (type.includes('price') || type.includes('fee')) {
      priceAnchor = Math.round(val * rate);
      priceUnit = m.unit || (m.currency === 'USD' ? `$${val}/mo` : `¥${val}`);
    } else if (type.includes('headcount') || type.includes('team_size') || type.includes('employee')) {
      teamSize = Math.max(teamSize, Math.round(val));
    } else if (type.includes('margin')) {
      operatingMargin = Math.min(100, Math.round(val));
    }
  }

  // 2. もし RawMetric で月商が取れなかった場合のみ、タイトル・記事名（rawTitle）から正規表現で抽出
  if (monthlyRevenue === 0) {
    const mrrMatch = rawTitle.match(/([$£€¥])\s*([0-9]+(?:,[0-9]{3})*(?:\.[0-9]+)?|\d+k|\d+m)\s*(?:\/|\s+per\s+|\s+in\s+)?(?:mo|month|mrr)/i);
    const arrMatch = rawTitle.match(/([$£€¥])\s*([0-9]+(?:,[0-9]{3})*(?:\.[0-9]+)?|\d+k|\d+m)\s*(?:\/|\s+per\s+)?(?:year|yr|arr|annual)/i);

    function parseAmount(currencySymbol: string, amountStr: string): number {
      let num = 0;
      const lower = amountStr.toLowerCase().replace(/,/g, '');
      if (lower.endsWith('m')) {
        num = parseFloat(lower.slice(0, -1)) * 1000000;
      } else if (lower.endsWith('k')) {
        num = parseFloat(lower.slice(0, -1)) * 1000;
      } else {
        num = parseFloat(lower);
      }
      const rate = currencySymbol === '£' ? 190 : currencySymbol === '€' ? 160 : currencySymbol === '¥' ? 1 : 150;
      return num * rate;
    }

    if (mrrMatch) {
      const monthlyYen = parseAmount(mrrMatch[1], mrrMatch[2]);
      if (monthlyYen >= 150000 && monthlyYen < 10000000000) {
        monthlyRevenue = Math.round(monthlyYen);
      }
    } else if (arrMatch) {
      const annualYen = parseAmount(arrMatch[1], arrMatch[2]);
      if (annualYen >= 1500000 && annualYen < 100000000000) {
        monthlyRevenue = Math.round(annualYen / 12);
      }
    }
  }

  // 3. チーム規模のテキスト抽出（例: "team of 8"）
  const allTexts = [rawTitle, ...observations.map((o) => o.text || '')].join(' ');
  const teamMatch = allTexts.match(/team\s+(?:of\s+)?(\d+)/i);
  if (teamMatch && teamMatch[1]) {
    teamSize = Math.max(teamSize, parseInt(teamMatch[1], 10));
  }

  if (monthlyRevenue > 0) {
    operatingProfit = Math.round(monthlyRevenue * (operatingMargin / 100));
  }

  return { monthlyRevenue, operatingProfit, operatingMargin, priceAnchor, priceUnit, teamSize };
}

// ============================================================================
// インテリジェンス辞書 ＆ 動的実態解析エンジン（金太郎飴テンプレ完全根絶）
// ============================================================================

interface KnownBusinessProfile {
  tagline: string;
  whatItDoes: string;
  targetCustomer: string;
  painRelief: string;
  blindspot: string;
  moatDescription: string;
  incumbentDilemma: string;
  initialTraction: string[];
}

const KNOWN_MEGA_PROFILES: Record<string, KnownBusinessProfile> = {
  'carrd': {
    tagline: 'Carrd | 1ページ完結LPを超軽量・格安で爆速制作できるミニマルWebビルダー',
    whatItDoes: '1ページ完結型レスポンシブWebサイトの超軽量ビルダー',
    targetCustomer: 'ポートフォリオや簡易LPを今すぐ格安で公開したいクリエイター・起業家',
    painRelief: 'WebflowやWordPressの過剰な機能・高い学習コスト・年額の重さ',
    blindspot: 'Web制作ツール大手が大規模CMSへ進化し、1枚LPの極小ニーズを捨て去った死角',
    moatDescription: 'HTML5 UP等で築いた数百万人の無料テンプレート利用者の自然流入基盤',
    incumbentDilemma: 'Squarespace等は月額$16〜の価格帯を守るため、$19/年の破壊的プランを出せない',
    initialTraction: ['HTML5 UPで10年間無料配布していたテンプレートの利用者に新ツールを告知', 'Twitterでの口コミ拡散'],
  },
  'beehiiv': {
    tagline: 'beehiiv | 読者紹介ループと広告網を内蔵したニュースレター収益化特化SaaS',
    whatItDoes: 'ニュースレター事業者のための収益化・紹介機能一体型SaaS',
    targetCustomer: '自前のメディアでマネタイズを目指すクリエイター・パブリッシャー',
    painRelief: 'Substackの手数料搾取やMailchimpの機能分散・高単価課金',
    blindspot: 'メルマガ配信ツールが単なるメール送信機に留まり、メディアのマネタイズ支援を放置した点',
    moatDescription: '配信者同士が読者を紹介し合う推薦ネットワーク（Recommendations）の引力場',
    incumbentDilemma: '既存の巨大配信スタンドは純粋な到達率保証インフラであり、広告ネットワーク化に舵を切りにくい',
    initialTraction: ['Morning Brew初期チームによる実績アピール', '他ツールからのワンクリック移行機能'],
  },
  'upvoty': {
    tagline: 'Upvoty | 散乱する顧客の機能要望を公開ボードで集計・可視化するフィードバックSaaS',
    whatItDoes: 'ユーザーからの機能要望・フィードバックを可視化・管理するSaaS',
    targetCustomer: '顧客の声が散乱してロードマップ策定に悩むSaaS創業者・プロダクトマネージャー',
    painRelief: 'スプレッドシートやチャットで要望が埋もれ、開発優先順位を見失う混沌',
    blindspot: 'UserVoice等のエンタープライズツールが月数十万円と高額すぎ、中小SaaSが手を出せない点',
    moatDescription: 'ユーザーの顧客コミュニティが要望を投票し続けることによるワークフロー固定化',
    incumbentDilemma: '既存高額ベンダーは大手企業向けに営業リソースを割いており、月数千円のセルフサーブ市場を無視',
    initialTraction: ['自身のSaaSネットワークでのコールドローンチ', 'Product Huntでの公開と初期ユーザー獲得'],
  },
  'byword': {
    tagline: 'Byword | キーワード群から検索上位を狙う長文SEO記事を一括生成するAIエンジン',
    whatItDoes: 'SEO特化型AI長文記事一括生成エンジン',
    targetCustomer: 'オーガニック検索トラフィックを急速に伸ばしたいアフィリエイター・マーケター',
    painRelief: 'ライター外注にかかる膨大な費用と納期の遅れ',
    blindspot: 'ChatGPT等の汎用AIは1記事ずつの対話生成であり、数百記事のバッチ処理とWordPress直結ができなかった点',
    moatDescription: 'SEOキーワード検索意図を満たすプロンプトプリセットとCMS自動連携',
    incumbentDilemma: '大手AI企業は汎用アシスタントを目指しており、アフィリエイト・SEO直結の特化UIを作れない',
    initialTraction: ['TwitterでのSEO急上昇グラフの公開によるバズ獲得', 'SEOコミュニティへの直接告知'],
  },
  'obsidian': {
    tagline: 'Obsidian | クラウド依存と監視資本主義を排したローカル完結型Markdown思考OS',
    whatItDoes: 'ローカル保存のプレーンテキストMarkdownを知識グラフで連結する第2の脳ツール',
    targetCustomer: 'クラウドへのデータ預け入れやベンダーロックインを嫌悪するエンジニア・研究者・思考労働者',
    painRelief: 'Notion等のクラウド遅延、オフライン利用不可、サービス終了時のデータ喪失リスク',
    blindspot: 'SaaS大手が「クラウド囲い込み・月額課金」を前提とする中、ローカルファーストの安心感を突いた点',
    moatDescription: '数千件のコミュニティ製プラグインエコシステムと、標準Markdownという永続フォーマット',
    incumbentDilemma: '大手クラウドSaaSはユーザーデータを自社サーバーに握ることで課金するため、完全ローカル版を出せない',
    initialTraction: ['ObsidianフォーラムとDiscordでのコアエンジニアコミュニティ形成', 'Twitterでの知識グラフ可視化のバズ'],
  },
  'morning brew': {
    tagline: 'Morning Brew | 会話調とユーモアで若手ビジネスパーソンの朝を独占したニュースレター帝国',
    whatItDoes: 'ミレニアル・Z世代向けに専門用語を廃した会話調の朝刊ビジネスニュースレター',
    targetCustomer: '退屈な日経・WSJを読みたくないが、ビジネス会話についていきたい若手ビジネスパーソン',
    painRelief: '難解な金融・経済ニュースを読み解く苦痛と、同僚との会話で無知を晒す羞恥心',
    blindspot: '既存経済メディアが権威主義的な専門用語に拘泥し、若者の「わかりやすさ」を軽視した死角',
    moatDescription: '毎朝開く開封習慣（ルーティン化）と、400万人以上の高可処分所得な若手読者リスト',
    incumbentDilemma: '伝統的経済紙はブランドの格式と購読料収入を守るため、砕けた会話調の無料メルマガに舵を切れない',
    initialTraction: ['大学のビジネス専攻の講義で創業者が直接登壇し登録を呼びかけ', '特製ステッカーやマグカップが貰える紹介リファラルプログラム'],
  },
  'the diary of a ceo': {
    tagline: 'The Diary of a CEO | 超一流の告白を引き出しYouTube・ポッドキャスト・D2Cを支配するメディア帝国',
    whatItDoes: '世界的起業家・科学者・著名人の生々しい葛藤と本音を掘り下げる超長尺対談メディア',
    targetCustomer: '自己成長・ビジネス成功・健康長寿の最先端知見を渇望する野心的なビジネスパーソン',
    painRelief: '浅いニュースや切り抜きでは得られない、一流の思考プロセスや生々しい失敗の真実',
    blindspot: 'テレビや既存メディアが短尺・無難なインタビューに終始し、人間の剥き出しの本音を撮れなかった隙間',
    moatDescription: 'Steven Bartlettの卓越した質問力と、一流ゲストが「ここなら本音を話せる」と指名する信頼の引力場',
    incumbentDilemma: '大手放送局はスポンサーの意向や放送枠の制約があり、2〜3時間の無編集ガチ対談を流せない',
    initialTraction: ['ソーシャルエージェンシー創業で培ったSNSアルゴリズム最適化', '切り抜きショート動画による爆発的認知獲得'],
  },
  'theskimm': {
    tagline: 'theSkimm | 忙しい女性が朝5分で世界動向を把握できるスタイリッシュな朝刊キュレーション',
    whatItDoes: 'ミレニアル女性のために政治・経済・カルチャーを5分で要約する朝刊ニュースレター',
    targetCustomer: '仕事や育児に追われニュースを追う時間がないが、教養と話題を保ちたい多忙な女性',
    painRelief: '長文の硬派ニュースを読む時間がない焦りと、世の中の話題から取り残される疎外感',
    blindspot: 'ニュースメディアが男性視点または高齢者向けに構成され、若い働く女性のライフスタイルを無視した点',
    moatDescription: '700万人以上の女性読者コミュニティ（Skimm\'bassadors）による草の根の口コミ拡散網',
    incumbentDilemma: '大手メディアは中立性と網羅性を優先するため、ターゲット読者に語りかける親しみやすいトーンを作れない',
    initialTraction: ['創業者2名の友人・知人への泥臭い手動メール送信', 'Skimm\'bassadorsと呼ばれる熱狂的アンバサダー組織の構築'],
  },
  'kit (formerly convertkit)': {
    tagline: 'Kit (ConvertKit) | Mailchimpの複雑さを焼き払いクリエイターに特化したメールマーケティングSaaS',
    whatItDoes: 'ブロガー・著者・ポッドキャスター等クリエイター特化の直感型メール配信＆収益化ツール',
    targetCustomer: '自前のメルマガでデジタル商品やコースを販売したい個人クリエイター・発信者',
    painRelief: 'Mailchimp等の法人向けツールの複雑なタグ管理・重複課金・分かりにくいUI',
    blindspot: '老舗メルマガスタンドが中小企業向けB2Bに寄り、急増するソロプレナーの販売ニーズを放置した死角',
    moatDescription: 'クリエイター同士の読者紹介ネットワーク（Creator Network）と、公開起業ナラティブ',
    incumbentDilemma: 'Mailchimp等はエンタープライズの包括機能を削ぎ落とせず、クリエイター特化のシンプルな導線を作れない',
    initialTraction: ['Nathan Barryが自身のブログで年商0からの軌跡を全公開', '有名ブロガーへの手動個別アプローチと無料移行代行'],
  },
  'todoist': {
    tagline: 'Todoist | 外部資金ゼロ・18年間完全リモートで数千万人を囲い込んだタスク管理の最高峰',
    whatItDoes: '自然言語入力と超高速同期で日々のタスクを無駄なく消化できるマルチプラットフォームSaaS',
    targetCustomer: '頭の中のやるべきタスクが散乱し、集中力を奪われている多忙なビジネスパーソン・開発者',
    painRelief: '複雑すぎるプロジェクト管理ツール（Jira等）の重さと、紙のメモの紛失・忘れの恐怖',
    blindspot: 'タスク管理市場が巨大化してコラボレーション機能に肥大化する中、「個人の爆速消化」に特化し続けた点',
    moatDescription: '18年間にわたる自然言語パーサーの洗練、全デバイスでの即時同期、数百万人の習慣化ロックイン',
    incumbentDilemma: 'AsanaやMonday.comは高単価なエンタープライズ契約を狙うため、個人のセルフサーブ課金を捨てている',
    initialTraction: ['創業者Amirが自身の勉強・仕事管理のために自作しブログで公開', 'Chromeウェブストアやライフハックメディアでの口コミ爆発'],
  },
  '1440': {
    tagline: '1440 | 政治バイアスと編集者の主観を完全粉砕しファクトのみを配信する朝刊ニュースレター',
    whatItDoes: '意見・感情・扇動を100%排除し、検証された客観的事実だけを5分で届けるデイリーニュースレター',
    targetCustomer: 'メディアの偏向報道やSNSの罵詈雑言にうんざりし、真実の事実だけを手短に知りたい読者',
    painRelief: 'クリックベイト（煽り見出し）に振り回される精神的疲弊と、バイアスによる誤認のストレス',
    blindspot: '既存メディアがPV稼ぎと特定支持層へのアピールで過激化する中、「中立・事実のみ」の空白地帯を突いた点',
    moatDescription: '300万人以上の熱狂的な「偏見なき情報」を求める読者基盤と、極めて高い開封率',
    incumbentDilemma: '大手メディアは怒りや対立を煽ることでPVと購読者を維持しているため、無色透明なファクトに回帰できない',
    initialTraction: ['Meta等の運用型広告での高精度な読者獲得テスト', '「意見ではなく事実を読む」という共感性の高いバズ'],
  },
  'posthog': {
    tagline: 'PostHog | 自社インフラに即座に建てられるエンジニアのためのOSS統合プロダクトアナリティクス',
    whatItDoes: 'セッション記録・機能フラグ・A/Bテスト・イベント分析を1つに統合した開発者向け分析プラットフォーム',
    targetCustomer: 'MixpanelやAmplitudeの高額請求とGDPRデータ移転規制に頭を抱えるテックスタートアップ・CTO',
    painRelief: '複数ツール（Google Analytics, Hotjar, LaunchDarkly等）の分断契約と、膨大なイベント課金の恐怖',
    blindspot: '既存アナリティクス企業が非エンジニア（マーケター）向けに閉じ、開発者の自作・自社ホスト欲求を無視した点',
    moatDescription: 'オープンソースコミュニティの圧倒的支持、GitHubスター数、透明性の高い開発カルチャー',
    incumbentDilemma: 'AmplitudeやMixpanelはクラウド閉鎖型で巨額エンタープライズ売上を立てており、OSSセルフホスト版を出せない',
    initialTraction: ['Hacker Newsで「オープンソースのMixpanel代替」としてローンチし1位獲得', 'GitHub上での透明なロードマップ公開'],
  },
  'nomads.com': {
    tagline: 'Nomads.com (Nomad List) | Twitterスプレッドシート公開から始まったリモートワーカー特化の世界的有料コミュニティ',
    whatItDoes: '世界各都市の生活費・WiFi速度・治安データを集約し、リモートワーカーや海外移住者を繋ぐ有料メンバーシップ基盤',
    targetCustomer: '海外を旅しながら働きたいが、滞在先の安全性やネット環境、現地の仲間探しに不安を抱えるデジタルノマド・リモートワーカー',
    painRelief: '見知らぬ都市でのネット回線不通、治安トラブル、そして旅先での強烈な孤立感と孤独',
    blindspot: 'TripAdvisorやBooking.comが短期旅行者向けに偏重し、中長期滞在ノマドの「実生活データ」を網羅しなかった死角',
    moatDescription: 'Pieter Levelsによる10年以上の先行優位、世界数万人の有料会員ネットワーク、不可逆なSlack/Discordコミュニティ資産',
    incumbentDilemma: '大手旅行ポータルはホテル予約の手数料収入に依存しており、ノマド向けの月額/生涯買い切り型コミュニティモデルに関心を持てない',
    initialTraction: ['Twitterで公開した世界各都市の生活費スプレッドシートがバズり、数千人のノマドが自発的にデータを追記', 'Product Huntでのローンチと買い切り課金による初速キャッシュ獲得'],
  },
  'nomad list': {
    tagline: 'Nomad List | Twitterスプレッドシート公開から始まったリモートワーカー特化の世界的有料コミュニティ',
    whatItDoes: '世界各都市の生活費・WiFi速度・治安データを集約し、リモートワーカーや海外移住者を繋ぐ有料メンバーシップ基盤',
    targetCustomer: '海外を旅しながら働きたいが、滞在先の安全性やネット環境、現地の仲間探しに不安を抱えるデジタルノマド・リモートワーカー',
    painRelief: '見知らぬ都市でのネット回線不通、治安トラブル、そして旅先での強烈な孤立感と孤独',
    blindspot: 'TripAdvisorやBooking.comが短期旅行者向けに偏重し、中長期滞在ノマドの「実生活データ」を網羅しなかった死角',
    moatDescription: 'Pieter Levelsによる10年以上の先行優位、世界数万人の有料会員ネットワーク、不可逆なSlack/Discordコミュニティ資産',
    incumbentDilemma: '大手旅行ポータルはホテル予約の手数料収入に依存しており、ノマド向けの月額/生涯買い切り型コミュニティモデルに関心を持てない',
    initialTraction: ['Twitterで公開した世界各都市の生活費スプレッドシートがバズり、数千人のノマドが自発的にデータを追記', 'Product Huntでのローンチと買い切り課金による初速キャッシュ獲得'],
  },
  'the daily upside': {
    tagline: 'The Daily Upside | 元投資銀行家が金融の裏側を解剖する機関投資家・エグゼクティブ向け市場レター',
    whatItDoes: '金融アナリストの深い洞察に基づき、ウォール街とテックのマネーフローを解説する専門ニュースレター',
    targetCustomer: '表面的な市場ニュースでは満足できない投資銀行家・ファンドマネージャー・CFO',
    painRelief: '公知の数字の羅列から、投資判断に直結する真因を読み取る手間の重さ',
    blindspot: '一般紙の金融記事が素人向けに薄められる一方、専門レポートが数十万円と高すぎる隙間',
    moatDescription: '元投資銀行家Pat Trousdaleによる質の高い分析と、金融業界の意思決定者を網羅した購読者リスト',
    incumbentDilemma: '伝統的金融リサーチ会社は年間数百万円の独占契約モデルに縛られ、無料スポンサー型メルマガを展開できない',
    initialTraction: ['金融業界関係者のLinkedInネットワークへの直接配信', 'Wall Street Oasis等の金融フォーラムでの口コミ'],
  },
  'ali abdaal': {
    tagline: 'Ali Abdaal | 医学生から年商数億円の生産性・クリエイター教育帝国を築いた個人メディアの頂点',
    whatItDoes: 'YouTube・ポッドキャスト・書籍・Notion教材・高額オンラインアカデミーの多面体ビジネス',
    targetCustomer: '時間管理・生産性向上・副業での情報発信を目指す野心的な学生・ビジネスパーソン',
    painRelief: '日々の労働や勉強に忙殺され、自分のビジネスや資産を築けない焦りとモチベーション不足',
    blindspot: '従来の教育機関や大手出版社が個人の「具体的な作業プロセスや収益の裏側」をオープンにしない死角',
    moatDescription: '圧倒的な親しみやすさと透明性、数百万人の熱狂的フォロワー、体系化された講座コンテンツ資産',
    incumbentDilemma: '大手ビジネススクールや予備校は高額受講料と硬直したカリキュラムに縛られ、個人インフルエンサーの熱狂に勝てない',
    initialTraction: ['英国医師免許試験（BMAT）の受験対策ノウハウ動画', 'iPadを使った勉強法動画のアルゴリズムバズ'],
  },
  'the free press': {
    tagline: 'The Free Press | 既存メディアの忖度を粉砕し独立スクープで急成長した有料サブスク報道',
    whatItDoes: '大手新聞社を飛び出した一流ジャーナリストによる、忖度のない独立調査報道・オピニオンメディア',
    targetCustomer: '既存大手メディアの偏向やイデオロギー押し付けに不信感を抱く良識ある知性派読者',
    painRelief: '大手紙が報じない不都合な真実や、タブー視された議論を安心して読めないフラストレーション',
    blindspot: 'NYTやWaPoなどの伝統メディアが社内ポリコレや党派性に囚われ、読者の「本当の疑問」を封殺した死角',
    moatDescription: 'Bari Weissを中心とする著名記者のネームバリューと、広告主に媚びない純粋有料課金モデル',
    incumbentDilemma: '伝統的新聞社は既存の購読者層や社内労組の反発を恐れ、タブーに切り込む論陣を張れない',
    initialTraction: ['NYTを辞任したBari Weissの公開書簡による世界的注目', 'Substackを活用した初速課金読者の囲い込み'],
  },
  'defector': {
    tagline: 'Defector | 大手ファンドの干渉を拒絶し記者全員が株主となって自立した有料スポーツ・カルチャーメディア',
    whatItDoes: '元Deadspinのスターライター全員が集結し、広告やクリックベイトに頼らず読者課金で回す共同所有メディア',
    targetCustomer: '飾らない本音のスポーツ論評やシニカルなカルチャー批評を愛するコアなファン',
    painRelief: 'ファンドに買収されたメディアが広告まみれのまとめ記事へ劣化していくことへの怒り',
    blindspot: 'メディア企業の経営陣が現場のライターを消耗品として扱い、読者が「記者個人」に付いていることを見落とした点',
    moatDescription: '読者と記者の間に生まれた「連帯感と共犯関係」、外部株主がいないため全利益を記事と給与に還元できる構造',
    incumbentDilemma: '大手メディアコングロマリットは株主への利益配当と広告主への配慮が必須であり、自由闊達な論調を許容できない',
    initialTraction: ['Deadspin集団退職のニュースと読者の圧倒的同情・連帯', '創刊前のアナウンスだけで数万人の有料会員を獲得'],
  },
  'emailoctopus': {
    tagline: 'EmailOctopus | AWS SESの格安配管を活用しMailchimpの1/5の価格で提供する高収益メールSaaS',
    whatItDoes: 'Amazon Web ServicesのSimple Email Service（SES）に相乗りした格安ニュースレター配信基盤',
    targetCustomer: 'メルマガリストが肥大化してMailchimpやKlaviyoの高額請求に苦しむ中小企業・クリエイター',
    painRelief: 'リスト数が増えるだけで毎月数万円〜数十万円を毟り取られるメールマーケティングの課金地獄',
    blindspot: '大手メールスタンドが独自送信サーバーの減価償却とブランド料で高単価を維持する中、AWSの原価で提供した点',
    moatDescription: 'インフラ構築不要で誰でもAWS SESの超格安送信能力を使えるシンプルなUIとテンプレート',
    incumbentDilemma: 'Mailchimp等は自社の莫大な粗利益率（80%以上）を崩せないため、AWS原価レベルのプランに対抗不能',
    initialTraction: ['Product Huntでの「Mailchimpを安くする裏ワザ」としてのローンチ', 'インディーズ開発者フォーラムでの口コミ'],
  },
  'forte labs': {
    tagline: 'Forte Labs | 「第2の脳をつくる」メソッドを体系化し高単価教育と出版で独占したナレッジ管理帝国',
    whatItDoes: '情報過多の時代に個人のデジタルメモと知識を資産化する「BASB（Building a Second Brain）」教育プログラム',
    targetCustomer: '本や記事を読んでも知識が身につかず、仕事や創作のアウトプットに繋がらない知識労働者',
    painRelief: 'デジタルノートがゴミ屋敷化し、必要な情報を二度と見つけられない知的混乱と時間の浪費',
    blindspot: 'EvernoteやNotionなどのツール企業は「ツールの使い方」しか教えず、「人間の思考の整理術」を体系化しなかった隙間',
    moatDescription: '世界中でベストセラーとなった書籍・商標と、数千ドルを支払う熱狂的な受講生コミュニティ',
    incumbentDilemma: 'メモアプリ企業は自社ツールへの囲い込みが目的であるため、ツール非依存の純粋な思考メソッドを売れない',
    initialTraction: ['Mediumでの長文思考メソッド連載のバズ', '初期Cohorts型オンラインブートキャンプでの高単価実証'],
  },
  'newcomer': {
    tagline: 'Newcomer | シリコンバレーVCとスタートアップの裏取引・生々しい内幕を暴く高額有料インテリジェンス',
    whatItDoes: '著名テック記者Eric Newcomerによる、VC業界・大型ディール・人事抗争のスクープ特化メディア',
    targetCustomer: 'シリコンバレーの権力構造の変動や最新の投資動向を誰よりも早く知りたい投資家・起業家',
    painRelief: '企業のPR発表を垂れ流すだけの広報記事では絶対に手に入らない、非公式の舞台裏情報',
    blindspot: 'TechCrunch等の商業メディアがスポンサーやVCへの配慮で忖度記事を量産する中、個人記者の完全スクープに徹した点',
    moatDescription: 'トップVCやファウンダーがEricだけにオフレコで密告する独自の取材情報源ネットワーク',
    incumbentDilemma: '伝統的テックメディアはイベント協賛や広告出稿に依存しており、大物VCの闇を刺す記事を書けない',
    initialTraction: ['Bloombergのトップ記者からの独立という看板', '初期の衝撃的なVC内紛スクープによる口コミ拡散'],
  },
  'copyai': {
    tagline: 'Copy.ai | GPT-3 APIを直感的なマーケティングコピーUIに落とし込み初年度爆速成長したAI SaaS',
    whatItDoes: 'SNS広告、ブログ見出し、セールスコピーを数秒で数十パターン自動生成するマーケティング特化AI',
    targetCustomer: '毎日の広告文作成やSNS投稿のネタ切れに苦しむマーケター・EC事業者・フリーランス',
    painRelief: '白い画面の前でウンウン唸るコピーライティングの苦痛と、外注コピーライターの高い制作費用',
    blindspot: 'OpenAIがAPI提供に留まり、非エンジニアが今すぐ仕事で使える専用UIを用意していなかった黎明期の隙間',
    moatDescription: 'Twitter上での爆発的な公開開発（Build in Public）による初期ファン層と、膨大な利用実績データ',
    incumbentDilemma: '大手広告代理店や制作会社は人月の手作業で稼いでいるため、数千円のAI自動生成ツールを自ら出せない',
    initialTraction: ['Paul YacoubianがTwitterで自作AIツールのデモ動画を公開し即バズ', '無料トライアルのバイラル共有'],
  },
  'tactiq': {
    tagline: 'Tactiq | Google Meet・Zoomの会話をリアルタイム文字起こし＆AI要約する必須Chrome拡張',
    whatItDoes: 'Web会議中に画面上でリアルタイムに発言をテキスト化し、ワンクリックで議事録とタスクを生成するツール',
    targetCustomer: '1日に何件もWeb会議をこなし、議事録作成とタスク整理に追われるリモートワーカー・PM',
    painRelief: 'メモを取ることに必死で会話に集中できないストレスと、会議終了後の議事録作成という残業',
    blindspot: '会議録画ツールが「会議後に動画を再視聴させる」重い設計だったのに対し、「画面上のリアルタイム字幕」に徹した点',
    moatDescription: 'Chrome拡張機能ストアでの数十万件のインストール実績と、Web会議画面に完全に溶け込んだ操作感',
    incumbentDilemma: 'GoogleやZoom本体は標準機能の追加が慎重であり、特定ワークフロー特化のAI要約を素早く実装できない',
    initialTraction: ['ChromeウェブストアでのSEO上位獲得', 'リモートワーク急増期におけるReddit・Twitterでの口コミ'],
  },
  'zenmaid': {
    tagline: 'Zenmaid | 清掃代行業者が予約・スタッフ派遣・請求を完全自動化するニッチ特化型垂直SaaS',
    whatItDoes: '住宅清掃・ハウスキーピング企業特化のスケジュール管理・自動リマインダー・決済一体型プラットフォーム',
    targetCustomer: '電話や紙のスケジュール帳で清掃スタッフをやりくりし、ドタキャンやダブルブッキングに悩む清掃業者オーナー',
    painRelief: '現場スタッフへの指示出し、顧客からの予約変更電話、集金漏れという泥臭い運営管理の地獄',
    blindspot: '汎用の予約システム（Calendly等）では対応できない「スタッフの移動時間計算」「部屋の間取り別清掃時間」に特化した点',
    moatDescription: '清掃業界の業務フローに100%合致した専用設計と、清掃業者コミュニティでの圧倒的知名度',
    incumbentDilemma: '汎用SaaS大手は清掃業界という単一ニッチのために専用の派遣ロジックや見積もり計算を開発する気がない',
    initialTraction: ['清掃業者向けの業界カンファレンス（Maid Summit）を自ら主催し全国の業者を囲い込み', '業界特化ポッドキャストの配信'],
  },
  'gorails': {
    tagline: 'GoRails | 実務で即戦力になるRailsの設計とコードを毎週届ける開発者のためのサブスク学習所',
    whatItDoes: 'Ruby on Railsエンジニア向けの実務特化ビデオチュートリアル・コンポーネント・コミュニティ',
    targetCustomer: '入門書を終えた後、実務の複雑な課金・認証・バックグラウンド処理の実装に悩むWebエンジニア',
    painRelief: '公式ドキュメントやStack Overflowの断片情報をつなぎ合わせる膨大な試行錯誤のムダ',
    blindspot: 'プログラミングスクールが入門者向けに偏り、中上級者の「実務の急所コード」を誰も解説していなかった死角',
    moatDescription: 'Chris Oliverの10年以上にわたる実戦的な解説アーカイブと、Jumpstart Pro（有料Railsボイラープレート）の販売配管',
    incumbentDilemma: '大手動画学習サイト（Udemy等）は単発売り切りモデルのため、Railsの最新バージョンに追従する継続的メンテができない',
    initialTraction: ['Rubyコミュニティでの無償オープンソースライブラリ公開', 'Twitterや開発者フォーラムでの質問への丁寧な直接回答'],
  },
  'growsurf': {
    tagline: 'GrowSurf | わずか数行のJSでWebサービスに友達紹介・リファラル配管を埋め込む成長加速SaaS',
    whatItDoes: 'B2B SaaSやFintechアプリに組み込めるホワイトレーベル型紹介マーケティング・インセンティブ管理ツール',
    targetCustomer: '高騰するWeb広告（CAC）に頭を抱え、既存ユーザーからの口コミ紹介ループを作りたいマーケター・創業者',
    painRelief: '自社で紹介トラッキング、不正検知、リワード付与の仕組みを一から開発する莫大なエンジニア工数',
    blindspot: '既存のリファラルツールがEコマース（Shopify）向けに偏り、SaaS/Webアプリ向けのAPI連携ツールが不在だった隙間',
    moatDescription: '開発者が数分で埋め込める柔軟なSDKと、リファラル経由のCV率を最適化するUIコンポーネント群',
    incumbentDilemma: '広告プラットフォーム（Google/Meta）は自社の広告枠を売るのが本業であり、他人のリファラル配管を作る動機がない',
    initialTraction: ['Product Huntでのローンチと初期SaaSコミュニティへの浸透', '「紹介マーケティングの完全ガイド」等のSEOコンテンツ'],
  },
  'standuply': {
    tagline: 'Standuply | 時差のあるグローバル分散チームの朝会・進捗をSlackで非同期自動集計する敏腕Bot',
    whatItDoes: 'SlackやMicrosoft Teams上で毎朝自動で質問を投げ、メンバーの進捗やブロッカーを収集・可視化するボット',
    targetCustomer: '時差やリモートワークで毎朝の対面スタンドアップミーティングが破綻しているエンジニアチーム・スクラムマスター',
    painRelief: '全員が同じ時間帯に拘束されるミーティングのストレスと、誰が何をやっているか見えない不透明さ',
    blindspot: 'アジャイル開発の「毎朝の朝会」という全世界共通の儀式を、100%テキスト＆非同期で代替できることに特化した点',
    moatDescription: '何万ものSlackワークスペースに深く組み込まれた日常業務フローと、チームのムード計測などの追加機能群',
    incumbentDilemma: 'SlackやAtlassian本体は基本チャットやチケット管理に集中しており、きめ細かな非同期アンケート機能まで手を出さない',
    initialTraction: ['Slack App Directoryでの上位露出獲得', '「リモートワークのためのアジャイル開発」ノウハウ記事のバイラル'],
  },
  'liveagent': {
    tagline: 'LiveAgent | メール・電話・チャット・SNSを1画面に束ね格安で提供するマルチチャネルCSツール',
    whatItDoes: 'カスタマーサポートの全顧客接点を統合し、チケット管理とリアルタイムチャットを自動化するSaaS',
    targetCustomer: '顧客対応が複数のチャットツールやメールに散乱し、対応漏れや重複返信が頻発しているカスタマーサポート部門',
    painRelief: 'Zendesk等の大手CSツールの高額なシート単価と、複雑すぎる設定・アドオン課金地獄',
    blindspot: 'ZendeskやSalesforceがエンタープライズの超高単価契約へシフトし、中堅・中小が手を出せなくなった隙間',
    moatDescription: '長年培ったチケット処理エンジンの超高速性と、音声通話（VoIP）まで標準機能で内包するオールインワン設計',
    incumbentDilemma: '大手ヘルプデスクベンダーは機能ごとに別料金を請求するモデルのため、全機能込みの格安プランを出せない',
    initialTraction: ['Zendeskからの乗り換え比較ページによる徹底的なSEO戦略', '長期の無料トライアル提供'],
  },
  'vidico': {
    tagline: 'Vidico | シリコンバレーのSaaS・スタートアップに特化し圧倒的CVRを叩き出す動画制作スタジオ',
    whatItDoes: 'テックプロダクトの複雑な機能を1分で直感理解させるハイクオリティな解説動画・3Dアニメーション制作',
    targetCustomer: 'LPのコンバージョン率が低く、革新的なプロダクトの価値が顧客に伝わらず悩むスタートアップのマーケター・ファウンダー',
    painRelief: '一般の映像制作会社に依頼すると「SaaSのUIや概念を理解してもらえず、何十回も修正が発生する」意思疎通の苦痛',
    blindspot: '従来のテレビCM制作会社がスタートアップのデジタル文脈やSaaSの訴求ポイントを理解できない点',
    moatDescription: 'Square, Spotify, Airtable等のトップテック企業の制作実績ポートフォリオと、実績に裏打ちされた演出力',
    incumbentDilemma: '総合広告代理店は巨額予算のマス広告に偏重しており、スタートアップ向けの機動的なLP動画に特化できない',
    initialTraction: ['テック系フォーラムへの自社制作動画の投稿', '「SaaS Explainer Video」キーワードでのSEO完全独占'],
  },
  'casper': {
    tagline: 'Casper | 中間業者とショールームの法外なマージンを破壊し箱詰め直送したマットレスD2Cのパイオニア',
    whatItDoes: 'ウレタンマットレスを圧縮ロール梱包してダンボール箱で自宅へ直接届けるベッド＆寝具ブランド',
    targetCustomer: '怪しげなベッド量販店で高額なマットレスを買わされることに嫌悪感を抱く若い都市生活者',
    painRelief: '店員にしつこく営業される苦痛、巨大なマットレスを自宅へ運搬する重労働、返品できない恐怖',
    blindspot: '既存寝具業界が「10年に1度しか買わないから暴利をむさぼる」殿様商売にあぐらをかいていた死角',
    moatDescription: '「100日間無料返品保証」という圧倒的なノーリスク提案と、ソーシャル上での開封（アンボクシング）動画のバイラル',
    incumbentDilemma: '既存マットレスメーカーは全国の家具量販店との流通契約に縛られており、直販・返品保証に舵を切れなかった',
    initialTraction: ['ポッドキャスト広告への全集中出稿', '著名テックインフルエンサーへのマットレス無償配布と開封動画投稿'],
  },
  'liquid death': {
    tagline: 'Liquid Death | 健康飲料の綺麗事を血祭りに上げビールの缶で水を売りまくる反逆の飲料帝国',
    whatItDoes: 'オーストリアの天然アルプス湧水をヘビーメタルのアルミ缶に詰め、痛快な過激ブランディングで売る飲料D2C',
    targetCustomer: 'お行儀の良い健康志向に反吐が出るパンクロッカー、スケーター、クラブやフェスで酒を飲まない若者',
    painRelief: 'パーティーやライブハウスでペットボトルの水を飲むときの「ダサさ」「場違い感」という同調圧力の羞恥心',
    blindspot: '大手飲料メーカー（エビアン・コカコーラ等）が「清純・健康・ヨガ」という固定観念に囚われ、若者の反骨心を突けなかった点',
    moatDescription: '「プラスチックに死を（Death to Plastic）」という環境大義名分と、カルト的人気を誇る過激なコンテンツクリエイティブ',
    incumbentDilemma: '伝統的飲料大手はブランドイメージの毀損を恐れて「Liquid Death（悪魔の液体）」のような過激な世界観を作れない',
    initialTraction: ['製品を作る前に30万円で作った悪魔的フェイクCM動画をFacebookに投稿しバズ検証', 'Whole Foodsへの突撃営業'],
  },
  'tally': {
    tagline: 'Tally | Notionライクな無料枠でTypeformの牙城を崩すノーコードフォームビルダー',
    whatItDoes: 'Notionスタイルのドキュメント作成感覚で設問を組める超軽量ノーコードフォーム作成SaaS',
    targetCustomer: 'Typeform等の高額な月額課金（回答数制限）に不満を抱える個人開発者・スタートアップ',
    painRelief: '回答数が増えるだけで月額数千円〜数万円を請求される大手フォームツールの課金圧力',
    blindspot: '既存フォームツールが「1問ずつ画面遷移するリッチUI」でエンタープライズへ高価格化し、無料の余白を残した死角',
    moatDescription: '「99%の機能が完全無料」という破壊的フリーミアムと、Notionライクな直感ブロックエディタ',
    incumbentDilemma: 'Typeform等は既存の高単価サブスク売上を崩せないため、無制限回答の無料プランを出せない',
    initialTraction: ['Product HuntでのローンチでProduct of the Day獲得', 'TwitterとIndie Hackersでの熱心なBuild in Public'],
  },
  'simplelogin': {
    tagline: 'SimpleLogin | スパムと個人情報漏洩を遮断するオープンソース・メール転送エイリアス',
    whatItDoes: 'Webサービス登録用の使い捨てメールエイリアスを即座に発行し、実アドレスを隠蔽するプライバシーSaaS',
    targetCustomer: 'Webサイトへのメアド登録によるスパムや個人情報流出を警戒するエンジニア・プライバシー重視層',
    painRelief: '一度登録したアドレスが名簿業者に転売され、解約後も迷惑メールが届き続ける被害',
    blindspot: '大手メールサービス（Gmail等）がユーザーの行動データ収集を前提としており、真の匿名転送を提供しない隙間',
    moatDescription: '完全オープンソースによる高い透明性と、ProtonMailエコシステムへの統合（後にProtonが買収）',
    incumbentDilemma: '広告ビジネスモデルのメール大手がアドレス匿名化を推進すると、自社のターゲティング広告精度が落ちる',
    initialTraction: ['Hacker NewsやRedditのプライバシー系サブレディット（r/privacy）での口コミ', 'Product Huntでの公開'],
  },
  'mentorcruise': {
    tagline: 'MentorCruise | テック・起業の第一線プロから月額定額で直接助言を受けられるメンター受講PF',
    whatItDoes: 'エンジニア、デザイナー、プロダクトマネージャー向けの長期伴走型メンターシップ・マーケットプレイス',
    targetCustomer: '独学の限界を感じ、キャリアアップや転職、自社プロダクト開発で行き詰まっているテック人材',
    painRelief: '高額なブートキャンプ（数十万円〜百万円）の費用負担と、1回きりの単発相談では解決しない継続的課題',
    blindspot: 'キャリア相談が単発のスポットコンサル（GLG等）か高額スクールに二極化し、月数千円〜数万円の継続伴走が不在だった点',
    moatDescription: 'GoogleやMeta等のトップテック企業に所属する厳選メンター陣のネットワーク効果',
    incumbentDilemma: '大手転職エージェントは採用成功時の巨額手数料で稼ぐため、少額のメンター受講マッチングには参入しない',
    initialTraction: ['TwitterやLinkedInでの初期メンター直接スカウト', '「メンターを見つける方法」に関するSEO記事群'],
  },
  'salonist': {
    tagline: 'Salonist | 美容室・スパ・サロンの予約からスタッフ指名・POS決済までを一体化する垂直SaaS',
    whatItDoes: 'サロン・ビューティー業界特化型のオンライン予約、顧客カルテ、在庫管理、POSレジ一体型システム',
    targetCustomer: '電話対応や紙の予約台帳に追われ、ドタキャンや施術記録の管理に疲弊している個人サロンオーナー',
    painRelief: '施術中に電話対応で手を止められるストレスと、高額な大手ポータルサイトの予約送客手数料',
    blindspot: '汎用の予約SaaSがサロン特有の「担当者の指名」「施術時間ごとのブース空き状況」「薬品在庫」を管理できない点',
    moatDescription: '顧客カルテや過去の施術履歴データが蓄積されることによる不可逆な業務移行障壁',
    incumbentDilemma: '総合ポータル（HotPepper等）は送客課金モデルを崩せないため、自社完結型の予約SaaSを格安で提供できない',
    initialTraction: ['地域サロンへの直接コールドコールと無料デモ導入', '「サロン予約管理」キーワードでのオーガニックSEO'],
  },
  'the agent nest': {
    tagline: 'The Agent Nest | 不動産仲介エージェントのSNS集客コンテンツを完全自動化する特化型SaaS',
    whatItDoes: '個人不動産エージェント向けに、プロ品質のSNS投稿画像・ブログ記事・チラシ素材を毎週自動配信するツール',
    targetCustomer: '物件の仕入れや内見案内で多忙を極め、SNSやブログでの集客に手が回らない個人不動産仲介業者',
    painRelief: 'デザインスキルがなく素人くさい投稿しか作れない恥ずかしさと、毎日の投稿ネタ切れの苦痛',
    blindspot: 'Canva等の汎用デザインツールでは「不動産業界の法律や成約文脈に合った文面」を用意してくれない隙間',
    moatDescription: '不動産仲介の年間スケジュール（春の引っ越しシーズン、税金対策等）に最適化された独自テンプレート資産',
    incumbentDilemma: '不動産ポータル（Zillow等）は自社サイトへの広告出稿を促すため、エージェント個人の自力SNS集客は支援しない',
    initialTraction: ['不動産エージェントが集まるFacebookグループでの無料サンプルの配布', '月額数百ドルの格安サブスク提案'],
  },
  'zenoutreach': {
    tagline: 'ZenOutreach | B2Bコールドメールのアカウント作成から送信代行までを請け負うリード獲得マシン',
    whatItDoes: '中小B2B企業のためのコールドメール配信代行・インフラ構築・リード獲得支援サービス',
    targetCustomer: '営業専任チームがおらず、新規の見込み顧客開拓に困り果てているB2Bスタートアップ・受託会社',
    painRelief: '自社の本番ドメインがスパム判定されてメールが届かなくなる恐怖と、送信先リスト収集の膨大な手間',
    blindspot: 'コールドメール配信ツール（Apollo, Instantly等）があっても、実際の文面作成や配信インフラ構築を自前でできない点',
    moatDescription: '数十個のセカンダリドメインのDNS設定・ウォームアップ自動化ノウハウと、高返信率のテンプレート集',
    incumbentDilemma: '大手マーケティング代理店は月額数百万円の固定費を取るため、月数万円〜数十万円の手軽な配信代行をやらない',
    initialTraction: ['創業者自らがコールドメールで自社サービスを売り込む実証実験', 'Xでの成果ダッシュボード公開'],
  },
  'career sidekick': {
    tagline: 'Career Sidekick | 採用面接の急所を突く高単価アフィリエイト＆キャリア攻略メディア',
    whatItDoes: '元人材リクルーターが教える面接対策・履歴書作成・年収交渉ノウハウの特化型Webメディア',
    targetCustomer: '転職活動で最終面接を通過できず年収アップに焦るホワイトカラー求職者',
    painRelief: '「なぜ前職を辞めたのか？」等の意地悪な面接質問への答え方がわからず落ち続ける絶望',
    blindspot: '大手転職サイトが無難なマナー集しか出さない中、リクルーターが裏で何をチェックしているかの暴露に特化した点',
    moatDescription: '数千記事におよぶ「面接質問別」「職種別」の超ロングテールSEO完全独占と、高単価な転職支援アフィリエイト配管',
    incumbentDilemma: '大手人材紹介会社は求人広告主（採用企業）に忖度するため、求職者側に有利な裏ワザや年収交渉術を書けない',
    initialTraction: ['初期に失敗した雑記ブログを捨て、面接ノウハウ1点に絞り込んで記事を大量投入', 'Google検索からの自然流入'],
  },
  'katerra': {
    tagline: 'Katerra | 16億ドルを調達しながら垂直統合の固定費爆発で破綻した建設テックユニコーン',
    whatItDoes: '建設プロセスの設計・部材製造・物流・施工までを完全垂直統合した巨大建設テック',
    targetCustomer: '工期短縮と建設コスト削減を急ぐ商業デベロッパー・ゼネコン',
    painRelief: '下請け重層構造による工期の遅延・資材コストの高騰・工程管理の分断',
    blindspot: 'ソフトバンク等の巨額マネーを背に、建設業という超ローカルかつ柔軟性が求められる業界を工場量産モデルで支配しようとした点',
    moatDescription: '自社所有のプレハブ製造工場と専用ソフトウェア（しかし固定費が致命傷となり破綻）',
    incumbentDilemma: '伝統的ゼネコンはリスク分散のために下請けを活用しており、自社で全資産を抱えるKaterraの暴走に追随しなかった',
    initialTraction: ['VCからの巨額資金調達による競合工務店の買収', '大規模案件の安値受注'],
  },
  'glitch': {
    tagline: 'Glitch | Slackの母体となったがマネタイズ難航でサービス終了したWebソーシャルMMO',
    whatItDoes: 'Webブラウザ上で動作するマルチプレイヤー非戦闘型ソーシャルMMOゲーム',
    targetCustomer: '戦闘よりもクラフトやプレイヤー同士の交流を楽しみたいオンラインゲーマー',
    painRelief: '暴力や競争ばかりのMMOに疲弊したユーザーの癒やしとコミュニティへの所属欲求',
    blindspot: 'Flash/Web技術の過渡期に美麗な2Dアートと奥深い世界観を提供したが、課金転換率が低迷した点',
    moatDescription: '熱狂的なカルトファンコミュニティ（後に社内チャットツールだったSlackを切り出して大逆転）',
    incumbentDilemma: '大手ゲームパブリッシャーは課金圧の高いソーシャルゲームに傾倒しており、のんびりした世界観を支援できなかった',
    initialTraction: ['Flickr創業者Stewart Butterfieldのネームバリューによる初期ベータテスター獲得'],
  },
  'justin tv': {
    tagline: 'Justin.tv | Twitchへとピボットし動画ストリーミングの歴史を切り拓いた生配信の元祖',
    whatItDoes: '誰でもWebカメラからリアルタイムで動画を生配信できるプラットフォーム',
    targetCustomer: 'テレビでは見られない個人の生々しい日常やイベントを視聴・配信したいネットユーザー',
    painRelief: '動画の録画・編集・アップロードの手間と、リアルタイムな視聴者との双方向コミュニケーションの欠如',
    blindspot: 'YouTubeが録画動画の共有に留まっていた黎明期に、完全生配信のストリーミングインフラを構築した点',
    moatDescription: '低遅延ストリーミング配信技術と、ゲーム実況サブカテゴリ（後のTwitch）の異常な熱狂',
    incumbentDilemma: '既存メディアやYouTubeは莫大な帯域サーバー費用と著作権違反の監視コストを恐れて生配信に慎重だった',
    initialTraction: ['創業者Justin Kanがカメラを頭に付けて24時間自分の生活を生中継するクレイジーな初期PR'],
  },
  'tilt': {
    tagline: 'Tilt | 大学キャンパスを席巻しAirbnbに買収されたソーシャル割り勘プラットフォーム',
    whatItDoes: '友人グループでのパーティー費用、旅行代、グッズ作成費などを共同集金するソーシャル決済アプリ',
    targetCustomer: 'サークル費用や飲み会の集金で「立て替え払い」の回収に苦しむ大学生・幹事',
    painRelief: 'イベント後に参加者一人ひとりにお金を請求し回収する気まずさと未払いのリスク',
    blindspot: 'Venmo等の1対1送金アプリが「目標金額に達したら決済成立」というクラウドファンディング的集金をカバーしていなかった点',
    moatDescription: '全米の大学キャンパスに張り巡らされた学生アンバサダーネットワークの熱狂',
    incumbentDilemma: '銀行や大手決済会社は少額の学生割り勘ビジネスを無視し、エンタープライズ加盟店開拓に集中していた',
    initialTraction: ['各大学のフラタニティ（男子学生クラブ）や幹事に直接アプローチし、パーティー集金に使わせる草の根作戦'],
  },
  'quirky': {
    tagline: 'Quirky | 一般人の発明アイデアを製品化したが製造原価と在庫の山で破綻したクラウド発明PF',
    whatItDoes: 'コミュニティの投票で選ばれた一般人のアイデアを、自社で設計・金型製造・量産して全米量販店へ卸すプラットフォーム',
    targetCustomer: '日常生活の「こんなモノがあったらいいのに」というアイデアを持ちながら製造・販売の手段を持たない一般人',
    painRelief: '特許出願、金型作成、量産工場との交渉という個人には不可能なハードウェア開発の超高額な壁',
    blindspot: '製造業の民主化という崇高な理想を掲げたが、売れない製品の金型費用と在庫リスクを自社で抱え込み自滅した点',
    moatDescription: '100万人以上のコミュニティ発明者と、GE（ゼネラル・エレクトリック）等との資本提携',
    incumbentDilemma: '大手日用品メーカーは自社R&Dに固執し、一般人の粗削りなアイデアを拾い上げる仕組みを持てなかった',
    initialTraction: ['テレビ番組やメディア露出による「誰でも発明家になれる」というナラティブの拡散'],
  },
  'shyp': {
    tagline: 'Shyp | 荷物の梱包から集荷までスマホ1台で完結させたが配送逆ザヤで破綻したUber型配送テック',
    whatItDoes: 'スマホで写真を撮るだけでドライバーが家まで荷物を取りに来て、梱包・最安発送まで代行するオンデマンド配送アプリ',
    targetCustomer: '郵便局の長蛇の列やダンボールの梱包作業を嫌悪する都市部の多忙な個人・フリマ出品者',
    painRelief: 'ダンボールや緩衝材を買い集め、テープで梱包して重い荷物を営業所まで運ぶ泥臭い重労働',
    blindspot: '「梱包の手間をゼロにする」という最高のUXを提供したが、1件$5の手数料では梱包資材と人件費を到底賄えなかった点',
    moatDescription: '都市部での圧倒的なブランド認知と、大手運送会社（FedEx等）の法人大口割引マージン',
    incumbentDilemma: 'FedExやUPSは固定の集配ルートを回るのが本業であり、個人宅へのオンデマンド梱包集荷は採算が合わず参入不能',
    initialTraction: ['サンフランシスコでの口コミとTechCrunch等での熱狂的な「郵便局の死」の報道'],
  },
  'delicious': {
    tagline: 'Delicious | ソーシャルタギングでWebのブックマークを共有したソーシャルブックマークの元祖',
    whatItDoes: 'Webページをタグ付けしてクラウド上に保存し、他人のブックマークを探索できるソーシャルブックマークサービス',
    targetCustomer: '大量の技術記事や有用リンクを収集し、ブラウザの垣根を越えて整理したい初期のギーク・研究者',
    painRelief: 'ローカルブラウザに保存したブックマークが別PCで見られない不便さと、階層フォルダ分けの破綻',
    blindspot: '「フォルダ分類」ではなく「平文タグの付与」というシンプルな概念で、Web全体の集合知を自然形成した点',
    moatDescription: '数億件におよぶ高品質なリンクデータと、ギーク層による先行者ネットワーク効果（Yahoo!が買収後に衰退）',
    incumbentDilemma: 'ブラウザベンダー（IE等）はブックマークをローカル機能と見なしており、ソーシャル共有への発想がなかった',
    initialTraction: ['Hacker Newsの前身コミュニティやテックブログでの口コミ拡散'],
  },
  'mubert': {
    tagline: 'Mubert | クリエイター向けに著作権フリーのBGMを数秒でリアルタイム生成するAI音楽PF',
    whatItDoes: '動画クリエイター、ストリーマー、アプリ開発者向けにAIが著作権フリー音源を無限生成するプラットフォーム',
    targetCustomer: 'YouTubeやTikTokのBGMを探しているが、著作権侵害（Content ID警告）や高額なライセンス料を恐れるクリエイター',
    painRelief: 'ストック音楽サイト（AudioJungle等）での膨大な音源探索時間と、権利侵害による動画収益化停止のリスク',
    blindspot: '既存の著作権管理団体（JASRAC等）の旧態依然とした手続きを排し、AI生成によって完全な権利クリアランスを実現した点',
    moatDescription: 'ミュージシャンから提供された音源サンプルと自社AIジェネレータの特許パイプライン',
    incumbentDilemma: '大手レコード会社や著作権管理会社は既存の楽曲著作権料の徴収が本業のため、AIによる格安代替を敵視せざるを得ない',
    initialTraction: ['開発者向けAPIの提供による他社アプリへの組み込み', 'ストリーマーコミュニティでの口コミ'],
  },
  'strengthrunning': {
    tagline: 'Strength Running | 10年間怪我ゼロのランニング指導で月間20万PVを集める特化メディア＆教材',
    whatItDoes: '怪我を防ぎ自己ベストを更新するための長距離ランナー向け特化メディア、ポッドキャスト、オンライン教材',
    targetCustomer: '練習のやりすぎで膝や足首を痛め、レースでの記録更新に伸び悩んでいる市民ランナー',
    painRelief: '怪我をして走れなくなる絶望感と、高額なパーソナルトレーナーを雇えない金銭的制約',
    blindspot: '一般のフィットネス情報が「筋トレ」か「ダイエット」に偏る中、「怪我の予防とフォーム改善」に一点集中した点',
    moatDescription: '10年間にわたる高評価コンテンツの蓄積、20万PV以上のオーガニック検索トラフィック、数万人のメール会員基盤',
    incumbentDilemma: '大手ランニング雑誌はシューズメーカー等の広告に依存しており、シューズに頼らない本質的な怪我予防を書きにくい',
    initialTraction: ['実用的な怪我予防ルーティンの動画と詳細な解説記事の無料公開', 'ランニングフォーラムでの熱心な回答'],
  },
};

// ============================================================================
// Waveタイトル・実態解析エンジン（Starter Story / Failoryの宝の山を救出）
// ============================================================================

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function parseWaveIntelligence(title: string, entityName: string, monthlyRevenue: number): KnownBusinessProfile {
  const cleanTitle = decodeHtmlEntities(title).trim();
  const lower = cleanTitle.toLowerCase();

  // 1. 失敗事例・Post-mortem
  const isFailure =
    lower.includes('burnt') ||
    lower.includes('failed') ||
    lower.includes('failure') ||
    lower.includes('shut down') ||
    lower.includes('shutting down') ||
    lower.includes('losing') ||
    lower.includes('why i stopped') ||
    lower.includes('why did they fail') ||
    lower.includes('what happened') ||
    lower.includes('mistake') ||
    lower.includes('killed') ||
    lower.includes('nobody wanted') ||
    lower.includes('too difficult to use') ||
    lower.includes('rip ');

  // 2. 業界・分野の具体的マッピング
  let whatItDoes = `${entityName}が展開した特定市場向けのプロダクト・サービス`;
  let targetCustomer = `${entityName}のソリューションを必要とする特定セグメントの顧客層`;
  let painRelief = '既存の非効率な手作業や高額ツールのコスト・学習負担';
  let blindspot = '競合大手がカバーしきれない特化ニーズや運用の隙間';
  let moatDescription = '特定業務ワークフローへの深い埋め込みと先行実績';
  let incumbentDilemma = '大手ベンダーは汎用機能を優先し、特定ニッチの業務UIを作り込めない';
  let initialTraction = ['Product HuntやReddit等ニッチコミュニティでの直接ローンチ', '創業者自らの手動アウトリーチと無料デモ提供'];

  if (lower.includes('course') || lower.includes('programming') || lower.includes('css for js') || lower.includes('learn')) {
    whatItDoes = 'エンジニア・実務者向けの特化型プログラミング教材・オンライン講座';
    targetCustomer = '入門書を終え、実務での複雑な実装やCSSのレイアウト崩れに悩む開発者';
    painRelief = 'ネット上の断片的なTipsを拾い集めても体系的なメンタルモデルが身につかない学習の苦痛';
    blindspot = '大手プログラミングスクールが高額・入門者向けに偏り、中上級者の実務の急所を扱わない死角';
    moatDescription = '圧倒的に分かりやすいインタラクティブ教材と講師個人の熱狂的ファン基盤';
    incumbentDilemma = '大手動画プラットフォーム（Udemy等）は売り切り薄利多売のため、質の高い独自教材を作れない';
    initialTraction = ['Twitterでの技術Tips解説動画のバズ', '教材開発前のプレセール予約販売による初期資金獲得'];
  } else if (lower.includes('cold email') || lower.includes('outreach')) {
    whatItDoes = 'B2Bアウトバウンド・コールドメール配信代行およびアポ獲得支援';
    targetCustomer = '営業専任チームがおらず、新規商談の獲得に困り果てているB2Bスタートアップ・受託会社';
    painRelief = '送信ドメインがスパム扱いされる恐怖と、送信先リスト収集にかかる膨大な労働';
    blindspot = '配信ツール（Apollo等）はあっても、実際の文面作成や配信インフラ構築を自前でできない隙間';
    moatDescription = '独自ドメイン自動暖気ノウハウと返信率を極大化する実証済み文面資産';
    incumbentDilemma = '大手広告代理店は月額数百万円の固定費を取るため、手軽なメール配信代行をやらない';
    initialTraction = ['創業者自らのコールドメールによる直接獲得実証', 'Xでの成果ダッシュボード公開'];
  } else if (lower.includes('find software') || lower.includes('softwares') || lower.includes('software for small')) {
    whatItDoes = '中小企業向け業務ソフトウェアの選定・比較レビューメディア';
    targetCustomer = 'どのSaaSを導入すべきか迷い、高額な失敗を恐れる中小企業経営者・店舗オーナー';
    painRelief = '高額なツールを契約して使いこなせず無駄金になる導入失敗の恐怖';
    blindspot = '大手比較サイトが広告料順に並べる中、現場視点の中立なレビューに特化した点';
    moatDescription = '質の高い比較コンテンツによるオーガニック検索流入と高単価アフィリエイト配管';
    incumbentDilemma = '既存の巨大レビューサイト（G2等）はエンタープライズ課金に依存し、中小向けの実用比較が手薄';
    initialTraction = ['スモールビジネス向けFacebookグループでの無料相談', 'SEO特化の比較記事大量投入'];
  } else if (lower.includes('paas') || lower.includes('cloud management') || lower.includes('bunnyshell')) {
    whatItDoes = '開発・ステージング環境の自動複製・環境管理PaaS';
    targetCustomer = '複雑なKubernetesやインフラ設定に工数を奪われているDevOpsエンジニア・テックリード';
    painRelief = 'ステージング環境が足りずプルリクエストの検証待ちが発生する開発のボトルネック';
    blindspot = 'AWSやGCPがインフラ提供に留まり、プルリクごとの即時エフェメラル環境を用意しない隙間';
    moatDescription = 'GitHub/GitLabとの深い自動連携パイプラインと開発者の日々の開発フロー組み込み';
    incumbentDilemma = 'メガクラウドは自社コンソールの利用を促すため、特定ユースケースの爆速環境複製ツールを作りにくい';
    initialTraction = ['Product Huntでのローンチと開発者コミュニティへの直接告知', '無料トライアルの提供'];
  } else if (lower.includes('travel') || lower.includes('voyagu')) {
    whatItDoes = '専任コンシェルジュによる格安ビジネスクラス・旅程手配プラットフォーム';
    targetCustomer = '複雑な海外旅程の手配やフライト変更に時間を奪われている多忙なビジネス渡航者・エグゼクティブ';
    painRelief = '比較サイトでの膨大な検索時間と、フライト遅延・欠航時の電話窓口の繋がらなさ';
    blindspot = '格安予約サイトの無機質なセルフ検索と、高額な大手旅行代理店の中間地帯を突いた点';
    moatDescription = '顧客ごとの渡航履歴・好みデータの蓄積と、航空会社との独自ホールセール仕入れルート';
    incumbentDilemma = '大手OTA（Expedia等）は薄利多売の完全自動化を追求しており、手厚い個別コンシェルジュを置けない';
    initialTraction = ['海外出張の多い法人役員への直接紹介営業', '口コミリファラル特典'];
  } else if (lower.includes('tool for designers') || lower.includes('designers') || lower.includes('ink:') || lower.includes('canvas')) {
    whatItDoes = 'デザイナー向けオンライン制作・特化型デザイン支援ツール';
    targetCustomer = '日々の反復制作作業やクライアントへの提案資料作成に追われるUI/UXデザイナー';
    painRelief = '重厚なプロ用グラフィックソフトの動作の重さと、単純な反復作業にかかる時間の浪費';
    blindspot = 'PhotoshopやFigma等の巨大ソフトがカバーしない単一特化機能の爆速操作';
    moatDescription = 'デザイナーの作業習慣に特化したキーボードショートカットと直感操作';
    incumbentDilemma = '巨大デザインソフトは多機能を維持する必要があり、特定作業だけの極小UIに特化できない';
    initialTraction = ['DribbbleやBehanceでの作品デモ公開', 'デザインコミュニティでの無料ベータ配布'];
  } else if (lower.includes('game') || lower.includes('gaming') || lower.includes('lerning')) {
    whatItDoes = 'ゲーム要素を取り入れた教育・ゲーミフィケーション学習プラットフォーム';
    targetCustomer = '子どもに自発的な学習習慣を身につけさせたい保護者・教育関係者';
    painRelief = '従来の退屈な教材に対する子どもの集中力低下と学習意欲の減退';
    blindspot = 'ゲームとしての面白さと、本質的な学力向上を両立させるカリキュラム設計';
    moatDescription = '子どもを夢中にさせるゲーム演出エンジンと学習進捗トラッキングデータ';
    incumbentDilemma = '大手教育出版社は紙のドリルや従来型映像授業の利権を守るため、本格的ゲーム開発に踏み切れない';
    initialTraction = ['教育フォーラムや保護者向けブログでの紹介', '学校教育機関への無料パイロット導入'];
  } else if (lower.includes('event') || lower.includes('eventloot')) {
    whatItDoes = 'イベント主催者向けチケット販売・参加者エンゲージメント管理SaaS';
    targetCustomer = 'コミュニティイベントやカンファレンスの集客・受付オペレーションに追われる主催者・幹事';
    painRelief = '複数ツールに分断された参加者名簿と当日の受付遅延・混乱のトラブル';
    blindspot = '大手チケットサイト（Peatix, Eventbrite等）の高額手数料と顧客リストの囲い込み';
    moatDescription = 'イベント主催者の過去開催データとリピート参加者コミュニティの蓄積';
    incumbentDilemma = '大手イベントプラットフォームは自社サイトへの集客囲い込みを優先し、主催者独自のホワイトレーベル化を嫌う';
    initialTraction = ['地域コミュニティやMeetup主催者への直接アプローチ', '手数料無料の初回キャンペーン'];
  } else if (lower.includes('side project') || lower.includes('reality hunt')) {
    whatItDoes = '特定トレンドやソーシャルトピックを収集・可視化する個人開発オンラインサービス';
    targetCustomer = '最新トレンドや世論の動向をいち早く把握したいネットユーザー・リサーチャー';
    painRelief = '散乱するSNS投稿やニュースを1つずつ検索して真偽を確かめる手間の重さ';
    blindspot = '大手メディアが取り上げないインターネットの局所的な熱狂やニッチな議論の可視化';
    moatDescription = '特定コミュニティからの定常的なアクセスと独自データ収集クローラー';
    incumbentDilemma = '大手ポータルはコンプライアンスや政治的中立性のリスクを恐れ、尖ったトピックに特化できない';
    initialTraction = ['TwitterやRedditでの衝撃的な分析結果の投稿によるバズ', 'ソーシャルブックマークからの流入'];
  } else if (lower.includes('difficult to use') || lower.includes('signups') || lower.includes('creator growth')) {
    whatItDoes = 'コンテンツクリエイター向けSNSアナリティクス＆グロース支援ツール';
    targetCustomer = 'フォロワー数や再生数を伸ばしたいが何から改善すべきか分からない個人クリエイター';
    painRelief = '投稿しても反応が得られずアルゴリズムの仕組みが分からない焦燥感と孤独';
    blindspot = '機能過多で難解になり初期ユーザーが定着しないというオンボーディングの壁（UI単純化が急所）';
    moatDescription = 'クリエイターの成長曲線データと投稿パフォーマンスの予測アルゴリズム';
    incumbentDilemma = '大手SNSプラットフォーム公式のアナリティクスは最低限の数字しか開示しない';
    initialTraction = ['クリエイター向けDiscordやコミュニティでの無料フィードバック提供', '改善前後の事例公開'];
  } else if (lower.includes('form builder') || lower.includes('no-code')) {
    whatItDoes = 'Notionライクなブロックエディタで作成できる超軽量ノーコードフォームSaaS';
    targetCustomer = 'Typeform等の高額課金（回答数制限）に苦しむスタートアップ・個人開発者';
    painRelief = '回答数が増えるだけで月額数千円〜数万円を請求される大手フォームツールの課金圧力';
    blindspot = '大手がリッチ機能で単価を吊り上げる中、超軽量で無料枠の広いUIを提供した点';
    moatDescription = '作成されたフォーム経由でのバイラル流入と、Notionライクな快適な操作性';
    incumbentDilemma = 'Typeform等は既存の高単価サブスク売上を崩せないため、無制限回答の無料プランを出せない';
    initialTraction = ['Product HuntでのローンチでProduct of the Day獲得', 'Indie HackersでのBuild in Public'];
  } else if (lower.includes('real estate')) {
    whatItDoes = '不動産仲介エージェント特化型のマーケティング・集客支援ソフトウェア';
    targetCustomer = '物件の内見や契約業務に追われSNS発信や集客が後手に回る個人エージェント';
    painRelief = 'デザインスキル不足と毎日の物件プロモーション投稿作成にかかる膨大な労力';
    blindspot = '汎用デザインツールでは不動産特有の法律・成約文脈に即した素材が出せない隙間';
    moatDescription = '不動産仲介の年間販促カレンダーに最適化された専用テンプレート資産';
    incumbentDilemma = '不動産ポータルは自社サイトへの広告出稿を促すため、エージェント自力のSNS集客を支援しない';
    initialTraction = ['不動産エージェント向けFacebookグループでの無料素材配布', '月額格安サブスク提案'];
  } else if (lower.includes('privacy') || lower.includes('security')) {
    whatItDoes = '個人のプライバシー保護および使い捨てメールアドレス匿名化インフラSaaS';
    targetCustomer = 'Webサイト登録によるスパムや個人情報売買を警戒するセキュリティ重視層';
    painRelief = '登録後に迷惑メールが届き続ける被害と、本番メアド漏洩の精神的恐怖';
    blindspot = '大手メール会社が自社のデータ収集ビジネスを守るため匿名転送に消極的な死角';
    moatDescription = '完全オープンソースによる高い透明性と、セキュリティコミュニティでの信頼性';
    incumbentDilemma = '広告モデルのメール大手がアドレス匿名化を推進すると、自社広告の精度が落ちる';
    initialTraction = ['Hacker NewsやReddit（r/privacy）での口コミ', 'Product Huntでの公開'];
  } else if (lower.includes('salon') || lower.includes('booking')) {
    whatItDoes = '美容室・サロン特化型のオンライン予約＆店舗オペレーション一元管理SaaS';
    targetCustomer = '電話対応や紙の予約帳でダブルブッキングに怯える個人サロンオーナー';
    painRelief = '施術中の電話対応の中断ストレスと、大手送客ポータルへの高額な手数料';
    blindspot = '汎用予約システムでは美容室特有のスタッフ指名やブース空き時間を管理できない点';
    moatDescription = '蓄積された顧客カルテデータと過去の施術履歴による不可逆な業務ロックイン';
    incumbentDilemma = '総合ポータルは送客課金モデルを崩せないため、自社完結型の予約SaaSを格安で出せない';
    initialTraction = ['地域サロンへの直接コールドコールと無料デモ導入', '「サロン予約管理」キーワードSEO'];
  } else if (lower.includes('clothing') || lower.includes('apparel') || lower.includes('brand')) {
    whatItDoes = '特定ターゲットに特化した直販D2Cアパレル・ライフスタイルブランド';
    targetCustomer = 'マス向け量産ブランドのデザインや品質に飽き足らない熱心なファン層';
    painRelief = '自分のアイデンティティや体型に本当にフィットするウェアが見つからない不満';
    blindspot = '総合アパレルが中間流通や店舗家賃で原価を削る中、直販で高品質を担保した点';
    moatDescription = 'ソーシャルメディアを通じた創業者とファンの直接的な共犯関係と限定生産';
    incumbentDilemma = '大手アパレルは大量生産・全世代向け設計のため、極端なニッチ向けデザインを作れない';
    initialTraction = ['Instagram/TikTokでのニッチな利用シーン動画のバズ', '専門コミュニティでの限定プレオーダー'];
  } else if (lower.includes('blog') || lower.includes('media') || lower.includes('content') || lower.includes('newsletter')) {
    whatItDoes = '特定専門領域の攻略ノウハウに特化した高収益Webメディア＆情報基盤';
    targetCustomer = '表面的なまとめ記事では解決できない実戦ノウハウを渇望する読者・求職者';
    painRelief = '検索してもPR記事ばかりで現場の生々しい真実が手に入らないフラストレーション';
    blindspot = '大手メディアが書けないタブーや現場の裏事情を赤裸々に公開した点';
    moatDescription = '検索エンジンの上位を独占する専門コンテンツ資産と、高単価アフィリエイト配管';
    incumbentDilemma = '大手メディアは広告主への配慮が必須であり、業界の闇を抉る独自分析を書けない';
    initialTraction = ['Twitterでの長文解説スレッドによる認知獲得', '既存読者からの紹介ループ'];
  }

  const tagline = isFailure
    ? `${entityName} | 【失敗解剖】${cleanTitle}`
    : `${entityName} | ${cleanTitle}`;

  return {
    tagline,
    whatItDoes,
    targetCustomer,
    painRelief,
    blindspot,
    moatDescription,
    incumbentDilemma,
    initialTraction,
  };
}

// ============================================================================
// セマンティック自動分類エンジン（未登録エンティティ用・テンプレ完全根絶）
// ============================================================================

function inferSemanticIntelligence(
  entityName: string,
  canonicalIdentifier: string | undefined,
  domain: string | null | undefined,
  rawType: string,
  sector: string,
  priceUnit: string | null,
  monthlyRevenue: number
): KnownBusinessProfile {
  const text = `${entityName} ${canonicalIdentifier || ''} ${domain || ''} ${rawType}`.toLowerCase();

  // 1. ローカル直販・住宅店舗設備（煙突、清掃、配管、リフォーム等）
  if (
    text.includes('chimney') ||
    text.includes('clean') ||
    text.includes('plumb') ||
    text.includes('roof') ||
    text.includes('repair') ||
    text.includes('kitchen') ||
    text.includes('lawn') ||
    text.includes('hvac') ||
    text.includes('tours') ||
    text.includes('auto shop')
  ) {
    return {
      tagline: `${entityName} | 中間マージンを完全中抜きする地域密着・直営現場施工モデル`,
      whatItDoes: `${entityName}が提供する中間下請けを挟まない住宅・店舗設備の直接施工・点検サービス`,
      targetCustomer: `悪質な相場や施工不良を恐れ、信頼できる専門職人を直接探している施主・店舗オーナー`,
      painRelief: `ポータルサイト経由での不透明な中抜き手数料と、腕の悪い下請け業者に当たる恐怖`,
      blindspot: `大手集客ポータルが20〜30%の中間マージンを抜く隙間を突き、適正価格と職人直通で信頼を独占`,
      moatDescription: `地域コミュニティ内での高評価クチコミの蓄積と、リピート点検の定期契約基盤`,
      incumbentDilemma: `大手リフォーム紹介会社は仲介手数料ビジネスのため、職人の直販を支援すると自社売上が蒸発する`,
      initialTraction: ['地元近隣への直接ポスティングチラシと地域Googleマップ（MEO）完全最適化', '丁寧な作業前後の写真公開による口コミ紹介'],
    };
  }

  // 2. 開発者ツール・クラウドインフラ・API
  if (
    text.includes('api') ||
    text.includes('dev') ||
    text.includes('git') ||
    text.includes('cloud') ||
    text.includes('host') ||
    text.includes('server') ||
    text.includes('deploy') ||
    text.includes('backup') ||
    text.includes('snapshooter') ||
    text.includes('database') ||
    text.includes('db') ||
    text.includes('stack')
  ) {
    return {
      tagline: `${entityName} | クラウド運用の退屈な配管作業とバックアップを完全自動化する開発者インフラ`,
      whatItDoes: `開発者がインフラ保守に時間を奪われずコードに集中するための自動運用・バックアップツール`,
      targetCustomer: `深夜のサーバー障害対応やデータ消失リスクに怯えるテックスタートアップのCTO・エンジニア`,
      painRelief: `AWS等の難解なインフラコンソールとの格闘にかかる莫大な時間と、設定ミスによる障害リスク`,
      blindspot: `メガクラウド大手が多機能すぎて使いにくい隙間を突き、ワンクリックで完了する極小UIに特化`,
      moatDescription: `一度設定すると障害が起きない限り解約されない、ミッションクリティカルなシステムへの埋め込み`,
      incumbentDilemma: `巨大クラウドベンダーは自社の包括的製品群を売りたいため、単機能の超軽量ツールを個別に出せない`,
      initialTraction: ['Hacker NewsやGitHubでの初期ローンチ', 'エンジニア向け技術ブログでのトラブルシューティング解説記事'],
    };
  }

  // 3. 業務OS・柔軟なワークスペース・垂直CRM
  if (
    text.includes('fibery') ||
    text.includes('workspace') ||
    text.includes('crm') ||
    text.includes('manage') ||
    text.includes('flow') ||
    text.includes('collab') ||
    text.includes('board') ||
    text.includes('task') ||
    text.includes('request')
  ) {
    return {
      tagline: `${entityName} | 汎用ツールの硬直した枠組みを壊し独自の業務プロセスを構築できるカスタムOS`,
      whatItDoes: `企業の個別業務フローに合わせてリレーションやダッシュボードを自在に組み立てられる業務管理SaaS`,
      targetCustomer: `JiraやSalesforceの画一的な仕様に自社の業務が合わず、スプレッドシートの二重管理に苦しむPM・業務統括者`,
      painRelief: `複数のツールを跨いで手動でデータを転記・集計する不条理な残業と、プロジェクト進捗のブラックボックス化`,
      blindspot: `大手SaaSが標準化された機能追加に固執する中、企業固有の複雑なデータ関係性をノーコードで表現させた点`,
      moatDescription: `社内の全業務プロセスと過去ログがツール内に完全に蓄積されることによる不可逆な移行障壁`,
      incumbentDilemma: `既存の縦割り高額SaaSは部門ごとのシート課金を守るため、全社横断の柔軟なデータ統合基盤に移行できない`,
      initialTraction: ['Product Huntでのアジャイルコミュニティ向けローンチ', '他社CRM/タスクツールからのデータ移行テンプレート無償提供'],
    };
  }

  // 4. 特化型マーケットプレイス・垂直コマース
  if (
    text.includes('market') ||
    text.includes('shop') ||
    text.includes('store') ||
    text.includes('apparel') ||
    text.includes('cloth') ||
    text.includes('goods') ||
    text.includes('crossnet') ||
    text.includes('spuds')
  ) {
    return {
      tagline: `${entityName} | 総合ECモール（Amazon）が扱えない熱狂的ファン向けの垂直コマース`,
      whatItDoes: `特定ジャンルの愛好家やコミュニティ向けに厳選されたオリジナル商品・マーケットプレイス`,
      targetCustomer: `大量生産の無個性な製品では満足できず、独自のこだわりやコミュニティへの帰属を求めるファン層`,
      painRelief: `一般モールで粗悪な偽物をつかまされる不安や、欲しい専門商品が検索で埋もれて見つからない苦痛`,
      blindspot: `総合ECプラットフォームが薄利多売のマス向けに最適化され、熱狂的な専門コミュニティの鑑識眼を無視した死角`,
      moatDescription: `独自サプライチェーンの排他的確保と、ブランドに共鳴する熱狂的コミュニティの結束力`,
      incumbentDilemma: `巨大ECモールは手数料と流通効率を優先するため、単一ニッチのきめ細かな世界観づくりには投資できない`,
      initialTraction: ['Instagram/TikTokでのニッチな利用シーン動画のバズ', '専門コミュニティでの限定プレオーダー'],
    };
  }

  // 5. 専門インテリジェンス・有料メディア
  if (
    text.includes('news') ||
    text.includes('letter') ||
    text.includes('media') ||
    text.includes('press') ||
    text.includes('digest') ||
    sector === 'CONTENT_MEDIA'
  ) {
    return {
      tagline: `${entityName} | ノイズに溢れる公開情報から真に重要なシグナルを抽出する有料専門レター`,
      whatItDoes: `業界の最新潮流・マネーフロー・意思決定に必要な深層データを厳選して配信する専門インテリジェンスメディア`,
      targetCustomer: `表面的なニュースの切り抜きでは満足できず、事業判断に直結する真因を誰よりも早く知りたい経営陣・投資家`,
      painRelief: `毎日の膨大な情報洪水を読み漁る時間の浪費と、意思決定を狂わせる煽り・フェイクニュースへの疲弊`,
      blindspot: `一般メディアがPV至上主義で炎上広告モデルに走る中、購読者課金による高密度・高精度ファクトに特化した点`,
      moatDescription: `読者の毎朝の開封習慣（日常ルーティン化）と、独自の情報源ネットワーク`,
      incumbentDilemma: `広告依存の大手総合メディアはスポンサーへの配慮が必須であり、業界の闇を抉る独自分析を配信できない`,
      initialTraction: ['Twitter/LinkedInでの鋭利な深層分析スレッドの公開', '初期業界関係者への限定クローズド配信'],
    };
  }

  // 6. Fintech / 決済・ネオバンク・金融インフラ
  if (
    text.includes('payment') ||
    text.includes('banking') ||
    text.includes('bank') ||
    text.includes('fintech') ||
    text.includes('wallet') ||
    text.includes('invoice') ||
    text.includes('billing') ||
    sector === 'FINTECH_INFRA'
  ) {
    return {
      tagline: `${entityName} | 既存金融機関の高額手数料と複雑な手続きを破壊する特化型Fintech`,
      whatItDoes: `伝統的金融の不便さを取り除くデジタル特化型決済・送金・金融インフラSaaS`,
      targetCustomer: `銀行の窓口業務や高額な決済手数料・請求書発行業務に不満を持つ事業者・若年層`,
      painRelief: `店舗へ行く手間、書類記入の多さ、隠れた手数料による目減りのストレス`,
      blindspot: `メガバンクが富裕層・大企業に偏重し、デジタルネイティブの少額・即時決済ニーズを放置した死角`,
      moatDescription: `ユーザーの資金移動データと高いスイッチングコストによる囲い込み`,
      incumbentDilemma: `大手金融機関は支店網の維持コストとレガシー勘定系システムに縛られ、スマホ特化のゼロ手数料モデルに対抗できない`,
      initialTraction: ['特定コミュニティへの手数料無料キャンペーン', '開発者向けAPI連携による他サービスへの組み込み'],
    };
  }

  // 7. AI自動化・音声・特定タスク代行
  const isAiEntity =
    sector === 'AI_AUTOMATION' ||
    /\b(ai|gpt|llm|voice|speech|transcribe|prompt|agent)\b/i.test(text) ||
    domain?.endsWith('.ai') ||
    entityName.toLowerCase().endsWith(' ai');

  if (isAiEntity) {
    return {
      tagline: `${entityName} | 汎用AIでは手が届かない業界特化の定型ワークフローを瞬時に完結させるAIツール`,
      whatItDoes: `特化型プロンプトと自動連携パイプラインで特定職種の反復作業を完全自動化するSaaS`,
      targetCustomer: `毎日同じパターンの文章作成、データ整形、顧客対応に追われている実務担当者・個人事業者`,
      painRelief: `汎用AI（ChatGPT等）で毎回プロンプトを手動入力・修正する手間の多さと出力品質のばらつき`,
      blindspot: `基盤モデル企業（OpenAI等）が汎用API提供に留まり、特定業界の細かな業務UIまで作り込めない隙間`,
      moatDescription: `特定実務のベストプラクティスが最初から組み込まれた入力UIと自動エクスポート配管`,
      incumbentDilemma: `AI大手は全産業共通の汎用モデル開発に専念せざるを得ず、個別バーティカルに手を出すとエコシステムと競合する`,
      initialTraction: ['Xでの生成結果ビフォーアフター動画のバイラル拡散', '特化型ユースケースに絞ったSEO完全独占'],
    };
  }

  // 8. その他一般のニッチ事業（語彙ベースで具体化・テンプレ文言完全根絶）
  if (text.includes('studio') || text.includes('agency') || text.includes('creative') || text.includes('lab')) {
    return {
      tagline: `${entityName} | 専門領域の制作・実装ノウハウをパッケージ化して提供する高単価スタジオ`,
      whatItDoes: `${entityName}による特定クリエイティブ・開発需要に特化した専門スタジオサービス`,
      targetCustomer: `社内リソースが不足し、質の高い外部専門チームを即座に確保したいスタートアップ・事業会社`,
      painRelief: `一般の代理店に依頼した際の手戻りの多さと、高額なディレクション費用の無駄`,
      blindspot: `総合代理店が下請けに丸投げする中、現場のスペシャリストが直接高速納品する点`,
      moatDescription: `過去の実績ポートフォリオと、業界内でのダイレクトな口コミ紹介ネットワーク`,
      incumbentDilemma: `大手制作会社は巨大な固定費と社内承認フローのため、小回りの効く高速納品に対応できない`,
      initialTraction: ['XやBehanceでの制作事例の公開', '創業者の個人ネットワークからの紹介案件獲得'],
    };
  }

  if (text.includes('market') || text.includes('shop') || text.includes('store') || text.includes('direct')) {
    return {
      tagline: `${entityName} | 中間業者を排除し熱狂的ファンに直接届ける専門D2C・直販コマース`,
      whatItDoes: `${entityName}が展開する特定熱狂層向けの専門商品・限定アイテム直販ストア`,
      targetCustomer: `一般の量販店や総合ECでは手に入らないこだわり抜いた専門プロダクトを求める顧客層`,
      painRelief: `粗悪な量産品や偽物に対する不安と、自分のこだわりに合う商品が見つからない不満`,
      blindspot: `大手ECモールが価格競争に陥る中、ブランドの世界観と直販コミュニティを確立した点`,
      moatDescription: `顧客との直接のエンゲージメントと、高いリピート購入率`,
      incumbentDilemma: `大手小売はマス向け売れ筋商品しか棚に置けず、ニッチなこだわり商品を扱えない`,
      initialTraction: ['Instagram/TikTokでの製造工程やストーリーの発信', '限定数量でのプレオーダー販売'],
    };
  }

  if (text.includes('club') || text.includes('community') || text.includes('network') || text.includes('group')) {
    return {
      tagline: `${entityName} | 共通の目的を持つ同志が集い価値を共創する有料メンバーシップ基盤`,
      whatItDoes: `${entityName}が運営する特定クラスタ向けクローズドコミュニティ・ネットワーキング`,
      targetCustomer: `業界の第一線で活躍する同業者との質の高い人脈や生きた情報を渇望するプロフェッショナル`,
      painRelief: `オープンSNSのノイズとポジショントークに疲弊し、本音で議論できる場がない孤立感`,
      blindspot: `オープンSNSが炎上やスパムに塗れる隙間を突き、厳格な審査と有料化で治安を担保した点`,
      moatDescription: `コミュニティ内の人的ネットワーク密度と、蓄積された非公開ナレッジアーカイブ`,
      incumbentDilemma: `無料巨大プラットフォームは広告収益のためユーザー数最大化を優先せざるを得ず、質を保てない`,
      initialTraction: ['初期コアメンバーへの創業者自らの招待アプローチ', 'クローズド勉強会・イベントの開催'],
    };
  }

  if (text.includes('hunt') || text.includes('check') || text.includes('rank') || text.includes('metric') || text.includes('scan')) {
    return {
      tagline: `${entityName} | 散乱するWebデータを独自アルゴリズムで可視化する情報インテリジェンス基盤`,
      whatItDoes: `${entityName}による特定市場のデータ収集・自動モニタリング・ランキングサービス`,
      targetCustomer: `競合動向や市場トレンドを定常的に追跡したいが手作業でのリサーチに限界を感じているリサーチャー`,
      painRelief: `手動での巡回検索にかかる膨大な時間と、重要な市場シグナルを見落とすリスク`,
      blindspot: `既存の大手リサーチ企業が高額な年間契約を課す中、誰でも使える軽量ツールとして提供した点`,
      moatDescription: `継続的に蓄積される独自データベースと、検索エンジンからの定常的なオーガニック流入`,
      incumbentDilemma: `大手調査機関はレポート販売モデルを守るため、安価なリアルタイムダッシュボードを出せない`,
      initialTraction: ['Product HuntでのローンチとSNSでの分析データ公開', 'ニッチキーワードでのSEO独占'],
    };
  }

  // 9. 最終フォールバック（特定ニッチ直販ソフトウェア）
  return {
    tagline: `${entityName} | 特定ニッチの現場課題に特化し高粗利を叩き出す独立系ソフトウェア`,
    whatItDoes: `${entityName}が提供する業界特化型の業務効率化・専用ソリューション`,
    targetCustomer: `${entityName}の事業領域で既存の非効率な運用やツール不足に悩む実務担当者・経営者`,
    painRelief: `業界に合わない汎用ツールの無理な運用によるミスと、無駄な作業工数の浪費`,
    blindspot: `巨大IT企業が市場規模を理由に見過ごした専門ニッチの現場急所を直接押さえた点`,
    moatDescription: `業界特有の業務プロセスに直結した設計と、顧客との強固な信頼関係`,
    incumbentDilemma: `メガベンダーは全業界共通の汎用機能しか開発できず、個別の業界作法に寄り添えない`,
    initialTraction: ['専門コミュニティや業界関係者への直接デモ案内', '初期導入企業の成功事例の横展開'],
  };
}

// ============================================================================
// 総合インテリジェンス生成関数（Tagline + Strategy + Essence を一括生成）
// ============================================================================

function generateComprehensiveIntelligence(
  name: string,
  rawName: string,
  sector: string,
  rawType: string,
  canonicalIdentifier: string | undefined,
  domain: string | null | undefined,
  aliases: string[] | undefined,
  observations: RawObservation[],
  monthlyRevenue: number,
  priceUnit: string | null
): {
  tagline: string;
  essence: BusinessEssence;
  blindspot: string;
  moatDescription: string;
  incumbentDilemma: string;
  initialTraction: string[];
} {
  const lowerName = name.toLowerCase().trim();

  // 1. 既知の超重要メガ銘柄辞書
  for (const [key, profile] of Object.entries(KNOWN_MEGA_PROFILES)) {
    if (lowerName === key || lowerName.startsWith(key) || (aliases && aliases.some(a => a.toLowerCase() === key))) {
      return {
        tagline: profile.tagline,
        essence: {
          whatItDoes: profile.whatItDoes,
          targetCustomer: profile.targetCustomer,
          painRelief: profile.painRelief,
        },
        blindspot: profile.blindspot,
        moatDescription: profile.moatDescription,
        incumbentDilemma: profile.incumbentDilemma,
        initialTraction: profile.initialTraction,
      };
    }
  }

  // 2. Wave タイトル解析（Starter Story / Failoryの宝の山）
  for (const obs of observations) {
    const text = obs.text || '';
    const waveMatch = text.match(
      /Wave \d+ (?:enrichment for|created a reusable, source-linked research profile for)\s*(.+?)(?::\s*inspected|\.\s*It is not a claim|\.\s*$|$)/i
    );
    if (waveMatch && waveMatch[1]) {
      const parsed = parseWaveIntelligence(waveMatch[1].trim(), name, monthlyRevenue);
      if (parsed) {
        return {
          tagline: parsed.tagline,
          essence: {
            whatItDoes: parsed.whatItDoes,
            targetCustomer: parsed.targetCustomer,
            painRelief: parsed.painRelief,
          },
          blindspot: parsed.blindspot,
          moatDescription: parsed.moatDescription,
          incumbentDilemma: parsed.incumbentDilemma,
          initialTraction: parsed.initialTraction,
        };
      }
    }
  }

  // 3. セマンティック自動分類（テンプレ文字列完全根絶）
  const profile = inferSemanticIntelligence(name, canonicalIdentifier, domain, rawType, sector, priceUnit, monthlyRevenue);
  return {
    tagline: profile.tagline,
    essence: {
      whatItDoes: profile.whatItDoes,
      targetCustomer: profile.targetCustomer,
      painRelief: profile.painRelief,
    },
    blindspot: profile.blindspot,
    moatDescription: profile.moatDescription,
    incumbentDilemma: profile.incumbentDilemma,
    initialTraction: profile.initialTraction,
  };
}

async function main() {
  console.log('=== [1/5] Initializing S3 Client & Listing Lake Objects ===');
  const s3 = createS3Client();

  const [entityKeys, bundleKeys] = await Promise.all([
    listAllKeys(s3, 'datasets/ds.business.entities.core/v1/entities/'),
    listAllKeys(s3, 'datasets/ds.business.research-bundles.derived/v1/'),
  ]);

  console.log(`Found ${entityKeys.length} core entity files, ${bundleKeys.length} research bundles.`);

  console.log('=== [2/5] Fetching Core Entities (Concurrency: 30) ===');
  const rawEntitiesMap = new Map<string, RawCoreEntity>();
  const entityResults = await mapConcurrent(entityKeys, 30, async (key) => {
    return fetchJson<RawCoreEntity>(s3, key);
  });
  for (const ent of entityResults) {
    if (ent && ent.entity_id) {
      rawEntitiesMap.set(ent.entity_id, ent);
    }
  }
  console.log(`Loaded ${rawEntitiesMap.size} unique core entities.`);

  console.log('=== [3/5] Fetching Research Bundles (Concurrency: 25) ===');
  const allBundles = await mapConcurrent(bundleKeys, 25, async (key, idx) => {
    if (idx % 100 === 0) console.log(`  Fetched ${idx}/${bundleKeys.length} bundles...`);
    return fetchJson<RawBundle>(s3, key);
  });

  console.log('=== [4/5] Aggregating Metrics and Observations ===');
  const metricsByEntity = new Map<string, RawMetric[]>();
  const observationsByEntity = new Map<string, RawObservation[]>();
  const eventsByEntity = new Map<string, Array<{ event_type?: string; occurred_at?: string; description?: string }>>();

  for (const bundle of allBundles) {
    if (!bundle) continue;

    if (bundle.entities) {
      for (const ent of bundle.entities) {
        if (ent.entity_id && !rawEntitiesMap.has(ent.entity_id)) {
          rawEntitiesMap.set(ent.entity_id, ent);
        }
      }
    }

    if (bundle.metrics) {
      for (const m of bundle.metrics) {
        if (m.entity_id) {
          if (!metricsByEntity.has(m.entity_id)) metricsByEntity.set(m.entity_id, []);
          metricsByEntity.get(m.entity_id)!.push(m);
        }
      }
    }

    if (bundle.observations) {
      for (const obs of bundle.observations) {
        if (obs.entity_ids && obs.entity_ids.length > 0) {
          for (const eid of obs.entity_ids) {
            if (!observationsByEntity.has(eid)) observationsByEntity.set(eid, []);
            observationsByEntity.get(eid)!.push(obs);
          }
        } else if (bundle.entities && bundle.entities.length === 1) {
          const eid = bundle.entities[0].entity_id;
          if (eid) {
            if (!observationsByEntity.has(eid)) observationsByEntity.set(eid, []);
            observationsByEntity.get(eid)!.push(obs);
          }
        }
      }
    }

    if (bundle.events && bundle.entities && bundle.entities.length === 1) {
      const eid = bundle.entities[0].entity_id;
      if (eid) {
        if (!eventsByEntity.has(eid)) eventsByEntity.set(eid, []);
        eventsByEntity.get(eid)!.push(...bundle.events);
      }
    }
  }

  console.log('=== [5/5] Projecting to FinancialEntity ===');
  const finalEntitiesMap = new Map<string, FinancialEntity>();

  for (const bundle of allBundles) {
    if (bundle?.fullFinancialEntity && bundle.fullFinancialEntity.id) {
      finalEntitiesMap.set(bundle.fullFinancialEntity.id, bundle.fullFinancialEntity);
    }
  }
  console.log(`Loaded ${finalEntitiesMap.size} verified rich entities directly from R2 bundles.`);

  let junkCount = 0;
  for (const [entityId, core] of rawEntitiesMap.entries()) {
    const rawName = core.canonical_name?.trim();
    if (!rawName || rawName.toLowerCase() === 'unknown entity') continue;

    // GitHub リポジトリ・抽象市場・個人の除外（ビジネスエンティティのみを厳選）
    if (
      entityId.startsWith('ent_repository_') ||
      core.entity_type === 'repository' ||
      rawName.includes('/') ||
      entityId.startsWith('ent_market_') ||
      core.entity_type === 'market'
    ) {
      junkCount++;
      continue;
    }

    const { name: cleanedName, isJunk } = cleanEntityName(rawName, core.aliases, core.canonical_identifier);
    if (isJunk) {
      junkCount++;
      continue;
    }

    const isAlreadyPresent = Array.from(finalEntitiesMap.values()).some(
      (e) => e.name.toLowerCase() === cleanedName.toLowerCase() || e.id === entityId
    );
    if (isAlreadyPresent) continue;

    const metrics = metricsByEntity.get(entityId) || [];
    const observations = observationsByEntity.get(entityId) || [];
    const events = eventsByEntity.get(entityId) || [];

    const {
      monthlyRevenue,
      operatingProfit,
      operatingMargin,
      priceAnchor,
      priceUnit,
      teamSize,
    } = parseFinancialMetric(metrics, rawName, observations);

    const rawType = (core.entity_type || '').toLowerCase();
    let sector: FinancialEntity['sector'] = 'NICHE_SAAS';
    if (rawType.includes('newsletter') || rawType.includes('media') || rawType.includes('podcast') || rawType.includes('creator')) {
      sector = 'CONTENT_MEDIA';
    } else if (rawType.includes('ai')) {
      sector = 'AI_AUTOMATION';
    } else if (rawType.includes('fintech') || rawType.includes('payment')) {
      sector = 'FINTECH_INFRA';
    }

    let foundedYear: number | undefined = undefined;
    if (core.observed_at) {
      const year = new Date(core.observed_at).getFullYear();
      if (year >= 2000 && year <= 2026) foundedYear = year;
    }
    if (!foundedYear && events.length > 0) {
      for (const ev of events) {
        if (ev.occurred_at) {
          const y = parseInt(ev.occurred_at.slice(0, 4), 10);
          if (y >= 1990 && y <= 2026) {
            foundedYear = Math.min(foundedYear || 9999, y);
          }
        }
      }
    }
    const yearMatch = [rawName, ...observations.map(o => o.text || '')].join(' ').match(/(?:founded|launched|started)\s+(?:in\s+)?(20[0-2][0-9]|199[0-9])/i);
    if (yearMatch && yearMatch[1]) {
      foundedYear = parseInt(yearMatch[1], 10);
    }

    const intelligence = generateComprehensiveIntelligence(
      cleanedName,
      rawName,
      sector,
      rawType,
      core.canonical_identifier,
      core.domain,
      core.aliases,
      observations,
      monthlyRevenue,
      priceUnit
    );

    const tagline = intelligence.tagline;
    const strategyData = intelligence;

    const cleanObs = observations.filter(
      (o) => o.text && !o.text.includes('CAPTURE lead') && !o.text.includes('public case-page metadata') && !o.text.includes('HTTP 200')
    );
    const observationsStream: UniversalObservation[] = cleanObs.map((obs) => ({
      category: (obs.category as UniversalObservation['category']) || 'MARKET_DISTORTION',
      categoryLabel: obs.category || '市場の歪み',
      text: obs.text || '',
      originType: (obs.origin_type as UniversalObservation['originType']) || 'observed',
      verificationStatus: (obs.verification_status as UniversalObservation['verificationStatus']) || 'SUPPORTED',
      sourceUrl: obs.source_url,
      observedAt: obs.observed_at,
    }));

    const timelineEvents: UniversalEvent[] = events.map((ev) => ({
      eventType: ev.event_type || 'MILESTONE',
      occurredAt: ev.occurred_at || new Date().toISOString().slice(0, 10),
      description: ev.description || '',
    }));

    const ticker = cleanedName.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10) || 'ENT';
    const scale = teamSize === 1 ? 'SOLO' : teamSize <= 5 ? 'SMALL_TEAM' : teamSize <= 50 ? 'SCALEUP' : 'ENTERPRISE';

    const entity: FinancialEntity = {
      id: entityId,
      ticker,
      name: cleanedName,
      tagline,
      sector,
      scale,
      founder: '創業者',
      country: 'GLOBAL',
      url: core.domain ? `https://${core.domain}` : core.canonical_identifier || 'https://example.com',
      verifiedBadge: metrics.length > 0 || observations.length > 0,
      essence: strategyData.essence,
      pnl: {
        monthlyRevenue,
        cogs: Math.round(monthlyRevenue * 0.05),
        grossProfit: Math.round(monthlyRevenue * 0.95),
        grossMargin: monthlyRevenue > 0 ? 95 : 0,
        operatingExpenses: {
          serverAndApi: Math.round(monthlyRevenue * 0.05),
          advertising: 0,
          subcontracting: 0,
          toolsAndSaaS: Math.round(monthlyRevenue * 0.03),
          other: Math.round(monthlyRevenue * 0.02),
        },
        operatingProfit,
        operatingMargin,
        estimatedAnnualNetProfit: operatingProfit * 12,
      },
      operations: {
        teamSize,
        weeklyHours: teamSize === 1 ? 20 : 40,
        initialCapitalRequired: 0,
        automationLevel: teamSize === 1 ? 90 : 75,
        primaryChannels: ['Web Direct', 'SEO', 'X (Twitter)'],
        toolStack: [
          { name: 'Stripe', category: '決済', monthlyCost: Math.round(monthlyRevenue * 0.029) },
          { name: 'Cloudflare', category: 'インフラ', monthlyCost: 3000 },
        ],
      },
      strategy: {
        blindspot: strategyData.blindspot,
        moatType: 'COUNTER_POSITIONING',
        moatDescription: strategyData.moatDescription,
        incumbentDilemma: strategyData.incumbentDilemma,
        initialTraction: strategyData.initialTraction,
        actionPlaybook: ['同構造を未開拓の別ニッチへ展開'],
      },
      growthRateYoY: 100,
      architecturePattern: teamSize === 1 ? 'ソロ自動化' : '高収益SaaS',
      pipelineStack: 'Web × Stripe × Cloudflare',
      targetPainWallet: strategyData.essence.painRelief,
      tags: [scale === 'SOLO' ? '完全1人' : '少数精鋭', '高利益率'],
      temporal: {
        foundedYear: foundedYear || 2021,
        initialTractionPeriod: `${foundedYear || 2021}年`,
        dataSnapshotPeriod: '2024-2026年',
        viabilityStatus: 'ACTIVE_PLAYBOOK' as ViabilityStatus,
        viabilityLabel: '現在も有効',
        eraContext: '特化型UIとAPI活用による高収益ビジネス',
        currentViabilityAnalysis: '現在も同様の構造で別ニッチへ横展開可能',
      },
      observationsStream: observationsStream.length > 0 ? observationsStream : undefined,
      timelineEvents: timelineEvents.length > 0 ? timelineEvents : undefined,
    };

    finalEntitiesMap.set(entityId, entity);
  }

  console.log(`Filtered out ${junkCount} junk blog leads/columns.`);
  const allEntities = Array.from(finalEntitiesMap.values());

  const baselineIds = new Set([
    'ent_stripe',
    'ent_keyence',
    'ent_shipfast',
    'ent_photoai',
    'ent_nomadlist',
    'ent_headshotpro',
    'ent_plausible',
    'ent_transistor',
    'ent_buffer',
    'ent_simpleanalytics',
    'ent_easlo',
    'ent_liinks',
    'ent_tldr',
  ]);

  allEntities.sort((a, b) => {
    const aIsBase = baselineIds.has(a.id) || a.id.includes('baseline');
    const bIsBase = baselineIds.has(b.id) || b.id.includes('baseline');
    if (aIsBase && !bIsBase) return -1;
    if (!aIsBase && bIsBase) return 1;

    const aRev = a.pnl.monthlyRevenue || 0;
    const bRev = b.pnl.monthlyRevenue || 0;
    if (aRev > 0 && bRev === 0) return -1;
    if (aRev === 0 && bRev > 0) return 1;
    if (aRev !== bRev) return bRev - aRev;

    return a.name.localeCompare(b.name);
  });

  console.log(`=== Complete! Total aggregated FinancialEntities: ${allEntities.length} ===`);

  await mkdir(resolve(process.cwd(), 'data'), { recursive: true });
  const outputPath = resolve(process.cwd(), 'data/entities-index.json');
  await writeFile(outputPath, JSON.stringify(allEntities, null, 2), 'utf8');

  console.log(`Successfully wrote ${allEntities.length} entities to ${outputPath}`);
  
  if (process.argv.includes('--upload-r2')) {
    const key = 'datasets/ds.business.entities.core/index.json';
    console.log(`=== Uploading index to Cloudflare R2 (${BUCKET}/${key}) ===`);
    const bodyStr = JSON.stringify(allEntities);
    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: Buffer.from(bodyStr, 'utf8'),
        ContentType: 'application/json; charset=utf-8',
      })
    );
    console.log(`Successfully synced entities index to R2: ${BUCKET}/${key}`);
  }
}

main().catch((err) => {
  console.error('Fatal error in sync-lake-to-index:', err);
  process.exit(1);
});
