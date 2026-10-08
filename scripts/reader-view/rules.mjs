/**
 * 画面の自動監査の規則（見る人目線）。実際に描いた画面の文（e2e/support/reader-view-collect.ts が集める ScreenCase）に掛ける純粋関数。
 * 事例データ側の検査（pnpm case-text:verify）と二重にしないため、「描いた後に初めて分かること」だけを見る:
 * 部品が組み合わさった結果の重複、出典の並べ方、印の残り、帯の項目名と中身の食い違い、画像が出たか。
 * 規則の元: docs/OWNER_INTENT.md、docs/CASE_TEXT_STANDARD.md、docs/COLLECT_TO_UI.md、src/shared/origin-tag.ts、data/reader-language.json。
 * 誤検出は scripts/reader-view/rules.test.mjs の「通すべき文」で押さえる。
 */

/** @typedef {import('../../e2e/support/reader-view-collect').ScreenCase} ScreenCase */
/** @typedef {{ id: string; where: string; rule: string; text: string }} Hit */

export const RULES = {
  ORIGIN: 'a.出どころの印',
  MARK: 'a.推定以外の印',
  ROW_LINK: 'b.出典は章末の番号',
  SAME_SOURCE: 'b.同じ出典を章ごとに繰り返す',
  PRICE_EXTRA: 'c.料金の付帯条件',
  PRICE_LONG: 'c.料金が長い',
  OVERVIEW_SCALE: 'd.概要の先頭が規模でない',
  OVERVIEW_PRICE: 'd.概要に料金が2行以上',
  DUP_NUMBER: 'e.同じ数字が2か所以上',
  DUP_PHRASE: 'e.同じ話が2か所以上',
  OVERVIEW_SALES: 'd.概要に売り方の並べ立て',
  JARGON: 'f.説明のない略語',
  YEN: 'g.外貨に円換算が無い',
  LABEL_MISMATCH: 'h.項目名と中身の数字の種類が違う',
  NO_IMAGE: 'i.画像が出ていない',
};

// ---- a. 出どころの印 ----------------------------------------------------------------
// 括弧の中の「出どころの種類」。印そのもの（本人・公式…）と、出どころの媒体の呼び名（保存ページ・インタビュー・ブログ…）。
// 「（約1.5万円）」「（2009年3月）」「（年払い）」「（SSO）」のような中身の補足は通す。
const ORIGIN_WORDS = [
  '本人', '公式', '第三者', '記事', '提出書類', '報道', '保存ページ', 'インタビュー', 'ブログ', '寄稿', '投稿', '発言', '発表',
  '導入事例', '声のページ', '選別あり', '創業者の見方', 'ポッドキャスト', '対談', '取材', '魚拓', 'プレスリリース',
  'Hacker News', 'HN', 'Indie Hackers', 'TechCrunch', 'Goodreads', 'Reddit', 'Upstarts', 'Warrior Forum', 'Cool Tools', 'Product Hunt',
];
const ORIGIN_IN_PAREN = new RegExp(`[（(]([^（）()]*(?:${ORIGIN_WORDS.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})[^（）()]*)[）)]`, 'g');
// 印が単独で1行・1マスに出ているもの（帯や行の印のラベル）。「推定」だけは出してよい。
const MARK_LINE = /^(推測|推論|本人申告|本人|公式|第三者|記事|提出書類|事実)$/;

/** @param {string} text @returns {string[]} */
export function originTags(text) {
  return [...text.matchAll(ORIGIN_IN_PAREN)].map((m) => m[0]);
}

// ---- 数字 ------------------------------------------------------------------------
const toHalf = (s) => s.replace(/[０-９．，％]/g, (c) => (c === '．' ? '.' : c === '，' ? ',' : c === '％' ? '%' : String.fromCharCode(c.charCodeAt(0) - 0xfee0)));
const SCALE = { 億: 1e8, 万: 1e4, 千: 1e3, k: 1e3, K: 1e3, M: 1e6, B: 1e9 };
// 数え方の単位ごとに同じ値かを見る。円は外貨の円換算（括弧の概算）で必ず重なるので数えない（元の外貨の側で数える）。
const UNIT_CLASS = [
  [/^(ドル|米ドル)$/, 'ドル'], [/^ルピー$/, 'ルピー'], [/^ユーロ$/, 'ユーロ'], [/^ポンド$/, 'ポンド'],
  [/^(人|名)$/, '人'], [/^社$/, '社'], [/^件$/, '件'], [/^%$/, '%'], [/^(回|本|冊|章|曲|個|台|店)$/, '個'],
];
const NUMBER = /(\$\s?)?([0-9][0-9,]*(?:\.[0-9]+)?)\s*(億|万|千|[kKMB](?![A-Za-z]))?\s*(米ドル|ドル|ルピー|ユーロ|ポンド|人|名|社|件|%|回|本|冊|章|曲|個|台|店)?/g;

