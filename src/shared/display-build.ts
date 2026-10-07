import { CHAPTER_IDS, type ChapterId } from './case-chapters';
import { chapterGaps, type GapEntry, type LiveFacts } from './chapter-gaps';
import { textFingerprint } from './list-lines';

/**
 * 画面の層（一覧の文・概要の2文目以降・分析欄の文・成功の秘訣・章）を、集めた事実から自動で作るための純粋な部品。
 * 入出力（AIの呼び出し・検査の実行・ファイル書き込み）は scripts/reader-case/build-display.ts が持つ。
 *
 * 約束:
 *  - 事実（reader.facts / metrics / analysis）は変えない。画面の層だけを足す・差し替える。
 *  - 紐付け（factId・factHash・textHash）と出典URLは、AIに書かせず、ここで材料から機械で付ける。
 *  - その事例の分だけを差し替え、他の事例の文は1文字も変えない。
 */

/** 画面に出る分析項目（ReaderOverview の ANALYSIS_GROUPS と STORY）。HEADLINE・VIABILITY は画面に出ないので文を作らない。 */
export const DISPLAY_ANALYSIS_ITEMS = [
  'STORY',
  'WHY_IT_WORKED', 'LESSON',
  'CUSTOMER', 'CUSTOMER_PAIN',
  'FIRST_CUSTOMERS', 'CHANNELS', 'REFERRAL',
  'BUSINESS_MODEL', 'PRICING', 'REVENUE_ESTIMATE', 'COST_STRUCTURE', 'TAKE_HOME', 'UPFRONT_CASH', 'CAPITAL_AND_TEAM',
  'INCUMBENT_BLINDSPOT', 'LOCK_IN', 'COMPETITION', 'DEPENDENCIES', 'TOOLS',
  'TIMELINE', 'PIVOTS', 'FAILURE_CAUSE',
] as const;

export const DISPLAY_FILES = ['list-lines', 'summary-lines', 'detail-lines', 'success-points', 'case-chapters'] as const;
export type DisplayFileName = (typeof DISPLAY_FILES)[number];

export interface ListLine { entityId: string; factId: string; factHash: string; text: string }
export interface DetailLine { entityId: string; analysisId: string; textHash: string; answer: string; note?: string; hidden?: boolean }
export interface SuccessPoint { head: string; body: string; factId: string; factHash: string }
export interface SuccessEntry { entityId: string; points: SuccessPoint[] }
export interface ChapterEntry extends GapEntry { chapters: Partial<Record<ChapterId, Array<{ text: string; source: string }>>> }

export interface DisplayFiles {
  'list-lines': ListLine[];
  'summary-lines': ListLine[];
  'detail-lines': DetailLine[];
  'success-points': SuccessEntry[];
  'case-chapters': ChapterEntry[];
}

/** 事例の材料（照合の結果を反映した後、画面に出る形の reader から作る） */
export interface LiveReader {
  summaryFactId?: string;
  sources: ReadonlyArray<{ id: string; url: string; publisher?: string; title?: string }>;
  facts: ReadonlyArray<{ id: string; kind?: string; text: string; sourceId: string; attribution?: string }>;
  metrics: ReadonlyArray<{ id: string; measure: string; period: string; amount: number; currency?: string; unit?: string; origin?: string; label?: string; basis?: string; sourceId: string }>;
  analysis: ReadonlyArray<{ id: string; item: string; text: string; basis?: readonly string[] }>;
}

/** その事例で、作る（作り直す）必要がある画面の層 */
export interface DisplayNeed {
  list: boolean;
  summary: boolean;
  success: boolean;
  chapters: boolean;
  /** 画面用の文が無い・古い分析項目の id */
  detail: string[];
}

export const needsAnything = (need: DisplayNeed) => need.list || need.summary || need.success || need.chapters || need.detail.length > 0;

const shownAnalysis = (reader: LiveReader) => reader.analysis.filter((a) => (DISPLAY_ANALYSIS_ITEMS as readonly string[]).includes(a.item));

