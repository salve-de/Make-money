/**
 * 数字の事実の約束（docs/DATA_COLLECTION_MASTER_GUIDE.md「数字の5つの約束」）を機械で見る純粋な部品。
 * 2026-10-07、公開10件のうち7件で出典と食い違う数字が見つかった時の原因5つから作った。
 *
 *  1. いつ時点か: 数字には出来事の時点（年、できれば月）を持たせる。投稿日・記事の日付を出来事の日付にしない。
 *  2. 何の数字か: 売上と呼べない数字（直接の支払いだけ・取扱高・アンケートの区分・別事業）に「売上（年商・月商・累計）」を付けない。
 *  3. 突き合わせ: 同じ事例の同じ種類の数字（調達額・本数・月商）が、同じ時点で食い違っていないか。
 *  4. 時点の裏づけ: 数字の時点が、照合の引用か出典の公開日で裏づけられているか（取れなかった出典は照合に通らない）。
 *  5. 1か所の元データ: 画面の層の文の数字は、今の事実・数字・推論のどれかにある値だけ。訂正した誤りは画面のどこにも残さない。
 */
import { extractAmounts, unsupportedNumbers, materialNumbers, type DisplayFiles, type LiveReader } from './display-build';
import { textFingerprint } from './list-lines';

export interface IntegrityMetric {
  id: string;
  measure: string;
  periodKind?: string;
  period: string;
  amount: number;
  currency?: string;
  unit?: string;
  origin?: string;
  label?: string;
  basis?: string;
  sourceId: string;
  statedAt?: string;
}

const DATE = /((?:19|20)\d{2})(?:\s*[-年/.]\s*(\d{1,2})(?!\d))?/g;

/** 数字の時点（'YYYY' か 'YYYY-MM'）。statedAt を優先し、無ければ period の最後の日付（「A〜B」なら終わりの側）。無ければ null */
export function metricWhen(m: Pick<IntegrityMetric, 'period' | 'statedAt'>): string | null {
  for (const text of [m.statedAt, m.period]) {
    if (!text) continue;
    const hits = [...text.normalize('NFKC').matchAll(DATE)];
    const last = hits.at(-1);
    if (!last) continue;
    const month = last[2] ? Number(last[2]) : 0;
    return month >= 1 && month <= 12 ? `${last[1]}-${String(month).padStart(2, '0')}` : last[1];
  }
  return null;
}

/** 売上の一部・売上でない数字を表す語。measure=REVENUE（画面で「年商」「月商」「累計売上」になる）に付いていたら、名前を付け替える */
export const PARTIAL_SCOPE = /(直接の支払い|支払いだけ|寄付|取扱高|流通(総)?額|GMV|アンケート|区分|別事業|前身|一部の|のみの売上|を除く|を含まない)/;

/** 時点の出どころを言っている語（「投稿時点」「記事の掲載時」「公式の表示」など）。時点が引用に無い時は、何の時点かを period に書く */
const WHEN_SOURCE = /(投稿|記事|掲載|発表|報告|表示|公式|時点|対談|取材|インタビュー)/;

export interface VerdictLike { verdict: string; quote?: string; sourceUrl?: string }

/**
 * 事例1件の数字の問題（約束1〜4）。reader は照合を当てた後の、画面に出る形。
 * sources は publishedAt を持つ出典（時点の裏づけに使う）。
 */