/**
 * 文の中の「単位つきの数字」。同じ値かどうかの鍵（値＋単位の種類）と、元の書き方。
 * 年号・1桁の数・単位の無い数・円は数えない（円は外貨の円換算と必ず重なる）。
 * @param {string} text @returns {Array<{ key: string; raw: string }>}
 */
export function unitNumbers(text) {
  /** @type {Array<{ key: string; raw: string }>} */
  const out = [];
  // 円換算の括弧（「（約1.5万円）」）は、元の外貨と同じ数字なので外す
  const half = toHalf(text).replace(/[（(]約[^（）()]*円[^（）()]*[）)]/g, '');
  for (const m of half.matchAll(NUMBER)) {
    const unit = m[1] ? 'ドル' : m[4];
    if (!unit) continue;
    const cls = UNIT_CLASS.find(([re]) => re.test(unit))?.[1];
    if (!cls) continue;
    const value = Number(m[2].replace(/,/g, '')) * (m[3] ? SCALE[m[3]] : 1);
    if (!Number.isFinite(value) || (value < 10 && cls !== '%')) continue;
    if (cls === '%' && (value === 100 || value < 1)) continue;
    out.push({ key: `${value}${cls}`, raw: m[0].trim() });
  }
  return out;
}

// ---- g. 外貨 ----------------------------------------------------------------------
const FOREIGN = /(\$\s?[0-9]|[0-9][0-9,.]*\s*(?:億|万|千|[kKMB])?\s*(?:米ドル|ドル|ルピー|ユーロ|ポンド)|(?:USD|INR|EUR|GBP)\s?[0-9])/;
/** 外貨の金額があるのに、同じ文（句点まで）に円が無い文 @param {string} text @returns {string[]} */
export function missingYen(text) {
  // 0ドルは換算しても0円なので、円を添えなくてよい
  const ZERO = /(?<![0-9.,])0(?:\.0+)?\s*(?:米ドル|ドル|ルピー|ユーロ|ポンド)|\$\s?0(?![0-9.,])/g;
  return text.split(/(?<=[。\n])/).map((s) => s.trim()).filter((s) => FOREIGN.test(s.replace(ZERO, '')) && !/円/.test(s));
}

// ---- c. 料金 ----------------------------------------------------------------------
const PRICE_EXTRA = /(無料試用|無料トライアル|無料体験|試用期間|お試し|トライアル|カード(?:登録)?不要|クレジットカード|返金|税込|税抜|税別|消費税|GST|VAT|別料金|別途|送料|手数料込|(?:が|は)(?:無い|ない|付かない|含まれない|含まない|つかない)|対象外|存在せず|存在しない)/;
/** 料金の欄で、読む人が知りたい事（いくらで何がどれだけ使えるか）以外の付帯条件 @param {string} text */
export function priceExtras(text) {
  return [...new Set([...text.matchAll(new RegExp(PRICE_EXTRA, 'g'))].map((m) => m[0]))];
}
const PRICE_MAX = 70;
const PHRASE_LEN = 14;

// ---- d. 概要 ----------------------------------------------------------------------
const SCALE_WORD = /[0-9０-９][0-9０-９,，.．]*\s*(億|万|千)?\s*(人|名|社|件|円|ドル|ルピー|ユーロ|ポンド|ユーザー|会員|顧客|店|冊|部)/;
const PRICE_WORD = /(月額|年額|月[0-9０-９約]|年[0-9０-９約]|\/月|プラン|料金|買い切り|価格)/;