/**
 * 仕上げ済みなのに画面の層が足りない事例と、足りない層。
 * 章は case-chapters:todo と同じ判定（chapterGaps）。他の層も、今の事実の文と指紋で照合する（古い文は画面に出ないので「足りない」）。
 */
export function displayGaps(finishedIds: readonly string[], files: DisplayFiles, readers: ReadonlyMap<string, LiveReader>): Array<{ entityId: string; need: DisplayNeed }> {
  const liveFacts: LiveFacts = new Map([...readers].map(([id, r]) => [id, r.facts]));
  const chapters = chapterGaps(finishedIds, files['case-chapters'], files['list-lines'], liveFacts);
  const chapterNeed = new Set([...chapters.missing, ...chapters.stale]);
  const out: Array<{ entityId: string; need: DisplayNeed }> = [];
  for (const id of finishedIds) {
    const reader = readers.get(id);
    if (!reader) continue; // 照合済みの reader が無い事例は、画面にも出ない。作る材料も無い
    const summary = reader.facts.find((f) => f.id === reader.summaryFactId);
    const linked = (line: ListLine | undefined) => !!summary && !!line && line.factId === summary.id && line.factHash === textFingerprint(summary.text);
    const factHash = new Map(reader.facts.map((f) => [f.id, textFingerprint(f.text)]));
    const points = files['success-points'].find((e) => e.entityId === id)?.points ?? [];
    const livePoints = points.filter((p) => factHash.get(p.factId) === p.factHash);
    const detailBy = new Map(files['detail-lines'].filter((l) => l.entityId === id).map((l) => [l.analysisId, l]));
    const need: DisplayNeed = {
      list: !!summary && !linked(files['list-lines'].find((l) => l.entityId === id)),
      summary: !!summary && !linked(files['summary-lines'].find((l) => l.entityId === id)),
      success: livePoints.length < 3,
      // 一覧の文を作り直す時は、章の紐付けも一覧の文に合わせて作り直す
      chapters: !!summary && (chapterNeed.has(id) || !linked(files['list-lines'].find((l) => l.entityId === id))),
      detail: shownAnalysis(reader).filter((a) => detailBy.get(a.id)?.textHash !== textFingerprint(a.text)).map((a) => a.id),
    };
    if (needsAnything(need)) out.push({ entityId: id, need });
  }
  return out;
}

/** 分析項目の問い（data/item-contract.json）。無い項目は画面の項目名を問いにする */
export type ItemContract = Record<string, { must: string; question: string; mustNot?: string; mustAll?: string[] }>;

export interface Material {
  entityId: string;
  name?: string;
  needed: { list: boolean; summary: boolean; success: boolean; chapters: string[] | false; detail: string[] };
  /** 要約の事実（一覧の文と概要は、これを読む人向けに直したもの） */
  summaryFact?: { id: string; text: string };
  facts: Array<{ id: string; kind?: string; text: string; who?: string; sourceUrl?: string }>;
  metrics: Array<{ id: string; what: string; period: string; amount: number; unit?: string; who?: string; sourceUrl?: string }>;
  analysis: Array<{ id: string; item: string; question: string; text: string; basis: readonly string[]; mustWords?: string; mustNotWords?: string; mustAllWords?: string[] }>;
  /** すでに画面に出ている、この事例の文（作り直さない層。同じ数字・出来事を繰り返さないために見せる） */
  existing: Partial<{ list: string; summary: string; success: Array<{ head: string; body: string }>; detail: Array<{ analysisId: string; answer: string; note?: string }> }>;
  /** 他の事例の、仕上がった文の見本（文の形と言い回しの手本。中身は使い回さない） */
  examples: Array<Record<string, unknown>>;
}

/** 今の事実の指紋に結ばれている、すでにある成功の秘訣（古くなった点は含めない） */
export function liveSuccessPoints(entityId: string, reader: LiveReader, files: DisplayFiles): SuccessPoint[] {
  const factHash = new Map(reader.facts.map((f) => [f.id, textFingerprint(f.text)]));
  return (files['success-points'].find((e) => e.entityId === entityId)?.points ?? []).filter((p) => factHash.get(p.factId) === p.factHash);
}