export function metricProblems(
  reader: { metrics: readonly IntegrityMetric[]; sources: ReadonlyArray<{ id: string; url: string; publishedAt?: string }> },
  verdicts: Readonly<Record<string, VerdictLike>> | undefined,
): string[] {
  const problems: string[] = [];
  const sources = new Map(reader.sources.map((s) => [s.id, s]));
  for (const m of reader.metrics) {
    const where = `数字 ${m.id}（${m.label ?? m.measure} ${m.amount}${m.currency ? ` ${m.currency}` : m.unit ?? ''}・${m.period}）`;
    const when = metricWhen(m);
    // 1. いつ時点か
    if (!when) problems.push(`${where}: 時点（年）が無い。出来事の年・月を period に書く（投稿日ではなく、数字が指す時点）`);
    // 2. 何の数字か
    if (m.measure === 'REVENUE' && PARTIAL_SCOPE.test(`${m.period} ${m.label ?? ''} ${m.basis ?? ''}`)) {
      problems.push(`${where}: 売上の一部・売上でない数字に「売上」（年商・月商・累計）が付く。measure を OTHER にし、label に何の数字か（例「直接の支払い」）を書く`);
    }
    // 4. 時点の裏づけ（引用に年が無く、出典の公開年とも違い、何の時点かも書いていない）
    const v = verdicts?.[m.id];
    const year = when?.slice(0, 4);
    const published = sources.get(m.sourceId)?.publishedAt?.slice(0, 4);
    if (year && v && !(v.quote ?? '').includes(year) && published !== year && !WHEN_SOURCE.test(m.period)) {
      problems.push(`${where}: 時点 ${year} が照合の引用にも出典の公開年（${published ?? 'なし'}）にも無い。時点を裏づける出典に替えるか、何の時点か（「◯年の投稿時点」など）を period に書く`);
    }
  }
  // 3. 突き合わせ: 同じ種類・同じ時点の数字が食い違う（両方に basis で何の分かを書いていれば別の数字として通す）
  const kind = (m: IntegrityMetric) => `${m.measure}\u0000${m.measure === 'OTHER' ? m.label ?? '' : ''}\u0000${m.currency ?? m.unit ?? ''}`;
  for (let i = 0; i < reader.metrics.length; i += 1) {
    for (let j = i + 1; j < reader.metrics.length; j += 1) {
      const a = reader.metrics[i]; const b = reader.metrics[j];
      if (kind(a) !== kind(b)) continue;
      const sameWhen = metricWhen(a) !== null && metricWhen(a) === metricWhen(b);
      // 調達額は期間の種類（このラウンド／累計）が違っても、同じ時点なら突き合わせる
      const comparable = sameWhen && (a.measure === 'FUNDING' || a.periodKind === b.periodKind);
      if (!comparable || Math.abs(a.amount - b.amount) <= Math.max(a.amount, b.amount) * 0.01) continue;
      if (a.basis?.trim() && b.basis?.trim() && a.basis.trim() !== b.basis.trim()) continue;
      problems.push(`数字 ${a.id} と ${b.id}: 同じ種類（${a.label ?? a.measure}）・同じ時点（${metricWhen(a)}）で ${a.amount} と ${b.amount} が食い違う。出典で突き合わせ、別の数字なら両方の basis に何の分か（「このラウンド」「それ以前の合計」など）を書く`);
    }
  }
  return problems;
}

type Row = { where: string; text: string };

/** 画面に今出ている、この事例の画面の層の文（指紋が今の事実・推論と合う行だけ。hidden は除く） */
export function liveDisplayRows(entityId: string, reader: LiveReader, files: DisplayFiles, opts: { chapters?: boolean } = {}): Row[] {
  const rows: Row[] = [];
  const summary = reader.facts.find((f) => f.id === reader.summaryFactId);
  const anchored = (line: { factId: string; factHash: string } | undefined) => !!summary && !!line && line.factId === summary.id && line.factHash === textFingerprint(summary.text);
  const list = files['list-lines'].find((l) => l.entityId === entityId);
  if (anchored(list)) rows.push({ where: 'list-lines', text: list!.text });
  const summaryLine = files['summary-lines'].find((l) => l.entityId === entityId);
  if (anchored(summaryLine) && summaryLine!.text) rows.push({ where: 'summary-lines', text: summaryLine!.text });
  const analysis = new Map(reader.analysis.map((a) => [a.id, a]));
  for (const line of files['detail-lines']) {
    if (line.entityId !== entityId || line.hidden) continue;
    const a = analysis.get(line.analysisId);
    if (!a || textFingerprint(a.text) !== line.textHash) continue;
    rows.push({ where: `detail-lines ${line.analysisId}`, text: `${line.answer} ${line.note ?? ''}`.trim() });
  }
  const factHash = new Map(reader.facts.map((f) => [f.id, textFingerprint(f.text)]));
  for (const p of files['success-points'].find((e) => e.entityId === entityId)?.points ?? []) {
    if (factHash.get(p.factId) === p.factHash) rows.push({ where: `success-points ${p.factId}`, text: `${p.head} ${p.body}` });
  }
  if (opts.chapters) {
    const entry = files['case-chapters'].find((e) => e.entityId === entityId);
    if (anchored(entry)) for (const [id, list2] of Object.entries(entry!.chapters)) for (const r of list2 ?? []) rows.push({ where: `case-chapters ${id}`, text: r.text });
  }
  return rows;
}