// ---- f. 略語 ----------------------------------------------------------------------
// 読む人が説明なしで分かる略語。これ以外の英大文字の略語は、すぐ後ろの括弧で説明していなければ落とす。
export const KNOWN_ACRONYMS = new Set(['AI', 'PDF', 'URL', 'PC', 'SNS', 'IT', 'CEO', 'CTO', 'TV', 'DVD', 'CD', 'USB', 'OK', 'Q&A', 'FAQ', 'EC', 'iOS', 'PR', 'DM', 'ID', 'QR', 'GPS', 'LINE', 'BtoB', 'UI']);
const ACRONYM = /(?<![A-Za-z0-9])([A-Z]{2,6})(?![A-Za-z0-9])/g;

// ---- h. 項目名と中身 ----------------------------------------------------------------
// 項目名が問う数字の種類と、中身の数字の種類の対応表。機械で分かる食い違い（年商の欄に月の売上だけ、など）だけを見る。
/** @type {Array<{ label: RegExp; must?: RegExp; mustNot?: RegExp; why: string }>} */
export const LABEL_TABLE = [
  { label: /年商|年間の?売上|年の売上/, mustNot: /^(?!.*(年|1年|年間)).*(月の?売上|月商|毎月|\/月|月[0-9０-９約])/s, why: '年商の欄に、年の数字が無く月の数字だけ' },
  { label: /月商|月の売上|毎月の売上/, mustNot: /^(?!.*月).*(年商|年間|\/年)/s, why: '月商の欄に、月の数字が無く年の数字だけ' },
  { label: /社員|従業員|人数|チームの?規模/, must: /[0-9０-９一二三四五六七八九十]+\s*(人|名)|1人|一人|ひとり/, why: '人数の欄に人数が無い' },
  { label: /顧客数|利用者数|会員数|ユーザー数/, must: /[0-9０-９]/, why: '数の欄に数字が無い' },
  { label: /^料金$/, must: /(円|ドル|ルピー|ユーロ|ポンド|無料|\$)/, why: '料金の欄に金額が無い' },
  { label: /年商|月商|売上/, mustNot: /(直接の支払い|売上の一部|の一部|だけ|のみ|[0-9０-９,]+\s*件)/, why: '売上の欄に、売上の一部（特定の支払いだけ・件数）の数字' },
  { label: /^年商$/, must: /(年|通年)/, why: '年商の欄に、1年の数字だと分かる期間が無い' },
  { label: /^月商$/, must: /(月|MRR)/, why: '月商の欄に、1か月の数字だと分かる期間が無い' },
  { label: /売上|手残り|利益/, must: /[0-9０-９]|無い|なし|赤字|黒字/, why: '金額の欄に数字が無い' },
];

// ---- 保留 ------------------------------------------------------------------------
// 規則は決まっているが、画面をそう作る変更がまだ main に無いもの。表には出すが落とさない（変更が入ったら消す）。
export const PENDING = {
  [RULES.OVERVIEW_SCALE]: '概要の1行目を規模（人数・売上）にする変更が main に未統合につき保留',
  [RULES.NO_IMAGE]: '画像の置き場が無い環境では見ない（data/media-staging がある環境、または READER_VIEW_IMAGES=1 で見る）',
};

// ---- 本体 -------------------------------------------------------------------------
const CHAPTER = /^section-(chapter-|group-|story)/;
const SKIP_FOR_TEXT = /^section-(sources|notes)$/; // 出典の一覧（題名・ドメイン）とメモ欄は、読む人向けの文の検査から外す
const MEDIA = 'section-media';

/**
 * 1件の画面に全規則を掛ける。
 * @param {ScreenCase} screen @param {{ checkImages?: boolean }} [opts]
 * @returns {Hit[]}
 */