/** AIに渡す材料を作る。紐付けの値（指紋）はAIに見せない（AIは id だけを返し、指紋はここで付け直す） */
export function buildMaterial(entityId: string, reader: LiveReader, need: DisplayNeed, opts: { name?: string; contract: ItemContract; files: DisplayFiles; exampleIds: readonly string[] }): Material {
  const { files, contract } = opts;
  const url = new Map(reader.sources.map((s) => [s.id, s.url]));
  const summary = reader.facts.find((f) => f.id === reader.summaryFactId);
  const live = (id: string) => (need.detail.includes(id) ? null : files['detail-lines'].find((l) => l.entityId === entityId && l.analysisId === id && !l.hidden));
  const listLine = files['list-lines'].find((l) => l.entityId === entityId);
  const summaryLine = files['summary-lines'].find((l) => l.entityId === entityId);
  const existing: Material['existing'] = {};
  if (!need.list && listLine) existing.list = listLine.text;
  if (!need.summary && summaryLine) existing.summary = summaryLine.text;
  // 成功の秘訣は、足りない時も、今の事実に結ばれた有効な点は残す（AIには足りない分だけ作らせる）
  const keptSuccess = liveSuccessPoints(entityId, reader, files);
  if (!need.success || keptSuccess.length) existing.success = (need.success ? keptSuccess : files['success-points'].find((e) => e.entityId === entityId)?.points ?? []).map(({ head, body }) => ({ head, body }));
  const keptDetail = shownAnalysis(reader).map((a) => live(a.id)).filter((l): l is DetailLine => !!l);
  if (keptDetail.length) existing.detail = keptDetail.map(({ analysisId, answer, note }) => ({ analysisId, answer, ...(note ? { note } : {}) }));
  return {
    entityId,
    ...(opts.name ? { name: opts.name } : {}),
    needed: { list: need.list, summary: need.summary, success: need.success, chapters: need.chapters ? [...CHAPTER_IDS] : false, detail: need.detail },
    ...(summary ? { summaryFact: { id: summary.id, text: summary.text } } : {}),
    facts: reader.facts.map((f) => ({ id: f.id, kind: f.kind, text: f.text, who: f.attribution, sourceUrl: url.get(f.sourceId) })),
    metrics: reader.metrics.map((m) => ({ id: m.id, what: m.label ?? m.measure, period: m.period, amount: m.amount, unit: m.currency ?? m.unit, who: m.origin, sourceUrl: url.get(m.sourceId) })),
    analysis: shownAnalysis(reader).map((a) => {
      const rule = contract[a.item];
      return {
        id: a.id, item: a.item, question: rule?.question ?? a.item, text: a.text, basis: a.basis ?? [],
        ...(rule && rule.must !== '.' ? { mustWords: rule.must } : {}),
        ...(rule?.mustNot ? { mustNotWords: rule.mustNot } : {}),
        ...(rule?.mustAll ? { mustAllWords: rule.mustAll } : {}),
      };
    }),
    existing,
    examples: opts.exampleIds.filter((id) => id !== entityId).map((id) => exampleOf(id, files)),
  };
}

/** 見本の1事例。長くなりすぎないよう、章は各2行まで、分析欄は5行までにする */
export function exampleOf(entityId: string, files: DisplayFiles): Record<string, unknown> {
  const chapters = files['case-chapters'].find((e) => e.entityId === entityId)?.chapters ?? {};
  return {
    entityId,
    list: files['list-lines'].find((l) => l.entityId === entityId)?.text,
    summary: files['summary-lines'].find((l) => l.entityId === entityId)?.text,
    detail: files['detail-lines'].filter((l) => l.entityId === entityId && !l.hidden).slice(0, 5).map(({ analysisId, answer, note }) => ({ analysisId, answer, note: note ?? '' })),
    success: (files['success-points'].find((e) => e.entityId === entityId)?.points ?? []).map(({ head, body }) => ({ head, body })),
    chapters: Object.fromEntries(Object.entries(chapters).map(([k, rows]) => [k, (rows ?? []).slice(0, 2).map((r) => r.text)])),
  };
}

