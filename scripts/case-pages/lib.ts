import { CasePageSchema, type CasePage, type CasePageRight } from '../../src/shared/case-page';

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

export function parseCasePage(md: string): CasePage {
  const s = sections(md);
  const get = (name: string) => s.get(name) ?? [];
  const { sources, notes } = parseSources(get(CHAPTER_HEADS.sources));
  const page = {
    listLine: text(get(CHAPTER_HEADS.listLine)),
    overview: text(get(CHAPTER_HEADS.overview)),
    secrets: parseSecrets(get(CHAPTER_HEADS.secrets)),
    did: bullets(get(CHAPTER_HEADS.did)),
    setbacks: bullets(get(CHAPTER_HEADS.setbacks)),
    pricing: bullets(get(CHAPTER_HEADS.pricing)),
    timeline: parseTimeline(get(CHAPTER_HEADS.timeline)),
    sources,
    notes,
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

export interface Violation { rule: 'polite' | 'list-line-length' | 'yen-after-foreign' | 'missing-chapter'; where: string; detail: string }

export const LIST_LINE_MAX = 40;
const POLITE = /(です|ます|ました|でした)。/g;
// 数字（「3万6千」「1.8千」「1,793」「250,000」）＋外貨の単位
const FOREIGN = /(?:[0-9０-９][0-9０-９,，.]*(?:[万千億百])?)\s*(?:ドル|ユーロ|ポンド|ルピー)|[$＄]\s*[0-9０-９]/g;
// 「1,500ドル弱（約22万円弱）」のように、額と円の概算のあいだに「弱・強・超・ほど」が入る書き方も許す
const YEN_APPROX = /^\s*(?:弱|強|超|ほど|前後)?\s*[（(]\s*約[^）)]*円/;

/** 主な章の文（出典のラベルと注記は、外貨の円換算の検査から外す。題名や元の記述をそのまま引くため） */
export function bodyLines(page: CasePage): Array<{ where: string; text: string }> {
  const out: Array<{ where: string; text: string }> = [
    { where: '一覧の1行', text: page.listLine },
    { where: '概要', text: page.overview },
  ];
  page.secrets.forEach((x, i) => { out.push({ where: `成功の秘訣${i + 1}（見出し）`, text: x.head }); out.push({ where: `成功の秘訣${i + 1}（補足）`, text: x.body }); });
  page.did.forEach((x, i) => out.push({ where: `実際にやったこと${i + 1}`, text: x }));
  page.setbacks.forEach((x, i) => out.push({ where: `つまずきと立て直し${i + 1}`, text: x }));
  page.pricing.forEach((x, i) => out.push({ where: `料金${i + 1}`, text: x }));
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

export function checkCasePage(page: CasePage): Violation[] {
  const v: Violation[] = [];
  for (const { where, text } of bodyLines(page)) {
    for (const m of text.matchAll(POLITE)) v.push({ rule: 'polite', where, detail: `「${m[0]}」は常体に直す` });
    for (const miss of foreignWithoutYen(text)) v.push({ rule: 'yen-after-foreign', where, detail: `「${miss}」の直後に円の概算（約…円）が要る` });
  }
  for (const note of page.notes) for (const m of note.matchAll(POLITE)) v.push({ rule: 'polite', where: '注記', detail: `「${m[0]}」は常体に直す` });
  for (const s of page.sources) for (const m of s.label.matchAll(POLITE)) v.push({ rule: 'polite', where: `出典${s.no}`, detail: `「${m[0]}」は常体に直す` });
  const len = [...page.listLine].length;
  if (len > LIST_LINE_MAX) v.push({ rule: 'list-line-length', where: '一覧の1行', detail: `${len}字（${LIST_LINE_MAX}字以内）` });
  return v;
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

/** この章を省いてよい事例（古い書き方の見本で、その章の材料が無いもの）。無い章は空にして、画面ではその章を出さない */
export const OPTIONAL_CHAPTERS: Record<string, readonly string[]> = {
  ent_button_shy_f1545f17d98e: [CHAPTER_HEADS.setbacks],
};

export function checkMarkdown(md: string, entityId = ''): { page: CasePage | null; violations: Violation[] } {
  const missing = missingChapters(md, OPTIONAL_CHAPTERS[entityId] ?? []);
  if (missing.length > 0) return { page: null, violations: missing };
  try {
    const page = parseCasePage(md);
    return { page, violations: checkCasePage(page) };
  } catch (e) {
    return { page: null, violations: [{ rule: 'missing-chapter', where: '全体', detail: `読めない: ${(e as Error).message.slice(0, 160)}` }] };
  }
}
