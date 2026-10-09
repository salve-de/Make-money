import { CasePageSchema, caseItemTexts, type CasePage, type CasePageRight } from '../../src/shared/case-page';

/**
 * 事例の章ごとの文（data/case-pages/<事例ID>.md）を読んで構造にする。
 * 見出しは見本（docs/owner/MY_CANDY_JAPAN_2026-10-08.md）と同じ。「# 〜」の題の行と、引用・コメント・作業メモの行は取り除く。
 */

export const CHAPTER_HEADS = {
  listLine: '一覧の1行',
  overview: '概要',
  secrets: '成功の秘訣',
  did: '実際にやったこと',
  setbacks: 'つまずきと立て直し',
  pricing: '料金',
  timeline: '時間順の流れ',
  sources: '数字と出典',
} as const;
const RIGHTS_HEAD = '権利の記録';
/** 任意の章。1行1本「- 払う側 → 受け取る側：何の代金・いくら」 */
export const FLOW_HEAD = 'お金の流れ';
/** 任意の章。1行1個「- ラベル：値｜補足」（補足の後ろに「｜棒」を付けると、募集ごとの額の小さな棒を添える） */
export const KEY_NUMBERS_HEAD = '主な数字';

/** 作業メモの行（「メモ：」「作業メモ」「※」「TODO」で始まる行、引用、コメント） */
const MEMO_LINE = /^\s*(?:>|<!--|※|(?:作業)?メモ[:：]|TODO|（作業メモ)/;