/** AIの出力の形（JSON スキーマ）。OpenAI の構造化出力の制約（全ての欄が必須・追加の欄なし）にも合わせる */
export function outputSchema(): Record<string, unknown> {
  const str = { type: 'string' };
  const obj = (properties: Record<string, unknown>) => ({ type: 'object', properties, required: Object.keys(properties), additionalProperties: false });
  const row = obj({ text: str, factId: str });
  return obj({
    list: str,
    summary: str,
    detail: { type: 'array', items: obj({ analysisId: str, answer: str, note: str, hidden: { type: 'boolean' } }) },
    success: { type: 'array', items: obj({ head: str, body: str, factId: str }) },
    chapters: obj(Object.fromEntries(CHAPTER_IDS.map((id) => [id, { type: 'array', items: row }]))),
  });
}

export interface AiOutput {
  list: string;
  summary: string;
  detail: Array<{ analysisId: string; answer: string; note: string; hidden: boolean }>;
  success: Array<{ head: string; body: string; factId: string }>;
  chapters: Record<string, Array<{ text: string; factId: string }>>;
}

/** 反映する、その事例の分（必要な層だけ） */
export interface EntityDisplay {
  list?: ListLine;
  summary?: ListLine;
  detail: DetailLine[];
  success?: SuccessEntry;
  chapters?: ChapterEntry;
}

/**
 * AIの出力に、紐付け（指紋）と出典URLを機械で付ける。AIが材料に無い id を返した行は落とし、理由を返す（検査に回して直させる）。
 */
export function assembleDisplay(entityId: string, reader: LiveReader, need: DisplayNeed, out: AiOutput, keptSuccess: readonly SuccessPoint[] = []): { display: EntityDisplay; problems: string[] } {
  const problems: string[] = [];
  const facts = new Map(reader.facts.map((f) => [f.id, f]));
  const metrics = new Map(reader.metrics.map((m) => [m.id, m]));
  const url = new Map(reader.sources.map((s) => [s.id, s.url]));
  const summary = reader.facts.find((f) => f.id === reader.summaryFactId);
  const anchor = summary ? { entityId, factId: summary.id, factHash: textFingerprint(summary.text) } : null;
  const display: EntityDisplay = { detail: [] };
  if (need.list && anchor) display.list = { ...anchor, text: out.list.trim() };
  if (need.summary && anchor) display.summary = { ...anchor, text: out.summary.trim() };
  const analysis = new Map(reader.analysis.map((a) => [a.id, a]));
  const seen = new Set<string>();
  for (const line of out.detail) {
    const a = analysis.get(line.analysisId);
    if (!need.detail.includes(line.analysisId) || !a) { problems.push(`detail ${line.analysisId}: 作る対象の分析項目ではない（needed.detail の id だけを返す）`); continue; }
    if (seen.has(a.id)) { problems.push(`detail ${a.id}: 同じ項目を2回返した`); continue; }
    seen.add(a.id);
    const note = line.note.trim();
    display.detail.push({ entityId, analysisId: a.id, textHash: textFingerprint(a.text), answer: line.answer.trim(), ...(note ? { note } : {}), ...(line.hidden ? { hidden: true } : {}) });
  }
  for (const id of need.detail) if (!seen.has(id)) problems.push(`detail ${id}: 文が無い（材料に答えが無ければ hidden: true で返す）`);
  if (need.success) {
    const points: SuccessPoint[] = [...keptSuccess];
    for (const p of out.success.slice(0, Math.max(0, 5 - keptSuccess.length))) {
      const fact = facts.get(p.factId);
      if (!fact) { problems.push(`success「${p.head.slice(0, 20)}」: factId ${p.factId} が事実の一覧に無い（facts の id を使う）`); continue; }
      points.push({ head: p.head.trim(), body: p.body.trim(), factId: fact.id, factHash: textFingerprint(fact.text) });
    }
    display.success = { entityId, points };
  }
  if (need.chapters && anchor) {
    const chapters: ChapterEntry['chapters'] = {};
    for (const id of CHAPTER_IDS) {
      const rows = [];
      for (const row of out.chapters[id] ?? []) {
        const source = facts.get(row.factId)?.sourceId ?? metrics.get(row.factId)?.sourceId;
        const href = source ? url.get(source) : undefined;
        if (!href) { problems.push(`chapters ${id}「${row.text.slice(0, 20)}」: factId ${row.factId} が事実・数字の一覧に無い（出典URLを付けられない）`); continue; }
        rows.push({ text: row.text.trim(), source: href });
      }
      if (rows.length) chapters[id] = rows;
    }
    display.chapters = { ...anchor, chapters };
  }
  return { display, problems };
}

