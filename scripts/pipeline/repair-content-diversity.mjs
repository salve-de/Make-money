import { readFileSync, writeFileSync, renameSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import crypto from 'node:crypto';

/**
 * Restore the catalog's descriptive fields from evidence instead of deriving
 * them from one global business template.
 *
 * This is intentionally a deterministic, evidence-preserving repair. It does
 * not invent revenue, margin, customers, tools, or acquisition results. When
 * a fact is unavailable, the generated field says so and points back to the
 * observation that was available (or to the absence of one).
 *
 * Usage:
 *   node scripts/pipeline/repair-content-diversity.mjs --check
 *   node scripts/pipeline/repair-content-diversity.mjs --write
 *   node scripts/pipeline/repair-content-diversity.mjs --write --base-revision c2c39fd
 */

const root = process.cwd();
const indexPath = path.join(root, 'data/entities-index.json');
const args = new Set(process.argv.slice(2));
const shouldWrite = args.has('--write');
const shouldCheck = args.has('--check') || !shouldWrite;
const revisionFlag = process.argv.indexOf('--base-revision');
const baseRevision = revisionFlag >= 0 ? process.argv[revisionFlag + 1] : 'c2c39fd';

const BAD_GENERATED_MARKERS = [
  '特化型課題解決ソリューション',
  '特化ソリューション',
  '現場のボトルネックを解消し',
  '少数精鋭で手堅く現金を回収する',
  '高利益率特化型SaaS',
  '高収益ビジネスモデル',
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
];

const TOPIC_RULES = [
  { test: /crossfit|emom|amrap|tabata|gym timer|workout|fitness|筋トレ|フィットネス/i, topic: 'トレーニング計測', mechanism: '運動種目のタイマー・記録' },
  { test: /browser game|online game|html5 game|casual game|ゲーム配信|ゲーム/i, topic: 'ブラウザゲーム配信', mechanism: 'ゲームの厳選・ブラウザ配信' },
  { test: /kyb|due diligence|companies house|company data|登記|コンプライアンス/i, topic: '企業情報/KYB', mechanism: '公的企業データの取得・正規化' },
  { test: /astrology|birth chart|astrologer|占星術|出生図/i, topic: 'AI占星術相談', mechanism: '出生図を会話型の解釈へ変換' },
  { test: /cashback|coupon|aliexpress|shopee|lazada|キャッシュバック|クーポン/i, topic: 'EC還元・クーポン', mechanism: '複数ECの還元情報・クーポン集約' },
  { test: /job search|job board|recruit|recruitment|hiring|求人|採用|人材/i, topic: '求人・採用', mechanism: '求人情報と候補者の検索・接続' },
  { test: /newsletter|substack|medium|blog|publishing|メルマガ|ニュースレター|出版/i, topic: '出版・ニュースレター', mechanism: '記事配信と購読者接点' },
  { test: /pdf|document|ocr|contract|論文|文書|書類/i, topic: 'PDF・文書処理', mechanism: '文書の検索・抽出・要約' },
  { test: /video|subtitle|caption|screen recorder|tiktok|reels|動画|字幕|録画/i, topic: '動画制作', mechanism: '録画・字幕・編集の自動化' },
  { test: /audio|podcast|voice|transcri|音声|議事録|録音/i, topic: '音声処理', mechanism: '音声の文字起こし・要約' },
  { test: /email|outreach|mailbox|send.*mail|営業メール|メール配信/i, topic: '営業メール', mechanism: '送信・到達・返信の管理' },
  { test: /sql|database|query|データベース|クエリ/i, topic: 'データ・SQL', mechanism: 'スキーマを踏まえたデータ検索' },
  { test: /api|sdk|developer|github|open source|オープンソース|開発者/i, topic: '開発者向け基盤', mechanism: '開発者向けAPI・コード接点' },
  { test: /design|ui|ux|figma|illustration|デザイン|イラスト/i, topic: 'デザイン制作', mechanism: 'UI・ビジュアル制作の部品化' },
  { test: /real estate|property|不動産|賃貸|物件/i, topic: '不動産情報', mechanism: '物件情報の探索・仲介接点' },
  { test: /amazon|ecommerce|e-commerce|shopify|retail|小売|物販|通販/i, topic: 'EC・物販', mechanism: '商品情報と販売導線の接続' },
  { test: /travel|flight|hotel|旅行|航空|ホテル/i, topic: '旅行・航空情報', mechanism: '旅行商品の検索・予約接点' },
  { test: /finance|bank|payment|fintech|決済|金融|投資/i, topic: '金融・決済', mechanism: '金融データ・決済接続' },
];

const CUSTOMER_BY_TOPIC = {
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

function clean(value) {
  return decodeHtml(value)
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
  return BAD_GENERATED_MARKERS.some((marker) => text.includes(marker));
}

function isConcrete(value) {
  const text = textOf(value);
  if (text.length < 18 || hasGeneratedMarker(text)) return false;
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

function observationStrings(entity) {
  return uniqueStrings([
    ...(Array.isArray(entity?.observations) ? entity.observations : []),
    ...(Array.isArray(entity?.observationsStream) ? entity.observationsStream.map((item) => item?.text) : []),
  ]);
}

function mergedObservations(current, base) {
  return uniqueStrings([...observationStrings(base), ...observationStrings(current)]);
}

function extractSource(entity, base) {
  const lines = mergedObservations(entity, base);
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
    if (/^【/.test(normalized) && !hasGeneratedMarker(normalized) && normalized.length > 24) explicitFacts.push(normalized);
  }

  const description = [...indieDescriptions, ...ebizSummaries]
    .sort((a, b) => b.length - a.length)[0] || '';
  const title = uniqueStrings(titles)[0] || '';
  // Prefer the old concise product description. Do not use a generated
  // blindspot/tagline as the "source" merely because it is longer.
  const fallbackCandidates = [
    base?.essence?.whatItDoes,
    base?.essence?.targetCustomer,
    base?.essence?.painRelief,
    ...explicitFacts,
    base?.pipelineStack,
    title,
    base?.tagline,
  ].filter((value) => isConcrete(value));
  const fallback = fallbackCandidates[0] || '';
  const descriptor = clip(description || title || fallback || `公開説明未取得。記録名: ${entity.name}`, 230);
  const sourceLabel = description
    ? (indieDescriptions.length > 0 ? 'Indie Hackers公開説明' : 'eBiz Facts記事要約')
    : title
      ? '公式ページタイトル'
      : fallback
        ? '台帳内の既存記録'
        : '公開説明未取得';
  const financial = financialLines.sort((a, b) => b.length - a.length)[0] || '';
  const url = clean(entity.url || base?.url || '');
  return { lines, description, title, fallback, descriptor, sourceLabel, financial, url, explicitFacts };
}

function selectTopic(entity, source, base) {
  const corpus = [entity.name, source.descriptor, source.title, source.fallback, base?.pipelineStack, base?.architecturePattern]
    .filter(Boolean)
    .join(' ');
  const found = TOPIC_RULES.find((rule) => rule.test.test(corpus));
  if (found) return found;
  const candidate = clean(source.title || source.fallback || entity.name);
  return { topic: clip(candidate, 48), mechanism: '提供方式・実装詳細は公開情報で未確認' };
}

function concreteCandidate(current, base, pathName) {
  const candidates = [get(base, pathName), get(current, pathName)];
  return candidates.map(textOf).find(isConcrete) || '';
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
  if (source.financial) return `財務観測: ${clip(source.financial, 180)}（表示値と利益は分離）`;
  const status = entity?.pnl?.financialStatus || base?.pnl?.financialStatus;
  if (status === 'VERIFIED') return '財務観測: 台帳の財務ステータスはVERIFIED。金額の詳細はP&L欄と出典を照合する。';
  if (status === 'POST_MORTEM') return '財務観測: 失敗・撤退側の記録。死因と数値の根拠をP&L欄で照合する。';
  return '財務観測: 売上・原価・利益の独立確認は未取得。';
}

function customerText(entity, base, source, topic) {
  const existing = concreteCandidate(entity, base, 'essence.targetCustomer');
  if (!source.description && !source.title && existing) return clip(existing, 230);
  const customer = CUSTOMER_BY_TOPIC[topic.topic] || `「${topic.topic}」を必要とする利用者（顧客属性の詳細は未確認）`;
  return `対象の推定範囲: ${customer}。個別顧客・支払者の実測は未確認。`;
}

function painText(entity, base, source, topic) {
  const existing = concreteCandidate(entity, base, 'essence.painRelief');
  if (!source.description && !source.title && existing) return clip(existing, 230);
  const pain = PAIN_BY_TOPIC[topic.topic] || `「${topic.topic}」を探す・使う際の摩擦（詳細は公開説明から未確認）`;
  return `確認できた課題候補: ${pain}。実際の削減額・効果は未確認。`;
}

function coreText(entity, base, source) {
  const existing = concreteCandidate(entity, base, 'essence.whatItDoes');
  if (!source.description && !source.title && existing) return clip(existing, 260);
  if (source.description) return `公開説明に記載された提供内容: 「${clip(source.description, 235)}」。実装詳細と収益性はこの記述だけでは確認できない。`;
  if (source.title) return `公式ページタイトルが示す提供物: 「${clip(source.title, 190)}」。機能範囲・顧客・収益性は未確認。`;
  if (existing) return `台帳内で確認できる提供内容: ${clip(existing, 230)}。出典の独立性は要照合。`;
  return `公開情報で固有の提供内容は未確認。記録名「${entity.name}」の事業実体を追加調査する。`;
}

function blindspotText(entity, base, source, topic, pain) {
  const existing = concreteCandidate(entity, base, 'strategy.blindspot');
  if (!source.description && !source.title && existing) return clip(existing, 270);
  return `公開説明が示す未充足: ${clip(pain, 180)}。${topic.topic}について大手との比較優位・規約の隙間は未確認。根拠: ${clip(source.descriptor, 150)}`;
}

function moatText(entity, base, source, topic, mechanism) {
  const existing = concreteCandidate(entity, base, 'strategy.moatDescription');
  if (!source.description && !source.title && existing) return clip(existing, 270);
  return `確認できた防御要因: ${mechanism}。継続率、独自データ、解約障壁、供給制約の有無は未確認。観測: ${clip(source.descriptor, 150)}`;
}

function secretText(source, topic, mechanism) {
  return `観測: ${clip(source.descriptor, 190)}。推論としての検証ポイントは、${topic.topic}で${mechanism}が実際の支払理由になっているか、そして未公開の原価がどこへ流れるかである。これは確定事実ではない。`;
}

function initialTraction(entity, base, source, note) {
  const initial = get(base, 'strategy.initialTraction');
  const currentInitial = get(entity, 'strategy.initialTraction');
  const sourceLine = source.description || source.title;
  if (!sourceLine) {
    const existing = [initial, currentInitial]
      .find((value) => Array.isArray(value) && value.some((item) => isConcrete(item) && !/初期見込み客|創業者自らがターゲット|高いリピート率|ニッチなコミュニティ/.test(item)));
    if (existing) return existing.map((item) => clip(item, 220));
  }
  const items = [
    sourceLine
      ? `公開ログ: ${clip(sourceLine, 220)}`
      : `初動の公開ログは未取得。記録名「${entity.name}」とID ${tailOf(entity)} の追加照合が必要。`,
    source.financial
      ? `掲載値: ${clip(source.financial, 180)}。売上表示であり、利益・手残りとは別。`
      : `初動の顧客数・獲得経路・継続率は未確認。${clip(note, 130)}`,
  ];
  return uniqueStrings(items);
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
  return patterns[hashNumber(entity.id) % patterns.length];
}

function coldTemplate(entity, source, topic, customer, pain) {
  return `「${topic.topic}」について、公開説明の「${clip(source.descriptor, 120)}」が実際に誰のどんな負担を減らしたのか確認したいです。${clip(customer, 92)}にとっての支払条件、利用頻度、乗り換え時の手間のうち、共有できる範囲を教えてください。${clip(pain, 78)}`;
}

function buildLoot(entity, base, output, source, topic, mechanism, note) {
  const existing = entity.lootBlueprint || base?.lootBlueprint || {};
  const target = `対象財布: ${output.essence.targetCustomer} 課題: ${output.essence.painRelief}`;
  const flaw = `構造上の未確認点: ${output.strategy.blindspot} 事例固有の根拠: ${clip(source.descriptor, 145)}`;
  const entry = `確認できた入口: ${clip(source.descriptor, 210)}。初動の再現性・権利・集客実績は未確認。`;
  const toll = `関所候補: ${topic.topic}で${mechanism}を提供する導線。根拠: ${clip(source.descriptor, 130)}。課金方式、継続率、解約障壁、原価は未確認。${note}`;
  const checklist = actionPlaybook(entity, source, topic, mechanism, note).map((item, index) => `${index + 1}. ${item}`);
  return {
    ...existing,
    targetPrey: target,
    structuralFlaw: flaw,
    stealthEntry: entry,
    tollGateSetup: toll,
    reproducibilityScore: Number.isFinite(existing.reproducibilityScore) ? existing.reproducibilityScore : 0,
    moatDurabilityScore: Number.isFinite(existing.moatDurabilityScore) ? existing.moatDurabilityScore : 0,
    capitalEfficiencyScore: Number.isFinite(existing.capitalEfficiencyScore) ? existing.capitalEfficiencyScore : 0,
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
  const ids = [...current, ...old].map((card) => card?.id).filter((id) => typeof id === 'string' && id.length > 0);
  const result = uniqueStrings([...bindings, ...ids]);
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

function mergeObservationArrays(entity, base) {
  const merged = mergedObservations(entity, base);
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

function metaFromEvidence(entity, base, output, source, topic, mechanism, note) {
  const existing = base?.meta || entity.meta;
  const isUsefulMeta = existing && Object.values(existing).every((section) =>
    section && typeof section === 'object' && Object.values(section).every((value) => isConcrete(value)),
  );
  if (isUsefulMeta && !hasGeneratedMarker(existing)) return existing;
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

function exposureFromEvidence(entity, base, output, source, topic, mechanism, note) {
  const existing = base?.exposureAudit || entity.exposureAudit;
  if (existing && Object.values(existing).every((value) => isConcrete(value)) && !hasGeneratedMarker(existing)) return existing;
  const anchor = clip(source.descriptor, 160);
  return {
    guerrillaTraction: `初動について確認できた公開記録: ${anchor}。獲得人数・経路・再現性は未確認。`,
    platformGlitch: `${topic.topic}に関するプラットフォーム規約・配信上の隙間は未確認。観測された提供経路は${mechanism}。`,
    pivotSnapshot: `ピボット履歴は公開情報から未確認。現時点での観測対象は「${anchor}」であり、過去の失敗を推定しない。`,
    hiddenStackCost: `技術スタック・外部API・広告費・人件費の内訳は未確認。${note}`,
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
    candidate = `${result} 〔記録ID:${tailOf(entity)}${count > 1 ? `-${count}` : ''}〕`;
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

const beforeStat = statSync(indexPath);
const currentEntities = JSON.parse(readFileSync(indexPath, 'utf8'));
if (!Array.isArray(currentEntities) || currentEntities.length === 0) throw new Error('entities-index.json is not a non-empty array');
const baseMap = loadBaseSnapshot();
const used = new Map();
const repaired = [];

for (const current of currentEntities) {
  const base = baseMap.get(current.id) || {};
  const entity = structuredClone(current);
  mergeObservationArrays(entity, base);
  const source = extractSource(entity, base);
  const topic = selectTopic(entity, source, base);
  const token = sourceToken(source, entity);
  const customer = customerText(entity, base, source, topic);
  const pain = painText(entity, base, source, topic);
  const core = coreText(entity, base, source);
  const note = financialNote(entity, base, source);
  const existingStack = concreteCandidate(entity, base, 'pipelineStack');
  const mechanism = topic.mechanism;
  const architecture = source.description || source.title
    ? `${token}｜${topic.topic}｜${mechanism}`
    : (concreteCandidate(entity, base, 'architecturePattern') || `${token}｜${topic.topic}`);
  const pipeline = existingStack && !/固有スタック|専用Web基盤|Next\.js\/モダンWeb基盤|公開レコードでは|未確認|UNKNOWN/i.test(existingStack)
    ? `台帳記載の構成（要照合）: ${clip(existingStack, 210)}`
    : `実装方式: 公開情報では未確認。確認できた提供経路は${topic.topic} / ${mechanism}。根拠: ${clip(source.descriptor, 135)}`;
  const blindspot = blindspotText(entity, base, source, topic, pain);
  const moat = moatText(entity, base, source, topic, mechanism);
  const secret = secretText(source, topic, mechanism);
  const initial = initialTraction(entity, base, source, note);
  const actions = actionPlaybook(entity, source, topic, mechanism, note);
  const existingIncumbent = concreteCandidate(entity, base, 'strategy.incumbentDilemma');
  const incumbent = !source.description && !source.title && existingIncumbent
    ? clip(existingIncumbent, 250)
    : `大手との参入条件・共食い構造は未確認。${topic.topic}で確認できた記録: ${clip(source.descriptor, 165)}`;

  const output = {
    ...entity,
    tagline: ensureUnique(
      [
        `「${topic.topic}」の記録: ${clip(source.descriptor, 205)}。${note}`,
        `公開説明「${clip(source.descriptor, 205)}」から読む${topic.topic}。${note}`,
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
      coldOutreachTemplate: ensureUnique(coldTemplate(entity, source, topic, customer, pain), 'strategy.coldOutreachTemplate', used, entity),
    },
  };

  output.lootBlueprint = buildLoot(entity, base, output, source, topic, mechanism, note);
  for (const lootField of ['targetPrey', 'structuralFlaw', 'stealthEntry', 'tollGateSetup']) {
    output.lootBlueprint[lootField] = ensureUnique(output.lootBlueprint[lootField], `lootBlueprint.${lootField}`, used, entity);
  }
  output.evidenceCards = buildEvidenceCards(entity, base, output, source, topic, mechanism, note);
  output.meta = metaFromEvidence(entity, base, output, source, topic, mechanism, note);
  output.exposureAudit = exposureFromEvidence(entity, base, output, source, topic, mechanism, note);

  function sanitizeDisclaimers(obj) {
    if (typeof obj === 'string') {
      return obj
        .replace(/Indie Hackers表示/g, 'Indie Hackers報告値')
        .replace(/報告値・利益ではない/g, '第三者報告値（利益未確認）')
        .replace(/掲載タグラインが示す課題/g, '公開タグラインの課題')
        .replace(/防御要因は未確認/g, '防御要因は公開情報では未確認');
    }
    if (Array.isArray(obj)) {
      return obj.map(sanitizeDisclaimers);
    }
    if (obj && typeof obj === 'object') {
      const res = {};
      for (const k of Object.keys(obj)) {
        res[k] = sanitizeDisclaimers(obj[k]);
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
