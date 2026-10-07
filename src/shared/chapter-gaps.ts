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
  /** 章はあるが、一覧の元の事実と紐付かず画面に出ない事例（事例の文が変わった等） */
  stale: string[];
  /** 章が画面に出る事例 */
  ready: string[];
}

export function chapterGaps(finishedIds: readonly string[], chapters: readonly GapEntry[], listLines: readonly GapEntry[]): ChapterGaps {
  const chapterBy = new Map(chapters.map((entry) => [entry.entityId, entry]));
  const lineBy = new Map(listLines.map((entry) => [entry.entityId, entry]));
  const gaps: ChapterGaps = { missing: [], stale: [], ready: [] };
  for (const id of finishedIds) {
    const chapter = chapterBy.get(id);
    if (!chapter) { gaps.missing.push(id); continue; }
    const line = lineBy.get(id);
    if (line && line.factId === chapter.factId && line.factHash === chapter.factHash) gaps.ready.push(id);
    else gaps.stale.push(id);
  }
  return gaps;
}