/** 一覧の文と概要の2文目が同じ事を繰り返していないか、章・秘訣・分析欄の行の中で同じ文を2回出していないかなど、検査スクリプトが見ない形の約束 */
export function structuralProblems(display: EntityDisplay): string[] {
  const problems: string[] = [];
  if (display.list && display.summary && display.summary.text && display.summary.text.startsWith(display.list.text)) problems.push('summary: 1文目（一覧の文）を繰り返している。2文目以降だけを書く');
  for (const [id, rows] of Object.entries(display.chapters?.chapters ?? {})) {
    if (id === 'timeline') {
      for (const row of rows ?? []) if (!/^\d{4}年/.test(row.text)) problems.push(`chapters timeline「${row.text.slice(0, 20)}」: 年（「2014年6月: 」の形）で始まっていない`);
      const years = (rows ?? []).map((r) => Number(r.text.slice(0, 4))).filter(Number.isFinite);
      if (years.some((y, i) => i > 0 && y < years[i - 1])) problems.push('chapters timeline: 古い順に並んでいない');
    }
  }
  const all = [...(display.chapters ? Object.values(display.chapters.chapters).flat().map((r) => r!.text) : []), ...(display.success?.points.map((p) => p.head) ?? []), ...display.detail.map((d) => d.answer)];
  const dup = all.filter((t, i) => all.indexOf(t) !== i);
  for (const t of new Set(dup)) problems.push(`同じ文を2か所に出している「${t.slice(0, 20)}」`);
  return problems;
}

// ---------- 確認役に渡す候補（行ごとに番号を付ける）と、指摘された行を外す ----------

/** 確認役に見せる候補。各行に id（list / summary / detail.<analysisId> / success.<i> / chapters.<章>.<i>）を付け、指摘を行に結べるようにする */
export function reviewRows(display: EntityDisplay): Array<{ id: string; text: string; basis?: string }> {
  const rows: Array<{ id: string; text: string; basis?: string }> = [];
  if (display.list) rows.push({ id: 'list', text: display.list.text });
  if (display.summary) rows.push({ id: 'summary', text: display.summary.text });
  for (const d of display.detail) rows.push({ id: `detail.${d.analysisId}`, text: `${d.hidden ? '［出さない］' : ''}答え: ${d.answer}${d.note ? ` ／補足: ${d.note}` : ''}` });
  display.success?.points.forEach((p, i) => rows.push({ id: `success.${i}`, text: `見出し: ${p.head} ／本文: ${p.body}`, basis: p.factId }));
  for (const [chapter, list] of Object.entries(display.chapters?.chapters ?? {})) (list ?? []).forEach((r, i) => rows.push({ id: `chapters.${chapter}.${i}`, text: r.text, basis: r.source }));
  return rows;
}

/**
 * 確認役が「必須」で指摘した行を外す（最後の手段。外しても新しい主張は増えないので、残りの行は同じ確認を通ったまま）。
 * 外せるのは章の行と、残りが3点以上になる成功の秘訣だけ。一覧・概要・分析欄の文は外すと画面が崩れるので外さず blocked で返す。
 */
