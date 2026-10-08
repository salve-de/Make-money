/**
 * 画面の自動監査の規則（画面の仕組みから来る問題）。rules.mjs と同じく、実際に描いた画面の文（ScreenCase）に掛ける純粋関数。
 * 事例ごとの文の直しでなく、「どの事例でも起こり得る形」を落とす:
 *  - 同じ外貨の額が、画面の中で違う円の形で出る（約3万7,500円・約3.8万円・約3.75万円）
 *  - 円の二重（「2億ドル（約300億円）超（約300億円）」）と、円が先で外貨が後の並び（「約900万円（6万ドル）」）
 *  - 章の見出し・表の列名・注記が、作る側の言葉（「出典つきの事実・数値」「由来」「そのまま載せた」など）
 * 同じ数字が別の章に2回以上出る、は rules.mjs の e（DUP_NUMBER）が見ている。
 * 誤検出は structure-rules.test.mjs の「通すべき文」で押さえる。
 */

/** @typedef {import('../../e2e/support/reader-view-collect').ScreenCase} ScreenCase */
/** @typedef {{ id: string; where: string; rule: string; text: string }} Hit */

export const STRUCTURE_RULES = {
  YEN_VARIANT: 'j.同じ外貨の額が違う円の形で出る',
  YEN_DOUBLE: 'j.円の二重・円が先の並び',
  MAKER_WORDS: 'j.章の見出し・注記が作る側の言葉',
};

const NUM = '[0-9][0-9,]*(?:\\.[0-9]+)?';
const QUALIFIER = '(?:超|以上|以下|未満|ほど|強|弱|前後)';
const FOREIGN = `(?:(?:US\\$|\\$|€|£|₹)\\s?${NUM}\\s?(?:億|万|[kKMB](?![A-Za-z]))?|${NUM}\\s?(?:億|万)?\\s?(?:ドル|ユーロ|ポンド|ルピー))`;
const FOREIGN_THEN_YEN = new RegExp(`(${FOREIGN})\\s?${QUALIFIER}?\\s*[（(]\\s*(約|およそ)?\\s*([0-9][0-9,.万億]*円)\\s*[）)]`, 'g');
const SCALE = { 億: 1e8, 万: 1e4, k: 1e3, K: 1e3, M: 1e6, B: 1e9 };

/** 外貨の額を「値+通貨」の鍵にする（$5K と 5,000ドル を同じにする）。 @param {string} raw */
export function foreignKey(raw) {
  const m = new RegExp(`^(US\\$|\\$|€|£|₹)?\\s?(${NUM})\\s?(億|万|[kKMB])?\\s?(ドル|ユーロ|ポンド|ルピー)?$`).exec(raw.trim());
  if (!m) return raw.trim();
  const cur = m[1] ?? m[4] ?? '';
  const currency = /US\$|\$|ドル/.test(cur) ? '$' : /€|ユーロ/.test(cur) ? '€' : /£|ポンド/.test(cur) ? '£' : '₹';
  return `${Number(m[2].replace(/,/g, '')) * (m[3] ? SCALE[m[3]] : 1)}${currency}`;
}

/**
 * 同じ外貨の額に、違う円の書き方が付いている組。
 * @param {string[]} texts 画面の中の文（どの欄でもよい）
 * @returns {Array<{ foreign: string; yens: string[] }>}
 */
export function yenVariants(texts) {
  /** @type {Map<string, { foreign: string; yens: Set<string> }>} */
  const byAmount = new Map();
  for (const text of texts) {
    for (const m of text.matchAll(FOREIGN_THEN_YEN)) {
      const key = foreignKey(m[1]);
      const entry = byAmount.get(key) ?? { foreign: m[1].trim(), yens: new Set() };
      entry.yens.add(m[3].replace(/\s/g, ''));
      byAmount.set(key, entry);
    }
  }
  return [...byAmount.values()].filter((e) => e.yens.size > 1).map((e) => ({ foreign: e.foreign, yens: [...e.yens] }));
}

const YEN_PAREN = '[（(]\\s*(?:約|およそ)?\\s*[0-9][0-9,.万億]*円[^）)]*[）)]';
const DOUBLE_YEN = new RegExp(`${YEN_PAREN}\\s?${QUALIFIER}?\\s*${YEN_PAREN}`);
const YEN_FIRST = new RegExp(`(?:約|およそ)?${NUM}(?:億|万)?(?:[0-9][0-9,]*)?円[（(]\\s*${FOREIGN}\\s*[）)]`);

/** 円の二重と、円が先で外貨が後の並び。 @param {string} text @returns {string[]} */
export function yenDoubles(text) {
  const out = [];
  const a = DOUBLE_YEN.exec(text);
  if (a) out.push(a[0]);
  const b = YEN_FIRST.exec(text);
  if (b) out.push(b[0]);
  return out;
}

// 章の見出し・表の列名・単独の行が、読む人にとって何の章か分からない作る側の名前。行ぜんたいが一致した時だけ落とす。
export const MAKER_HEADINGS = new Set([
  '出典つきの事実・数値', '推定の計算と前提', 'ここまでの経緯', '由来', '出来事', '調達', 'その他', '道具', '失敗の原因',
]);
// 作る側の注記（計算の欄に出る定型文）
export const MAKER_NOTES = /そのまま(?:載せた|記載|載せ)|計算は(?:ない|無い)/;

/** @param {ScreenCase} screen @returns {Hit[]} */
export function auditStructure(screen) {
  /** @type {Hit[]} */
  const hits = [];
  const add = (where, rule, text) => hits.push({ id: screen.id, where, rule, text: String(text).replace(/\s+/g, ' ').trim().slice(0, 160) });
  /** @type {Array<[string, string]>} */
  const places = [];
  if (screen.list) places.push(['一覧', screen.list]);
  screen.overview.forEach((line) => places.push(['概要', line]));
  for (const cell of screen.cells) places.push([cell.where, cell.value]);
  for (const s of screen.sections) places.push([s.id, s.text]);

  for (const v of yenVariants(places.map(([, text]) => text))) add('画面全体', STRUCTURE_RULES.YEN_VARIANT, `${v.foreign}: ${v.yens.join(' / ')}`);
  for (const [where, text] of places) for (const d of yenDoubles(text)) add(where, STRUCTURE_RULES.YEN_DOUBLE, d);

  for (const s of screen.sections) {
    if (MAKER_HEADINGS.has(s.title.trim())) add(s.id, STRUCTURE_RULES.MAKER_WORDS, `見出し「${s.title.trim()}」`);
    for (const line of s.text.split('\n').map((l) => l.trim())) {
      if (MAKER_HEADINGS.has(line)) add(s.id, STRUCTURE_RULES.MAKER_WORDS, `見出し・列名「${line}」`);
      else if (MAKER_NOTES.test(line)) add(s.id, STRUCTURE_RULES.MAKER_WORDS, line);
    }
  }
  return hits;
}