export function auditScreen(screen, { checkImages = true } = {}) {
  /** @type {Hit[]} */
  const hits = [];
  const add = (where, rule, text) => hits.push({ id: screen.id, where, rule, text: String(text).replace(/\s+/g, ' ').trim().slice(0, 160) });
  /** 文の置き場所の一覧（[場所, 文]） @type {Array<[string, string]>} */
  const places = [];
  if (screen.list) places.push(['一覧', screen.list]);
  screen.overview.forEach((line, i) => places.push([i === 0 ? '概要1行目' : '概要', line]));
  for (const cell of screen.cells) if (cell.where === '数字の帯') places.push([`数字の帯「${cell.label}」`, cell.value]);
  // 章末の出典の一覧（「出典1 example.com」の行）は読む人向けの文ではないので、文の検査から外す（出典の規則 b はリンクで見る）
  const withoutSourceList = (text) => text.split('\n').filter((line) => !/^出典\s?\d+/.test(line.trim())).join('\n');
  for (const s of screen.sections) if (!SKIP_FOR_TEXT.test(s.id) && s.id !== MEDIA) places.push([s.id, withoutSourceList(s.text)]);

  // a. 出どころの印（括弧の中・単独の印）
  for (const [where, text] of places) for (const tag of originTags(text)) add(where, RULES.ORIGIN, tag);
  for (const [where, text] of places) for (const line of text.split('\n')) if (MARK_LINE.test(line.trim())) add(where, RULES.MARK, line.trim());
  for (const cell of screen.cells) if (MARK_LINE.test(cell.label.trim())) add(cell.where, RULES.MARK, cell.label);

  // b. 出典: 章・まとまりの中のリンクは、章末の「出典1」「出典2」だけ。同じ出典を章ごとに繰り返さない。
  /** @type {Map<string, string>} */
  const sourceChapter = new Map();
  for (const s of screen.sections.filter((x) => CHAPTER.test(x.id))) {
    for (const link of s.links) {
      if (!/^出典\s?\d+$/.test(link.text)) { add(s.id, RULES.ROW_LINK, link.text || link.href); continue; }
      const first = sourceChapter.get(link.href);
      if (first && first !== s.id) add(`${first} と ${s.id}`, RULES.SAME_SOURCE, link.href);
      else if (!first) sourceChapter.set(link.href, s.id);
    }
  }

  // c. 料金: 帯の「料金」と、章の「料金」（price）
  const priceTexts = [
    ...screen.cells.filter((c) => /^料金/.test(c.label)).map((c) => [`${c.where}「${c.label}」`, c.value]),
    ...screen.sections.filter((s) => s.id === 'section-chapter-price').flatMap((s) => s.text.split('\n').map((line) => [s.id, line])),
  ];
  for (const [where, text] of priceTexts) {
    for (const extra of priceExtras(text)) add(where, RULES.PRICE_EXTRA, `「${extra}」: ${text}`);
  }
  for (const c of screen.cells.filter((x) => x.where === '数字の帯' && /^料金/.test(x.label))) {
    if (c.value.replace(/（約[^）]*）/g, '').length > PRICE_MAX) add('数字の帯「料金」', RULES.PRICE_LONG, c.value);
  }

  // d. 概要: 先頭は規模（人数・売上など数字と単位）。料金は1行まで。
  const lead = screen.overview[0] ?? '';
  if (!SCALE_WORD.test(lead) || (PRICE_WORD.test(lead) && !/(人|社|件|ユーザー|会員|顧客|売上|年商|月商)/.test(lead))) add('概要1行目', RULES.OVERVIEW_SCALE, lead || '（概要が無い）');
  const priceLines = screen.overview.flatMap((line) => line.split(/(?<=。)/)).filter((s) => PRICE_WORD.test(s));
  if (priceLines.length > 1) add('概要', RULES.OVERVIEW_PRICE, priceLines.join(' / '));

  // e. 同じ数字: 同じ事例の画面の、別の場所に同じ値が2回以上（表記ゆれ「65万人」「650,000人」も同じ）。一覧と、畳んだ「出典を見る」（section-details と中の事実・数値・計算の前提）は除く。
  /** @type {Map<string, { first: string; raw: string; places: Set<string> }>} */
  const seen = new Map();
  for (const [where, text] of places) {
    if (where === '一覧' || /^section-(details|facts-|reasoning|metrics)/.test(where)) continue;
    for (const n of unitNumbers(text)) {
      const entry = seen.get(n.key) ?? { first: where, raw: n.raw, places: new Set() };
      entry.places.add(where);
      seen.set(n.key, entry);
    }
  }
  for (const [, entry] of seen) if (entry.places.size >= 2) add([...entry.places].join(' / '), RULES.DUP_NUMBER, `${entry.raw}（${entry.places.size}か所）`);

  // e. 同じ話: 数字が無くても、同じ言い回し（記号・空白を除いて連続14字）が別の場所に出たら、同じ事を2回言っている
  /** @type {Map<string, Set<string>>} */
  const phrases = new Map();
  for (const [where, text] of places) {
    if (where === '一覧' || /^section-(details|facts-|reasoning|metrics)/.test(where)) continue;
    const flat = text.replace(/[\s、。，．,.・:：（）()「」『』〜~\-—–]/g, '');
    const windows = new Set();
    for (let i = 0; i + PHRASE_LEN <= flat.length; i += 1) {
      const w = flat.slice(i, i + PHRASE_LEN);
      if ((w.match(/[0-9０-９]/g) ?? []).length > PHRASE_LEN / 2) continue; // 数字ばかりの並びは e の数字で見る（数字は実際の値のまま比べる）
      windows.add(w);
    }
    for (const w of windows) phrases.set(w, (phrases.get(w) ?? new Set()).add(where));
  }
  /** @type {Map<string, string>} */
  const reported = new Map(); // 場所の組ごとに、最初に重なった言い回しを1つだけ出す
  for (const [w, at] of phrases) {
    if (at.size < 2) continue;
    const pair = [...at].join(' / ');
    if (!reported.has(pair)) reported.set(pair, w);
  }
  for (const [pair, w] of reported) add(pair, RULES.DUP_PHRASE, `「${w}」`);

  // d. 概要に売り方の並べ立て（「支払い方は、A、B、Cの3つ」）。売り方は「稼ぎ方」の欄に1回だけ書く
  for (const line of screen.overview) {
    const m = line.match(/(支払い方|払い方|売り方|稼ぎ方|収入源)(は|が)[^。]*(つ|種類)。?/);
    if (m) add('概要', RULES.OVERVIEW_SALES, m[0]);
  }

  // f. 説明のない略語（すぐ後ろが「（」なら説明つきとみなす）。事例名の中の略語は通す。
  for (const [where, text] of places) {
    if (/^section-(details|facts-|reasoning|metrics)/.test(where)) continue;
    for (const m of text.matchAll(ACRONYM)) {
      const word = m[1];
      if (KNOWN_ACRONYMS.has(word) || screen.name.includes(word)) continue;
      // 固有名の一部（「SOC2 Type II」「Avatar IV」「SIR Glass」「API Platform」）と、日本語の説明の後ろの括弧（「一括ログイン（SSO）」）は通す
      const before = text.slice(Math.max(0, m.index - 12), m.index);
      const after = text.slice(m.index + word.length, m.index + word.length + 3);
      // 社名の並び（「Canon、DHL」）も固有名として通す
      if (/[A-Za-z0-9]\s$/.test(before) || /^\s[A-Z]/.test(after) || /[A-Za-z]、$/.test(before) || /^、[A-Z]/.test(after) || (/[（(]$/.test(before) && /^[）)]/.test(after) && /[ぁ-んァ-ヶ一-龠][（(]$/.test(before))) continue;
      if (/^\s?[（(]/.test(text.slice(m.index + word.length, m.index + word.length + 2))) continue;
      if (/^(USD|INR|EUR|GBP)$/.test(word)) continue; // 通貨は g で見る
      add(where, RULES.JARGON, `${word}: ${text.slice(Math.max(0, m.index - 15), m.index + word.length + 15)}`);
    }
  }

  // g. 外貨に円換算
  for (const [where, text] of places) for (const s of missingYen(text)) add(where, RULES.YEN, s);

  // h. 項目名と中身の数字の種類
  for (const cell of screen.cells) {
    for (const row of LABEL_TABLE) {
      if (!row.label.test(cell.label)) continue;
      if ((row.must && !row.must.test(cell.value)) || (row.mustNot && row.mustNot.test(cell.value))) add(`${cell.where}「${cell.label}」`, RULES.LABEL_MISMATCH, `${row.why}: ${cell.value}`);
    }
  }

  // i. 画像（画像の置き場がある環境だけ）
  if (checkImages && screen.images === 0) add(MEDIA, RULES.NO_IMAGE, screen.icons ? `製品画面が1枚も出ていない（アイコン${screen.icons}枚だけでは足りない）` : '製品画面が1枚も出ていない');
  return hits;
}

/** 既知の違反（直す担当が決まっている分）との照合に使う鍵。文の空白差は無視する。 @param {Hit} hit */
export const hitKey = (hit) => `${hit.id}\u0000${hit.rule}\u0000${hit.where}\u0000${hit.text.replace(/\s+/g, '')}`;