export function dropFlagged(display: EntityDisplay, ids: readonly string[]): { display: EntityDisplay; dropped: string[]; blocked: string[] } {
  const want = new Set(ids);
  const blocked = ids.filter((id) => !/^(chapters\.\w+\.\d+|success\.\d+)$/.test(id));
  const success = display.success && { ...display.success, points: display.success.points.filter((_, i) => !want.has(`success.${i}`)) };
  if (success && success.points.length < 3 && display.success!.points.length !== success.points.length) blocked.push(...ids.filter((id) => id.startsWith('success.')));
  if (blocked.length) return { display, dropped: [], blocked: [...new Set(blocked)] };
  const chapters = display.chapters && {
    ...display.chapters,
    chapters: Object.fromEntries(Object.entries(display.chapters.chapters)
      .map(([k, list]) => [k, (list ?? []).filter((_, i) => !want.has(`chapters.${k}.${i}`))] as const)
      .filter(([, list]) => list.length > 0)),
  };
  return { display: { ...display, ...(success ? { success } : {}), ...(chapters ? { chapters } : {}) }, dropped: [...ids], blocked: [] };
}

// ---------- 数字の突き合わせ（AIが材料に無い数字を足していないか） ----------

/** 円換算の固定の概算（docs/CASE_TEXT_STANDARD.md）。ラック（10万）・クロール（1,000万）を挟む換算も許す */
const YEN_RATES = [1, 150, 1.75, 165, 195, 1e5 * 1.75, 1e7 * 1.75];
const RUPEE_UNITS = [1, 1e5, 1e7];
const MULT: Record<string, number> = { 千: 1e3, 万: 1e4, 億: 1e8 };
const NUMBER = /(\d+(?:,\d{3})*(?:\.\d+)?)\s*(千|万|億)?\s*(円|ルピー)?/g;

/** 文の中の数字と、直後の単位（円・ルピー）を取り出す（「17.5万人」→175000、「約2.4億円」→240000000 と円） */
export function extractAmounts(text: string): Array<{ value: number; unit?: '円' | 'ルピー' }> {
  const out: Array<{ value: number; unit?: '円' | 'ルピー' }> = [];
  for (const m of text.normalize('NFKC').matchAll(NUMBER)) {
    const base = Number(m[1].replace(/,/g, ''));
    if (Number.isFinite(base)) out.push({ value: base * (m[2] ? MULT[m[2]] : 1), ...(m[3] ? { unit: m[3] as '円' | 'ルピー' } : {}) });
  }
  return out;
}

/** 文の中の数字を値として取り出す。年月日の数字もそのまま取る */
export const extractNumbers = (text: string): number[] => extractAmounts(text).map((a) => a.value);

/** 材料（事実・数字・分析）の文と値から、使ってよい数字の集合を作る */
export function materialNumbers(reader: LiveReader): number[] {
  const nums = [
    ...reader.facts.flatMap((f) => extractNumbers(f.text)),
    ...reader.analysis.flatMap((a) => extractNumbers(a.text)),
    ...reader.metrics.flatMap((m) => [m.amount, ...extractNumbers(m.period), ...extractNumbers(m.basis ?? ''), ...extractNumbers(m.label ?? '')]),
  ];
  return [...new Set(nums)];
}

/**
 * 材料に無い数字。12以下の小さい数（月・人数の小さい値・割合の「1割」など）は言い換えが多く誤検知になるので見ない。
 * 「円」の付いた数字だけは円換算の概算を許す（±8%）。「ルピー」はラック・クロールの読み替えを許す。それ以外は材料の値と一致（±0.5%）する事。
 */