/**
 * 5. 画面の層の数字は、今の事実・数字・推論にある値だけ（同じ数字を1か所の元データから作る）。
 * 章は各行が自分の出典を持つので、ここでは見ない（章の誤りは訂正の台帳の forbid で止める）。
 */
export function displayNumberProblems(entityId: string, reader: LiveReader, files: DisplayFiles): string[] {
  const material = materialNumbers(reader);
  return liveDisplayRows(entityId, reader, files).flatMap(({ where, text }) => {
    const bad = unsupportedNumbers(text, material);
    return bad.length ? [`${where}: 今の事実・数字に無い数字 ${bad.join('、')}「${text.slice(0, 30)}…」（元の事実を直したら、画面の文も作り直す）`] : [];
  });
}

/** 訂正の台帳（data/fact-corrections.json）の1件 */
export interface FactCorrection {
  id: string;
  entityId: string;
  cause: 'WHEN' | 'WHAT' | 'CONFLICT' | 'UNREACHABLE' | 'DUPLICATE';
  finding: string;
  sourceUrl: string;
  quote?: string;
  checkedAt: string;
  /** 訂正した後、この事例の画面の層（章も含む）に二度と出てはいけない文字列 */
  forbid?: string[];
  actions: CorrectionAction[];
}

export type CorrectionAction =
  | { target: 'claim'; claimId: string; fix: { text?: string; metric?: Record<string, unknown> }; quote?: string }
  | { target: 'claim'; claimId: string; unverified: string }
  | { target: 'chapter'; chapter: string; match: string; replace?: string; remove?: true }
  | { target: 'success'; factId: string; match: string; head?: string; body?: string; remove?: true }
  | { target: 'detail'; analysisId: string; match: string; answer?: string; note?: string; hidden?: true }
  | { target: 'summary'; match: string; text: string };

/** 訂正した誤りが、画面の層のどこかに残っていないか（1か所直して他が残る、を止める） */
export function forbiddenTextProblems(entityId: string, files: DisplayFiles, corrections: readonly FactCorrection[]): string[] {
  const texts: Row[] = [];
  for (const l of files['list-lines']) if (l.entityId === entityId) texts.push({ where: 'list-lines', text: l.text });
  for (const l of files['summary-lines']) if (l.entityId === entityId) texts.push({ where: 'summary-lines', text: l.text });
  for (const l of files['detail-lines']) if (l.entityId === entityId && !l.hidden) texts.push({ where: `detail-lines ${l.analysisId}`, text: `${l.answer} ${l.note ?? ''}` });
  for (const p of files['success-points'].find((e) => e.entityId === entityId)?.points ?? []) texts.push({ where: `success-points ${p.factId}`, text: `${p.head} ${p.body}` });
  for (const [id, rows] of Object.entries(files['case-chapters'].find((e) => e.entityId === entityId)?.chapters ?? {})) for (const r of rows ?? []) texts.push({ where: `case-chapters ${id}`, text: r.text });
  const problems: string[] = [];
  for (const c of corrections) {
    if (c.entityId !== entityId) continue;
    for (const bad of c.forbid ?? []) for (const t of texts) if (t.text.includes(bad)) problems.push(`${t.where}: 訂正済みの誤り（${c.id}）「${bad}」が残っている`);
  }
  return problems;
}

/** 数字の値だけを取り出す（試験用の再輸出） */
export const amountsIn = (text: string) => extractAmounts(text).map((a) => a.value);
