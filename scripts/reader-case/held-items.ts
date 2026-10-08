/**
 * 原文照合で「保留」にした項目（data/source-check/held.json）を、公開版を作る時に必ず外す。
 * 保留の反映は source-check --apply（case:run）がデータを書き換えて行うが、手で catalog:publish / catalog:prepare を
 * 実行した時にも保留の事実が画面へ出ないよう、公開版の組み立て側でも同じ一覧を読んで外す。
 *
 * 外す物: 保留の事実・数字、それを根拠にする推論、それに頼る画面の文（一覧の1行・概要・成功の秘訣・章・事実の言い直し）、保留の章の行。
 * 外さない物: 事例のほかの部分。事例全体は止めない。
 * 文が直されて保留時と違う文になった項目は、もう保留ではない（原文照合がやり直される）ので外さない。
 */
import { existsSync, readFileSync } from 'node:fs';
import type { ReaderCase, ReaderDisplay } from '../../src/shared/reader-case';
import { textFingerprint } from '../../src/shared/list-lines';
import { metricLine } from './verify-lib';
import { withoutUnaudited } from './publication-evaluation';

export const HELD_FILE = 'data/source-check/held.json';

export interface HeldRecord {
  key: string;
  entityId: string;
  kind: 'fact' | 'metric' | 'chapter';
  id: string;
  text: string;
  sourceUrl: string;
  reasons: string[];
  heldAt: string;
  chapter?: string;
}

/** 公開の結果に出す、外した項目の記録 */
export interface HeldRemoval {
  key: string;
  kind: HeldRecord['kind'];
  id: string;
  text: string;
  reasons: string[];
  /** 頼っていたため一緒に外した物（推論・画面の文） */
  dependents: string[];
}

export function readHeld(file = HELD_FILE): HeldRecord[] {
  if (!existsSync(file)) return [];
  const parsed: unknown = JSON.parse(readFileSync(file, 'utf8'));
  if (!Array.isArray(parsed)) throw new Error(`${file} は配列ではない（保留の一覧を読めない）`);
  return parsed as HeldRecord[];
}

/** 事実・数字を保留の一覧で外し、それに頼る推論も外す。 */
export function withoutHeldClaims(reader: ReaderCase, held: readonly HeldRecord[]): { reader: ReaderCase; removed: HeldRemoval[]; removedIds: Set<string> } {
  const removed: HeldRemoval[] = [];
  const keys: string[] = [];
  for (const h of held) {
    if (h.kind === 'fact') {
      const f = reader.facts.find((x) => x.id === h.id);
      if (f && f.text === h.text) { keys.push(`fact:${f.id}`); removed.push({ key: h.key, kind: 'fact', id: h.id, text: h.text, reasons: h.reasons, dependents: [] }); }
    } else if (h.kind === 'metric') {
      const m = reader.metrics.find((x) => x.id === h.id);
      if (m && metricLine(m) === h.text) { keys.push(`metric:${m.id}`); removed.push({ key: h.key, kind: 'metric', id: h.id, text: h.text, reasons: h.reasons, dependents: [] }); }
    }
  }
  if (!keys.length) return { reader, removed, removedIds: new Set() };
  const next = withoutUnaudited(reader, keys);
  const gone = new Set(keys.map((k) => k.split(':')[1]));
  const liveAnalysis = new Set(next.analysis.map((a) => a.id));
  const droppedAnalysis = reader.analysis.filter((a) => !liveAnalysis.has(a.id));
  for (const r of removed) {
    r.dependents.push(...droppedAnalysis.filter((a) => a.basis.includes(r.id)).map((a) => `analysis:${a.id}`));
  }
  const removedIds = new Set<string>([...gone, ...droppedAnalysis.map((a) => a.id)]);
  return { reader: next, removed, removedIds };
}

/** 画面の文のうち、外した事実・推論に頼る物と、保留の章の行を外す。 */
export function withoutHeldDisplay(display: ReaderDisplay | undefined, removedIds: ReadonlySet<string>, held: readonly HeldRecord[], removed: HeldRemoval[] = []): ReaderDisplay | undefined {
  if (!display) return display;
  const next: ReaderDisplay = { ...display };
  const note = (what: string, factId: string) => { for (const r of removed) if (r.id === factId || r.dependents.includes(`analysis:${factId}`)) r.dependents.push(what); };
  if (next.listLine && removedIds.has(next.listLine.factId)) { note('display:listLine', next.listLine.factId); delete next.listLine; }
  if (next.summaryRest && removedIds.has(next.summaryRest.factId)) { note('display:summaryRest', next.summaryRest.factId); delete next.summaryRest; }
  if (next.successPoints) {
    const kept = next.successPoints.filter((p) => !removedIds.has(p.factId));
    for (const p of next.successPoints) if (removedIds.has(p.factId)) note('display:successPoints', p.factId);
    if (kept.length) next.successPoints = kept; else delete next.successPoints;
  }
  if (next.detailLines) {
    const kept = next.detailLines.filter((d) => !removedIds.has(d.analysisId));
    if (kept.length) next.detailLines = kept; else delete next.detailLines;
  }
  if (next.factLines) {
    const kept = next.factLines.filter((l) => !removedIds.has(l.targetId));
    if (kept.length) next.factLines = kept; else delete next.factLines;
  }
  if (next.chapters) {
    if (removedIds.has(next.chapters.factId)) { note('display:chapters', next.chapters.factId); delete next.chapters; }
    else {
      const heldHashes = new Map<string, Set<string>>();
      for (const h of held) if (h.kind === 'chapter' && h.chapter) heldHashes.set(h.chapter, (heldHashes.get(h.chapter) ?? new Set()).add(h.id.split(':')[1]));
      if (heldHashes.size) {
        const chapters: Record<string, Array<{ text: string; source: string }>> = {};
        for (const [name, rows] of Object.entries(next.chapters.chapters)) {
          const drop = heldHashes.get(name);
          const left = drop ? rows.filter((row) => !drop.has(textFingerprint(row.text))) : rows;
          if (left.length) chapters[name] = left;
        }
        next.chapters = { ...next.chapters, chapters };
      }
    }
  }
  return Object.keys(next).length ? next : undefined;
}

/** 保留の章の行で、この事例の画面から実際に外れた物（公開の結果に出す用） */
export function heldChapterRemovals(display: ReaderDisplay | undefined, held: readonly HeldRecord[]): HeldRemoval[] {
  if (!display?.chapters) return [];
  const out: HeldRemoval[] = [];
  for (const h of held) {
    if (h.kind !== 'chapter' || !h.chapter) continue;
    const hash = h.id.split(':')[1];
    const rows = display.chapters.chapters[h.chapter] ?? [];
    if (rows.some((row) => textFingerprint(row.text) === hash)) out.push({ key: h.key, kind: 'chapter', id: h.id, text: h.text, reasons: h.reasons, dependents: [] });
  }
  return out;
}