export function unsupportedNumbers(text: string, material: readonly number[]): number[] {
  const near = (v: number, target: number, tol: number) => target !== 0 && Math.abs(v - target) / target <= tol;
  return extractAmounts(text).filter(({ value, unit }) => value > 12 && !material.some((m) => (
    unit === '円' ? YEN_RATES.some((k) => near(value, m * k, k === 1 ? 0.005 : 0.08))
      : unit === 'ルピー' ? RUPEE_UNITS.some((k) => near(value, m * k, 0.005))
        : near(value, m, 0.005)
  ))).map((a) => a.value);
}

export function numberProblems(display: EntityDisplay, material: readonly number[]): string[] {
  const rows: Array<[string, string]> = [];
  if (display.list) rows.push(['list', display.list.text]);
  if (display.summary) rows.push(['summary', display.summary.text]);
  for (const d of display.detail) rows.push([`detail ${d.analysisId}`, `${d.answer} ${d.note ?? ''}`]);
  for (const p of display.success?.points ?? []) rows.push([`success「${p.head.slice(0, 15)}」`, `${p.head} ${p.body}`]);
  for (const [id, list] of Object.entries(display.chapters?.chapters ?? {})) for (const r of list ?? []) rows.push([`chapters ${id}「${r.text.slice(0, 15)}」`, r.text]);
  return rows.flatMap(([where, text]) => {
    const bad = unsupportedNumbers(text, material);
    return bad.length ? [`${where}: 材料に無い数字 ${bad.join('、')}（材料の数字だけを使う。円換算は 1ドル=150円 などの固定の概算で）`] : [];
  });
}

// ---------- 検査の落ち理由の整形 ----------

/** 検査スクリプトの出力から、違反の行だけを取り出す */
export function parseCheckOutput(output: string): string[] {
  return output.split('\n').map((l) => l.trim()).filter((l) => /^(detail-lines|success-points|case-chapters|list-lines|summary-lines|分析欄) /.test(l));
}

/** 差し替え後の違反のうち、差し替え前に無かった物（＝今回の事例の文が起こした違反）だけを返す */
export function newProblems(before: readonly string[], after: readonly string[]): string[] {
  const base = new Set(before);
  return after.filter((l) => !base.has(l));
}

// ---------- 反映（その事例の分だけ差し替え） ----------

/** その事例の分だけを置換・追加する。他の事例の要素は順番も中身も変えない。元の配列は変更しない */
export function mergeEntity(files: DisplayFiles, entityId: string, display: EntityDisplay): DisplayFiles {
  const upsert = <T extends { entityId: string }>(list: T[], item: T | undefined): T[] => {
    if (!item) return list;
    const i = list.findIndex((x) => x.entityId === entityId);
    return i < 0 ? [...list, item] : list.map((x, j) => (j === i ? item : x));
  };
  const replaced = new Set(display.detail.map((d) => d.analysisId));
  const detail = files['detail-lines'];
  const firstOfEntity = detail.findIndex((l) => l.entityId === entityId);
  const kept = detail.filter((l) => !(l.entityId === entityId && replaced.has(l.analysisId)));
  // 同じ事例の行はまとめて置く（残った同じ事例の行の後ろ。全部差し替えなら元の先頭の位置。無ければ末尾）
  const lastOfEntity = kept.map((l) => l.entityId).lastIndexOf(entityId);
  const insertAt = lastOfEntity >= 0 ? lastOfEntity + 1 : firstOfEntity >= 0 ? firstOfEntity : kept.length;
  const nextDetail = [...kept.slice(0, insertAt), ...display.detail, ...kept.slice(insertAt)];
  return {
    'list-lines': upsert(files['list-lines'], display.list),
    'summary-lines': upsert(files['summary-lines'], display.summary),
    'detail-lines': nextDetail,
    'success-points': upsert(files['success-points'], display.success),
    'case-chapters': upsert(files['case-chapters'], display.chapters),
  };
}

/** 書き出しの形（既存ファイルと同じ2字下げ＋末尾の改行） */
export const serialize = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;

// ---------- 言い回しだけの直し（日本語の自然さ・読む人に要らない情報の関門に落ちた文を、1行ずつ直す） ----------
// 層ごと作り直すと、問題の無い行（章の行・選んだ事実）まで入れ替わって減る（2026-10-07 実測: Codementor の章が30行→数行）。
// そこで、落ちた文だけを取り出し、同じ行の位置・紐付け（factId・指紋・出典URL）を保ったまま、文だけを差し替える。

