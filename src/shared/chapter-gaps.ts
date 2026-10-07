import { textFingerprint } from './list-lines';

/**
 * 仕上げ済みの事例のうち、章がまだ無い・古くなっている事例を数える。
 * 新しく集めた事例が章つきで画面に出るまでの「抜け」を見つけるために使う（定期実行の入口）。
 */
export interface GapEntry {
  entityId: string;
  factId: string;
  factHash: string;
}

export interface ChapterGaps {
  /** 章が1件も無い事例 */
  missing: string[];
  /** 章はあるが、今の事実の文と紐付かず画面に出ない事例（事例の文が変わった等） */
  stale: string[];
  /** 章が画面に出る事例 */
  ready: string[];
}

/** 画面に出る実際の事実（事例ID → 要約の事実の一覧）。章の紐付けは、この今の文と照合する */
export type LiveFacts = ReadonlyMap<string, ReadonlyArray<{ id: string; text: string }>>;

export function chapterGaps(finishedIds: readonly string[], chapters: readonly GapEntry[], listLines: readonly GapEntry[], liveFacts: LiveFacts): ChapterGaps {
  const chapterBy = new Map(chapters.map((entry) => [entry.entityId, entry]));
  const lineBy = new Map(listLines.map((entry) => [entry.entityId, entry]));
  const gaps: ChapterGaps = { missing: [], stale: [], ready: [] };
  for (const id of finishedIds) {
    const chapter = chapterBy.get(id);
    if (!chapter) { gaps.missing.push(id); continue; }
    const line = lineBy.get(id);
    const live = liveFacts.get(id)?.find((fact) => fact.id === chapter.factId);
    const linked = line && line.factId === chapter.factId && line.factHash === chapter.factHash;
    if (linked && live && textFingerprint(live.text) === chapter.factHash) gaps.ready.push(id);
    else gaps.stale.push(id);
  }
  return gaps;
}
