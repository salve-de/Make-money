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

function extractCleanTagline(
  entityName: string,
  observations: RawObservation[],
  priceUnit: string | null,
  sector: string
): string {
  const logPattern = /(?:CAPTURE\s+lead|public\s+case-page\s+metadata|HTTP\s+200|Wave\s+\d+|requires\s+the\s+authorized|reusable,\s+source-linked)/i;

  for (const obs of observations) {
    if (!obs.text) continue;
    const text = obs.text.trim();
    if (logPattern.test(text)) continue;

    if (text.includes('taboo_customer_pain_wtp=')) {
      const match = text.match(/taboo_customer_pain_wtp=([^;.]+)/);
      if (match && match[1].trim().length > 5) {
        return `${entityName}: ${match[1].trim()}`;
      }
    }
    if (text.includes('Customer pain signal:')) {
      const match = text.match(/Customer pain signal:\s*([^;.]+)/i);
      if (match && match[1].trim().length > 5) {
        return `${entityName}: ${match[1].trim()}`;
      }
    }
    if (text.includes('Early-customer signal:')) {
      const match = text.match(/Early-customer signal:\s*([^;.]+)/i);
      if (match && match[1].trim().length > 5) {
        return `${entityName}: ${match[1].trim()}`;
      }
    }
    if (text.length >= 15 && text.length <= 120 && !text.includes('{') && !text.includes('=')) {
      return text.replace(/^[A-Za-z0-9\s/.:-]+:\s*/, '');
    }
  }

  if (
    priceUnit &&
    !['currency', 'percent', 'unit', 'count', 'usd', 'jpy', 'eur', 'gbp'].includes(priceUnit.toLowerCase()) &&
    !priceUnit.toLowerCase().includes('percent')
  ) {
    return `${entityName} | 価格帯: ${priceUnit}。特定ニッチの業務自動化と直販インフラ`;
  }
  return `${entityName} | 競合の死角を突く高収益${sector}ビジネスモデル`;
}