/** 直す1行。id は確認役と同じ形（list / summary / detail.<id>.answer|note / success.<i>.head|body / chapters.<章>.<i>） */
export interface RepairRow { id: string; text: string; problems: string[] }

/** その事例の、今の画面の文のうち関門に落ちる行。check は「料金の欄か」を受け取り、理由（無ければ []）を返す */
export function repairRows(entityId: string, files: DisplayFiles, check: (text: string, ctx: { price: boolean }) => string[]): RepairRow[] {
  const rows: RepairRow[] = [];
  const add = (id: string, text: string | undefined, price = false) => {
    if (!text) return;
    const problems = check(text, { price });
    if (problems.length) rows.push({ id, text, problems });
  };
  add('list', files['list-lines'].find((l) => l.entityId === entityId)?.text);
  add('summary', files['summary-lines'].find((l) => l.entityId === entityId)?.text);
  for (const l of files['detail-lines'].filter((x) => x.entityId === entityId && !x.hidden)) {
    const price = /pricing/i.test(l.analysisId);
    add(`detail.${l.analysisId}.answer`, l.answer, price);
    add(`detail.${l.analysisId}.note`, l.note, price);
  }
  (files['success-points'].find((e) => e.entityId === entityId)?.points ?? []).forEach((p, i) => { add(`success.${i}.head`, p.head); add(`success.${i}.body`, p.body); });
  for (const [chapter, list] of Object.entries(files['case-chapters'].find((e) => e.entityId === entityId)?.chapters ?? {})) (list ?? []).forEach((r, i) => add(`chapters.${chapter}.${i}`, r.text, chapter === 'price'));
  return rows;
}

/** 直した文を、同じ行の位置に差し替える（紐付け・出典はそのまま）。知らない id・空の文は problems に返して差し替えない */
export function applyRepairs(files: DisplayFiles, entityId: string, fixes: ReadonlyArray<{ id: string; text: string }>): { files: DisplayFiles; problems: string[] } {
  const next: DisplayFiles = JSON.parse(JSON.stringify(files)) as DisplayFiles;
  const problems: string[] = [];
  for (const { id, text } of fixes) {
    const value = text.trim();
    if (!value) { problems.push(`${id}: 空の文は置けない（材料で支えられる文に直す）`); continue; }
    const [layer, a, b] = id.split('.');
    let done = false;
    if (layer === 'list' || layer === 'summary') {
      const line = next[layer === 'list' ? 'list-lines' : 'summary-lines'].find((l) => l.entityId === entityId);
      if (line) { line.text = value; done = true; }
    } else if (layer === 'detail' && (b === 'answer' || b === 'note')) {
      const line = next['detail-lines'].find((l) => l.entityId === entityId && l.analysisId === a);
      if (line) { line[b] = value; done = true; }
    } else if (layer === 'success' && (b === 'head' || b === 'body')) {
      const point = next['success-points'].find((e) => e.entityId === entityId)?.points[Number(a)];
      if (point) { point[b] = value; done = true; }
    } else if (layer === 'chapters') {
      const row = (next['case-chapters'].find((e) => e.entityId === entityId)?.chapters as Record<string, Array<{ text: string }>> | undefined)?.[a]?.[Number(b)];
      if (row) { row.text = value; done = true; }
    }
    if (!done) problems.push(`${id}: 直す対象の行ではない（rows の id だけを返す）`);
  }
  return { files: next, problems };
}

/** 言い回しの直しの出力の形 */
export function repairSchema(): Record<string, unknown> {
  const str = { type: 'string' };
  return { type: 'object', properties: { rows: { type: 'array', items: { type: 'object', properties: { id: str, text: str }, required: ['id', 'text'], additionalProperties: false } } }, required: ['rows'], additionalProperties: false };
}