function sections(md: string): Map<string, string[]> {
  const out = new Map<string, string[]>();
  let current: string | null = null;
  for (const raw of md.split(/\r?\n/)) {
    if (/^#\s/.test(raw)) { current = null; continue; }
    const h = raw.match(/^##\s+(?:\d+[.．]\s*)?(.+?)\s*$/);
    if (h) {
      const name = h[1].startsWith(RIGHTS_HEAD) ? RIGHTS_HEAD : h[1];
      current = name;
      out.set(name, []);
      continue;
    }
    if (current === null || MEMO_LINE.test(raw)) continue;
    out.get(current)!.push(raw.trimEnd());
  }
  return out;
}

const text = (lines: string[]) => lines.map((l) => l.trim()).filter(Boolean).join('\n');
const bullets = (lines: string[]) => lines.map((l) => l.match(/^\s*[-・]\s+(.+)$/)?.[1].trim()).filter((x): x is string => Boolean(x));

function numbered(lines: string[]): Array<{ no: number; body: string }> {
  const out: Array<{ no: number; body: string }> = [];
  for (const l of lines) {
    const m = l.match(/^(\d+)\.\s+(.+)$/);
    if (m) out.push({ no: Number(m[1]), body: m[2].trim() });
  }
  return out;
}

/** 実際にやったこと・つまずき: 「- **見出し**」の次の行（字下げ）が補足。見出しの無い「- 文」は古い形として1文のまま */
function parseItems(lines: string[]): CasePage['did'] {
  const out: CasePage['did'] = [];
  for (const l of lines) {
    const head = l.match(/^\s*[-・]\s+\*\*(.+?)\*\*\s*$/);
    if (head) { out.push({ head: head[1].trim(), body: '' }); continue; }
    const plain = l.match(/^\s*[-・]\s+(.+)$/);
    if (plain) { out.push(plain[1].trim()); continue; }
    const last = out[out.length - 1];
    if (last && typeof last !== 'string' && l.trim()) last.body = `${last.body}${last.body ? ' ' : ''}${l.trim()}`;
  }
  return out;
}

/** 成功の秘訣: 「1. **見出し**」の次の行（字下げ）が補足。 */
function parseSecrets(lines: string[]): CasePage['secrets'] {
  const out: CasePage['secrets'] = [];
  for (const l of lines) {
    const head = l.match(/^\d+\.\s+\*\*(.+?)\*\*\s*$/);
    if (head) { out.push({ head: head[1].trim(), body: '' }); continue; }
    if (out.length > 0 && l.trim()) out[out.length - 1].body = `${out[out.length - 1].body}${out[out.length - 1].body ? ' ' : ''}${l.trim()}`;
  }
  return out;
}

function parseTimeline(lines: string[]): CasePage['timeline'] {
  return bullets(lines).map((b) => {
    const m = b.match(/^([^：]{1,24})：(.+)$/);
    return m ? { when: m[1].trim(), what: m[2].trim() } : { when: '', what: b };
  });
}

/** 出典の行。番号つき（「1. 説明：https://…」）か、番号なしの箇条書き（「- 説明：https://…」）。リンクのある行が出典、無い行は注記 */
function sourceRows(lines: string[]): Array<{ body: string; url: string }> {
  const rows: Array<{ body: string; url: string }> = [];
  const numberedRows = numbered(lines);
  const bodies = numberedRows.length > 0 ? numberedRows.map((r) => r.body) : bullets(lines);
  for (const body of bodies) {
    const m = body.match(/^(.+?)[:：]\s*(https?:\/\/\S+)(?:\s+(.+))?$/);
    rows.push(m ? { body: `${m[1].trim()}${m[3] ? `${m[3].trim()}` : ''}`, url: m[2] } : { body, url: '' });
  }
  return rows;
}

/** 「説明文（…）：https://…」を、ラベルとリンクに分ける。リンクの後ろの補足は、ラベルの後ろに足す */
function parseSources(lines: string[]): { sources: CasePage['sources']; notes: string[] } {
  const rows = sourceRows(lines);
  const withUrl = rows.filter((r) => r.url);
  const sources = withUrl.map((r, i) => ({ no: i + 1, label: r.body, url: r.url }));
  const hasNumbers = numbered(lines).length > 0;
  // 番号つきの形では、注記は番号の無い箇条書き。番号なしの形では、リンクの無い箇条書き
  const notes = hasNumbers ? bullets(lines) : rows.filter((r) => !r.url).map((r) => r.body);
  return { sources, notes };
}

/** お金の流れの章。形に合わない行は from が空のまま返し、検査で見つける */
export function parseFlows(lines: string[]): NonNullable<CasePage['flows']> {
  return bullets(lines).map((b) => {
    const m = b.match(/^(.+?)\s*→\s*(.+?)\s*[:：]\s*(.+)$/);
    return m ? { from: m[1].trim(), to: m[2].trim(), label: m[3].trim() } : { from: '', to: '', label: b };
  });
}

/** 主な数字の章。形に合わない行は value が空のまま返し、検査で見つける */
export function parseKeyNumbers(lines: string[]): NonNullable<CasePage['keyNumbers']> {
  return bullets(lines).map((b) => {
    const m = b.match(/^([^：]+)：([^｜]+)｜([^｜]+)(?:｜(棒))?$/);
    return m ? { label: m[1].trim(), value: m[2].trim(), note: m[3].trim(), ...(m[4] ? { bars: true } : {}) } : { label: b, value: '', note: '' };
  });
}

export function parseCasePage(md: string): CasePage {
  const s = sections(md);
  const get = (name: string) => s.get(name) ?? [];
  const { sources, notes } = parseSources(get(CHAPTER_HEADS.sources));
  const page = {
    listLine: text(get(CHAPTER_HEADS.listLine)),
    overview: text(get(CHAPTER_HEADS.overview)),
    secrets: parseSecrets(get(CHAPTER_HEADS.secrets)),
    did: parseItems(get(CHAPTER_HEADS.did)),
    setbacks: parseItems(get(CHAPTER_HEADS.setbacks)),
    pricing: bullets(get(CHAPTER_HEADS.pricing)),
    timeline: parseTimeline(get(CHAPTER_HEADS.timeline)),
    sources,
    notes,
    ...(get(FLOW_HEAD).some((l) => l.trim()) ? { flows: parseFlows(get(FLOW_HEAD)) } : {}),
    ...(get(KEY_NUMBERS_HEAD).some((l) => l.trim()) ? { keyNumbers: parseKeyNumbers(get(KEY_NUMBERS_HEAD)) } : {}),
  };
  return CasePageSchema.parse(page);
}

/** 権利の記録の章（画面には出さない）。「1. ホスト：…」の行を出典ごとの記録にする。番号の無い箇条書きは補足として番号0で残す */
export function parseRights(md: string): CasePageRight[] {
  const lines = sections(md).get(RIGHTS_HEAD) ?? [];
  const out: CasePageRight[] = [];
  for (const { no, body } of numbered(lines)) {
    const m = body.match(/^(.+?)[:：](.+)$/);
    out.push({ no, host: (m ? m[1] : body).trim(), text: (m ? m[2] : '').trim() });
  }
  for (const b of bullets(lines)) out.push({ no: 0, host: '補足', text: b });
  return out;
}

// ---- 軽い検査（4つだけ） ----

export interface Violation { rule: 'polite' | 'yen-after-foreign' | 'missing-chapter' | 'held-source' | 'list-line-estimate' | 'maker-memo' | 'flow-format' | 'flow-amount' | 'key-number' | 'source-number-gap' | 'unused-currency-note' | 'timeline-thin' | 'number-guess' | 'timeline-tense'; where: string; detail: string }

/** 一覧の1行に出さない語（推定の数字は嘘になりうるので出さない。文の良し悪しは機械で決めない） */
const LIST_LINE_ESTIMATE = /推定|推測/g;
const POLITE = /(です|ます|ました|でした)。/g;
// 数字（「3万6千」「1.8千」「1,793」「250,000」）＋外貨の単位
// 「9万5,000米ドル」「100 USドル」のように、ドルの前に国の名が付く書き方も外貨として拾う
const FOREIGN = /(?:[0-9０-９][0-9０-９,，.]*(?:[万千億百])?)\s*(?:(?:米|US|ＵＳ|豪|カナダ|香港|シンガポール)\s*)?(?:ドル|ユーロ|ポンド|ルピー)|[$＄]\s*[0-9０-９]/g;
// 「1,500ドル弱（約22万円弱）」のように、額と円の概算のあいだに「弱・強・超・ほど」が入る書き方も許す
const YEN_APPROX = /^\s*(?:弱|強|超|ほど|前後)?\s*[（(]\s*約[^）)]*円/;

/** 主な章の文（出典のラベルと注記は、外貨の円換算の検査から外す。題名や元の記述をそのまま引くため） */
export function bodyLines(page: CasePage): Array<{ where: string; text: string }> {
  const out: Array<{ where: string; text: string }> = [
    { where: '一覧の1行', text: page.listLine },
    { where: '概要', text: page.overview },
  ];
  page.secrets.forEach((x, i) => { out.push({ where: `成功の秘訣${i + 1}（見出し）`, text: x.head }); out.push({ where: `成功の秘訣${i + 1}（補足）`, text: x.body }); });
  page.did.forEach((x, i) => caseItemTexts(x).forEach((text, j) => out.push({ where: `実際にやったこと${i + 1}${typeof x === 'string' ? '' : j === 0 ? '（見出し）' : '（補足）'}`, text })));
  page.setbacks.forEach((x, i) => caseItemTexts(x).forEach((text, j) => out.push({ where: `つまずきと立て直し${i + 1}${typeof x === 'string' ? '' : j === 0 ? '（見出し）' : '（補足）'}`, text })));
  page.pricing.forEach((x, i) => out.push({ where: `料金${i + 1}`, text: x }));
  (page.flows ?? []).forEach((x, i) => out.push({ where: `お金の流れ${i + 1}`, text: x.label }));
  page.timeline.forEach((x, i) => out.push({ where: `時間順の流れ${i + 1}`, text: `${x.when}${x.when ? '：' : ''}${x.what}` }));
  return out;
}

/** 外貨の数字の直後に、円の概算（約…円）があるか。同じ括弧の中で先に円の概算が出ている比較用の額、円の額の直後の括弧に添えた元の額も許す */
export function foreignWithoutYen(line: string): string[] {
  const misses: string[] = [];
  for (const m of line.matchAll(FOREIGN)) {
    const end = (m.index ?? 0) + m[0].length;
    if (YEN_APPROX.test(line.slice(end))) continue;
    const before = line.slice(0, m.index ?? 0);
    const open = Math.max(before.lastIndexOf('（'), before.lastIndexOf('('));
    const closed = Math.max(before.lastIndexOf('）'), before.lastIndexOf(')'));
    if (open > closed && /約[^）)]*円/.test(before.slice(open))) continue;
    // 円の額のあとの括弧に外貨の元の額を添える書き方（「1.5億円（100万ドル）」）は、円が先に出ているので許す
    if (open > closed && open > 0 && before[open - 1] === '円') continue;
    misses.push(m[0].trim());
  }
  return misses;
}

/** お金の流れに出てくる金額（数字＋ドル・円・％）。お金の流れ以外の本文に同じ金額が無ければ、作った数字とみなす */
const FLOW_AMOUNT = /[0-9][0-9,]*(?:\.[0-9]+)?(?:万|億|千)?\s*(?:ドル|円|％|%)/g;
const normAmount = (t: string) => t.replace(/\s/g, '').replace('%', '％');

export function checkFlows(page: CasePage): Violation[] {
  const v: Violation[] = [];
  const flows = page.flows ?? [];
  flows.forEach((f, i) => {
    if (!f.from || !f.to) v.push({ rule: 'flow-format', where: `お金の流れ${i + 1}`, detail: `「- 払う側 → 受け取る側：何の代金・いくら」の形にする（${f.label.slice(0, 30)}）` });
  });
  if (flows.length === 0) return v;
  const rest = [
    page.listLine, page.overview,
    ...page.secrets.flatMap((x) => [x.head, x.body]),
    ...page.did.flatMap(caseItemTexts), ...page.setbacks.flatMap(caseItemTexts), ...page.pricing,
    ...page.timeline.map((x) => x.what),
    ...page.notes,
  ].map(normAmount).join('\n');
  flows.forEach((f, i) => {
    for (const m of f.label.matchAll(FLOW_AMOUNT)) {
      if (!rest.includes(normAmount(m[0]))) v.push({ rule: 'flow-amount', where: `お金の流れ${i + 1}`, detail: `「${m[0].trim()}」が同じページの本文に無い。本文にある金額だけ使う` });
    }
  });
  return v;
}

/** 主な数字の数字（ラベル・補足を含む）が、同じページの本文に無ければ作った数字とみなす */
export function checkKeyNumbers(page: CasePage): Violation[] {
  const v: Violation[] = [];
  const rest = [
    page.listLine, page.overview,
    ...page.secrets.flatMap((x) => [x.head, x.body]),
    ...page.did.flatMap(caseItemTexts), ...page.setbacks.flatMap(caseItemTexts), ...page.pricing,
    ...page.timeline.flatMap((x) => [x.when, x.what]),
    ...page.notes,
  ].join('\n').replace(/\s/g, '');
  (page.keyNumbers ?? []).forEach((k, i) => {
    if (!k.value) { v.push({ rule: 'key-number', where: `主な数字${i + 1}`, detail: `「- ラベル：値｜補足」の形にする（${k.label.slice(0, 30)}）` }); return; }
    for (const m of `${k.value}｜${k.note}`.matchAll(/[0-9][0-9,]*(?:\.[0-9]+)?(?:万|億|千)?/g)) {
      if (!rest.includes(m[0])) v.push({ rule: 'key-number', where: `主な数字${i + 1}`, detail: `「${m[0]}」が同じページの本文に無い。本文にある数字だけ使う` });
    }
  });
  return v;
}

export function checkCasePage(page: CasePage): Violation[] {
  const v: Violation[] = [...checkFlows(page), ...checkKeyNumbers(page)];
  for (const { where, text } of bodyLines(page)) {
    for (const m of text.matchAll(POLITE)) v.push({ rule: 'polite', where, detail: `「${m[0]}」は常体に直す` });
    for (const miss of foreignWithoutYen(text)) v.push({ rule: 'yen-after-foreign', where, detail: `「${miss}」の直後に円の概算（約…円）が要る` });
  }
  v.push(...unusedCurrencyNotes(page));
  v.push(...numberGuesses(page), ...timelineTense(page));
  if (page.timeline.length < MIN_TIMELINE) v.push({ rule: 'timeline-thin', where: '時間順の流れ', detail: `${page.timeline.length}行しかない。創業・伸びた転機・規模の節目を年月で並べ、${MIN_TIMELINE}行以上にする（集めた事実と出典にある出来事だけ。広告や機能の細かい話で埋めない）` });
  for (const note of page.notes) for (const m of note.matchAll(POLITE)) v.push({ rule: 'polite', where: '注記', detail: `「${m[0]}」は常体に直す` });
  for (const s of page.sources) for (const m of s.label.matchAll(POLITE)) v.push({ rule: 'polite', where: `出典${s.no}`, detail: `「${m[0]}」は常体に直す` });
  // 一覧の1行で機械が見るのは推定・推測の語だけ（書き方は docs/owner/LEAD_LINE_SHEET.md の見本）
  for (const m of page.listLine.matchAll(LIST_LINE_ESTIMATE)) v.push({ rule: 'list-line-estimate', where: '一覧の1行', detail: `「${m[0]}」は一覧の1行に出さない（推定の数字は使わない）` });
  return v;
}


/** 数字・金額・年月を含む文に「（推測）」「（推定）」は付けない（印は見立て＝解釈にだけ。数字は出典で確かめた物だけ書き、確かめられなければ数字を消す） */
export function numberGuesses(page: CasePage): Violation[] {
  const v: Violation[] = [];
  for (const { where, text } of bodyLines(page)) {
    for (const sentence of text.split(/(?<=。)/)) {
      if (/[（(](?:推測|推定)[）)]/.test(sentence) && /[0-9０-９]/.test(sentence.replace(/[（(](?:推測|推定)[）)]/g, ''))) {
        v.push({ rule: 'number-guess', where, detail: `数字・金額・年月の文に（推測）は付けない（${sentence.trim().slice(0, 40)}）。出典で確かめられる数字なら印を外し、確かめられなければその数字を消す。印は数字の無い見立ての文だけ` });
      }
    }
  }
  return v;
}

/** 時間順の流れの過去の出来事は過去形（〜した）でそろえる。「：」の後が「る。」で終わる行を拾う（「〜している」の現在の状態は可） */
export function timelineTense(page: CasePage): Violation[] {
  return page.timeline.flatMap((t, i) => {
    const what = t.what.trim();
    return /る。?$/.test(what) && !/(?:て|で)いる。?$/.test(what)
      ? [{ rule: 'timeline-tense' as const, where: `時間順の流れ${i + 1}`, detail: `「${what.slice(-14)}」は現在形。過去の出来事は過去形（〜した）にする（現在の状態は「〜している」）` }]
      : [];
  });
}

/** 時間順の流れの最少行数（見本 Candy Japan は5行） */
export const MIN_TIMELINE = 5;

/** 後から足した3つの検査。既に出ている事例（data/case-pages-legacy.json）では警告に留め、新しい事例では止める */
export const NEWER_RULES: ReadonlyArray<Violation['rule']> = ['source-number-gap', 'unused-currency-note', 'timeline-thin', 'number-guess', 'timeline-tense'];

/** 通貨の断り（「1ドル＝150円で計算」）の通貨名。本文でその通貨を使っていなければ断りは要らない */
const CURRENCY_NOTE = /^\s*1\s*(ドル|ユーロ|ポンド|ルピー|ペソ|フラン|ウォン|元)\s*[＝=]/;
const usedCurrencies = (page: CasePage) => new Set(bodyLines(page).flatMap((l) => [...l.text.matchAll(/(ドル|ユーロ|ポンド|ルピー|ペソ|フラン|ウォン)/g)].map((m) => m[1])));

/** 本文で使っていない通貨の断りが残っていないか */
export function unusedCurrencyNotes(page: CasePage): Violation[] {
  const used = usedCurrencies(page);
  return page.notes.flatMap((n) => {
    const c = n.match(CURRENCY_NOTE)?.[1];
    return c && !used.has(c) ? [{ rule: 'unused-currency-note' as const, where: '注記', detail: `「${n.slice(0, 30)}」は本文で${c}を使っていない。断りを外す` }] : [];
  });
}

/** md の「数字と出典」から、本文で使っていない通貨の断りの行を外す（機械で直す。本文は変えない） */
export function dropUnusedCurrencyNotes(md: string): string {
  const { page } = (() => { try { return { page: parseCasePage(md) }; } catch { return { page: null }; } })();
  if (!page) return md;
  const used = usedCurrencies(page);
  let inSources = false;
  return md.split('\n').filter((l) => {
    if (/^##\s/.test(l)) inSources = /^##\s+数字と出典\s*$/.test(l);
    if (!inSources) return true;
    const c = l.match(/^\s*[-・]\s+(.+)$/)?.[1]?.match(CURRENCY_NOTE)?.[1];
    return !(c && !used.has(c));
  }).join('\n');
}

/** 「数字と出典」の番号が 1 からそろっているか（飛び・重なりがあれば止める） */
export function sourceNumberGaps(lines: string[]): Violation[] {
  const nos = numbered(lines).map((r) => r.no);
  const bad = nos.findIndex((n, i) => n !== i + 1);
  return bad < 0 ? [] : [{ rule: 'source-number-gap', where: CHAPTER_HEADS.sources, detail: `出典の番号が 1 からそろっていない（${nos.join('、')}）。1 から詰めて振り直す` }];
}

/** 全章がそろっているか（markdown の段階。空の章・出典のリンク切れ・番号の飛びを見つける） */
export function missingChapters(md: string, optional: readonly string[] = []): Violation[] {
  const s = sections(md);
  const v: Violation[] = [];
  for (const name of Object.values(CHAPTER_HEADS)) {
    if (optional.includes(name) && (!s.has(name) || !(s.get(name) ?? []).some((l) => l.trim()))) continue;
    if (!s.has(name)) v.push({ rule: 'missing-chapter', where: name, detail: '章が無い' });
    else if (!(s.get(name) ?? []).some((l) => l.trim())) v.push({ rule: 'missing-chapter', where: name, detail: '章が空' });
  }
  if (s.has(CHAPTER_HEADS.sources)) {
    const rows = sourceRows(s.get(CHAPTER_HEADS.sources)!);
    if (!rows.some((r) => r.url)) v.push({ rule: 'missing-chapter', where: CHAPTER_HEADS.sources, detail: 'リンクつきの出典が無い' });
    if (numbered(s.get(CHAPTER_HEADS.sources)!).length > 0) {
      rows.forEach((r, i) => { if (!r.url) v.push({ rule: 'missing-chapter', where: CHAPTER_HEADS.sources, detail: `出典${i + 1}にリンクが無い` }); });
    }
  }
  return v;
}

/** どの事例でも省いてよい章（つまずきの材料が無い事例もある）。無い章は空にして、画面ではその章を出さない */
export const OPTIONAL_CHAPTERS: readonly string[] = [CHAPTER_HEADS.setbacks];

/** 調べた側のメモの言葉（読む人には要らない。権利・読めたか・未確認・作る側のやりとり）。画面の文に出さず、docs/owner/research-notes/<事例ID>.md へ置く */
const MAKER_MEMO = /未確認|本文に無い|本文にない|額は本文|利用規約|ログインなし|有料の壁|本文に使っていない|読めなかった|集められなかった|見つからなかった|照合はまだ|指示を受けた|直した点|の目安|計算した|数字の範囲[:：]|書き手不明|筆者の|計算値|照合は|要再確認|出所の明記/g;

/** 言い回しと印の二重（「と推定される（推定）」「とみられる（推測）」）。印は1か所に1つだけ */
const DOUBLE_HEDGE = /(?:と推定される|と推測される|と(?:み|見)られる|と思われる|とされる|と表示される)。?[（(](?:推定|推測)[）)]/g;

export function checkMakerMemo(md: string): Violation[] {
  const v: Violation[] = [];
  for (const [name, lines] of sections(md)) {
    if (name === RIGHTS_HEAD) continue;
    lines.forEach((l) => { for (const m of l.matchAll(DOUBLE_HEDGE)) v.push({ rule: 'maker-memo', where: name, detail: `「${m[0]}」は言い回しと印の二重。印（推定・推測）だけ残す` }); });
    lines.forEach((l) => { for (const m of l.matchAll(MAKER_MEMO)) v.push({ rule: 'maker-memo', where: name, detail: `「${m[0]}」は調べた側のメモ。画面の文に出さず docs/owner/research-notes/ へ移す（${l.trim().slice(0, 40)}）` }); });
  }
  return v;
}

export function checkMarkdown(md: string): { page: CasePage | null; violations: Violation[] } {
  const missing = missingChapters(md, OPTIONAL_CHAPTERS);
  if (missing.length > 0) return { page: null, violations: missing };
  try {
    const page = parseCasePage(md);
    return { page, violations: [...checkCasePage(page), ...checkMakerMemo(md), ...sourceNumberGaps(sections(md).get(CHAPTER_HEADS.sources) ?? [])] };
  } catch (e) {
    return { page: null, violations: [{ rule: 'missing-chapter', where: '全体', detail: `読めない: ${(e as Error).message.slice(0, 160)}` }] };
  }
}

/** 使ってはいけない出典（data/catalog-source-rights.json で allowed 以外）を出典に挙げていないか。末尾の「/」の有無は同じ扱い */
export function heldSources(page: CasePage, rights: Record<string, { decision?: string }>): Violation[] {
  const norm = (u: string) => u.replace(/\/+$/, '');
  const blocked = new Set(Object.entries(rights).filter(([, r]) => r.decision !== 'allowed').map(([u]) => norm(u)));
  return page.sources.filter((s) => blocked.has(norm(s.url))).map((s) => ({ rule: 'held-source' as const, where: `出典${s.no}`, detail: `${s.url} は利用が保留・不可。出典と、それに頼る事実を外す` }));
}
