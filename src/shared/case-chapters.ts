import { textFingerprint } from './list-lines';
import { screenText } from './display-text';
import type { ReaderDisplay } from './reader-case';

/**
 * 事例ページの追加の章（実際にやったこと・つまずきと立て直し・時間順の流れ・真似るべき戦略の核・出発点・価格の変遷・客の声）。
 * 事例ごとに集めた公開情報を1行ずつ並べた画面用の編集文（reader.display.chapters。正本は data/case-chapters.json）。各行は出典URLを持つ（画面には出さず、検査と確認用に残す）。
 * 材料の無い章は置かない（置かなければ画面にも出ない）。真似の手順にしない（その事例で起きた事の記録）。
 * 文末の出どころの印（「（本人）」「（公式）」「（第三者）」など）は、データには残し、画面に出す時に外す。
 */
export const CHAPTER_IDS = ['practice', 'turning', 'timeline', 'core', 'start', 'price', 'voices'] as const;
export type ChapterId = (typeof CHAPTER_IDS)[number];

export interface ChapterRow {
  text: string;
  source: string;
}

/**
 * 事例の章を、決まった並びで返す。行の無い章は含めない。
 * 元の事例の要約の事実（factId）と文が一致する時だけ返す。事例が直された・取り下げられた時は、古い章を出さない。
 */
export function caseChaptersFor(display: ReaderDisplay | undefined, facts: ReadonlyArray<{ id: string; text: string }>): Array<{ id: ChapterId; rows: ChapterRow[]; factId: string }> {
  const entry = display?.chapters;
  if (!entry) return [];
  const anchor = facts.find((fact) => fact.id === entry.factId);
  if (!anchor || textFingerprint(anchor.text) !== entry.factHash) return [];
  const found: Record<string, ChapterRow[] | undefined> = entry.chapters;
  return CHAPTER_IDS.flatMap((id) => {
    const rows = found[id];
    return rows && rows.length > 0 ? [{ id, factId: entry.factId, rows: rows.map((row) => ({ ...row, text: screenText(row.text) })) }] : [];
  });
}