function generateEssenceAndStrategy(
  name: string,
  sector: string,
  rawType: string,
  observations: RawObservation[],
  monthlyRevenue: number
): {
  essence: BusinessEssence;
  blindspot: string;
  moatDescription: string;
  incumbentDilemma: string;
  initialTraction: string[];
} {
  let painSignal = '';
  let earlyAcqSignal = '';
  let lockinSignal = '';

  for (const obs of observations) {
    const t = obs.text || '';
    if (t.includes('taboo_customer_pain_wtp=')) {
      painSignal = t.split('taboo_customer_pain_wtp=')[1]?.split(';')[0]?.trim() || '';
    }
    if (t.includes('Customer pain signal:')) {
      painSignal = t.split('Customer pain signal:')[1]?.split(';')[0]?.trim() || '';
    }
    if (t.includes('Early-customer signal:') || t.includes('taboo_early_customer_acquisition=')) {
      earlyAcqSignal = t.includes('Early-customer signal:')
        ? t.split('Early-customer signal:')[1]?.split(';')[0]?.trim() || ''
        : t.split('taboo_early_customer_acquisition=')[1]?.split(';')[0]?.trim() || '';
    }
    if (t.includes('dark_data_workflow_lockin=') || t.includes('Data/workflow lock-in:')) {
      lockinSignal = t.includes('dark_data_workflow_lockin=')
        ? t.split('dark_data_workflow_lockin=')[1]?.split(';')[0]?.trim() || ''
        : t.split('Data/workflow lock-in:')[1]?.split(';')[0]?.trim() || '';
    }
  }

  const lowerName = name.toLowerCase();

  let whatItDoes = `${name}の特化型業務自動化・支援プラットフォーム`;
  let targetCustomer = '特定業界の事業者・専門職・個人クリエイター';
  let painRelief = painSignal || '汎用ツールのオーバースペックと月額高額課金の負担';
  let blindspot = '総合大手が低単価・特化ニーズを無視してエンタープライズへ向かう死角';
  let moatDescription = lockinSignal || '初期テンプレート・既存ワークフローの蓄積による不可逆な移行障壁';
  let incumbentDilemma = '既存の高額プランを毀損するため、同様の特化型シンプル版を安価に提供できないカニバリズム';
  let initialTraction = [
    earlyAcqSignal || 'ニッチコミュニティ（Reddit / X / Product Hunt）での創業者直接アプローチ',
    '無料ツールの先行配布による見込み客リストの囲い込み',
  ];

  if (lowerName === 'carrd') {
    whatItDoes = '1ページ完結型レスポンシブWebサイトの超軽量ビルダー';
    targetCustomer = 'ポートフォリオや簡易LPを今すぐ格安で公開したいクリエイター';
    painRelief = 'WebflowやWordPressの過剰な機能・高い学習コスト・年額の重さ';
    blindspot = 'Web制作ツール大手が大規模CMSへ進化し、1枚LPの極小ニーズを捨て去った死角';
    moatDescription = 'HTML5 UP等で築いた数百万人の無料テンプレート利用者の自然流入基盤';
    incumbentDilemma = 'Squarespace等は月額$16〜の価格帯を守るため、$19/年の破壊的プランを出せない';
    initialTraction = ['HTML5 UPで10年間無料配布していたテンプレートの利用者に新ツールを告知', 'Twitterでの口コミ拡散'];
  } else if (lowerName === 'beehiiv') {
    whatItDoes = 'ニュースレター事業者のための収益化・紹介機能一体型SaaS';
    targetCustomer = '自前のメディアでマネタイズを目指すクリエイター・パブリッシャー';
    painRelief = 'Substackの手数料搾取やMailchimpの機能分散・高単価課金';
    blindspot = 'メルマガ配信ツールが単なるメール送信機に留まり、メディアのマネタイズ支援を放置した点';
    moatDescription = '配信者同士が読者を紹介し合う推薦ネットワーク（Recommendations）の引力場';
    incumbentDilemma = '既存の巨大配信スタンドは純粋な到達率保証インフラであり、広告ネットワーク化に舵を切りにくい';
    initialTraction = ['Morning Brew初期チームによる実績アピール', '他ツールからのワンクリック移行機能'];
  } else if (lowerName === 'upvoty') {
    whatItDoes = 'ユーザーからの機能要望・フィードバックを可視化・管理するSaaS';
    targetCustomer = '顧客の声が散乱してロードマップ策定に悩むSaaS創業者・PM';
    painRelief = 'スプレッドシートやチャットで要望が埋もれ、開発優先順位を見失う混沌';
    blindspot = 'UserVoice等のエンタープライズツールが月数十万円と高額すぎ、中小SaaSが手を出せない点';
    moatDescription = 'ユーザーの顧客コミュニティが要望を投票し続けることによるワークフロー固定化';
    incumbentDilemma = '既存高額ベンダーは大手企業向けに営業リソースを割いており、月数千円のセルフサーブ市場を無視';
    initialTraction = ['自身のSaaSネットワークでのコールドローンチ', 'Product Huntでの公開と初期ユーザー獲得'];
  } else if (lowerName === 'byword') {
    whatItDoes = 'SEO特化型AI長文記事一括生成エンジン';
    targetCustomer = 'オーガニック検索トラフィックを急速に伸ばしたいアフィリエイター・マーケター';
    painRelief = 'ライター外注にかかる膨大な費用と納期の遅れ';
    blindspot = 'ChatGPT等の汎用AIは1記事ずつの対話生成であり、数百記事のバッチ処理とWordPress直結ができなかった点';
    moatDescription = 'SEOキーワード検索意図を満たすプロンプトプリセットとCMS自動連携';
    incumbentDilemma = '大手AI企業は汎用アシスタントを目指しており、アフィリエイト・SEO直結の特化UIを作れない';
    initialTraction = ['TwitterでのSEO急上昇グラフの公開によるバズ獲得', 'SEOコミュニティへの直接告知'];
  } else if (rawType.includes('newsletter') || sector.includes('MEDIA')) {
    whatItDoes = '業界特化型キュレーション・専門インテリジェンス配信メディア';
    targetCustomer = '意思決定を急ぐ経営者・投資家・業界エグゼクティブ';
    painRelief = '情報過多の中で本当に重要なシグナルを見落とす恐怖';
    blindspot = '既存メディアがPV至上主義の煽り記事に偏向し、実務直結の深層データを扱えない死角';
    moatDescription = '読者の開封習慣（朝のルーティン化）と高精度な独自配信リストの独占';
    incumbentDilemma = '大衆向け広告モデルからニッチ高単価購読モデルへシフトできない組織的慣性';
    initialTraction = ['Twitterでの長文解説スレッドによる認知獲得', '既存読者からの紹介ループ（リファラル特典）'];
  } else if (rawType.includes('ai') || name.toLowerCase().includes('ai')) {
    whatItDoes = '生成AIパイプラインを活用した特定ワークフロー代行SaaS';
    targetCustomer = 'コンテンツ制作・マーケティング・業務自動化を急ぐスモールビジネス';
    painRelief = '汎用プロンプトの試行錯誤にかかる膨大な時間と低品質な出力の苦痛';
    blindspot = '汎用LLM大手（OpenAI等）が個別の業務UIや業界特化テンプレまで作り込めない隙間';
    moatDescription = '特定業務に特化した入力・出力プリセットと継続改善パイプライン';
    incumbentDilemma = 'プラットフォーム側はAPI提供に徹する必要があり、個別バーティカルに手を出すとエコシステムと競合する';
    initialTraction = ['SEOでの特化キーワード独占', 'Xでの生成結果ビフォーアフター動画のバズ拡散'];
  }

  return {
    essence: { whatItDoes, targetCustomer, painRelief },
    blindspot,
    moatDescription,
    incumbentDilemma,
    initialTraction,
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

    const tagline = extractCleanTagline(cleanedName, observations, priceUnit, sector);

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

    const strategyData = generateEssenceAndStrategy(cleanedName, sector, rawType, observations, monthlyRevenue);

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
