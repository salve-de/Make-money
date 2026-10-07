import chapters from '../../data/case-chapters.json';
import { textFingerprint } from './list-lines';

/**
 * 事例ページの追加の章（やり方の具体・つまずきと立て直し・時間順の流れ・真似るべき戦略の核・出発点・価格の変遷・客の声）。
 * 事例ごとに集めた公開情報を1行ずつ並べた画面用の編集文。各行は出典URLを持つ（画面には出さず、検査と確認用に残す）。
 * 材料の無い章は置かない（置かなければ画面にも出ない）。真似の手順にしない（その事例で起きた事の記録）。
 */
export const CHAPTER_IDS = ['practice', 'turning', 'timeline', 'core', 'start', 'price', 'voices'] as const;
export type ChapterId = (typeof CHAPTER_IDS)[number];

export interface ChapterRow {
  text: string;
  source: string;
}

interface Entry {
  entityId: string;
  factId: string;
  factHash: string;
  chapters: Partial<Record<ChapterId, ChapterRow[]>>;
}

const BY_ENTITY = new Map<string, Entry>((chapters as Entry[]).map((entry) => [entry.entityId, entry]));

/**
 * 事例の章を、決まった並びで返す。行の無い章は含めない。
 * 元の事例の要約の事実（factId）と文が一致する時だけ返す。事例が直された・取り下げられた時は、古い章を出さない。
 */
export function caseChaptersFor(entityId: string | undefined, facts: ReadonlyArray<{ id: string; text: string }>): Array<{ id: ChapterId; rows: ChapterRow[] }> {
  const entry = entityId ? BY_ENTITY.get(entityId) : undefined;
  if (!entry) return [];
  const anchor = facts.find((fact) => fact.id === entry.factId);
  if (!anchor || textFingerprint(anchor.text) !== entry.factHash) return [];
  const found = entry.chapters;
  return CHAPTER_IDS.flatMap((id) => {
    const rows = found[id];
    return rows && rows.length > 0 ? [{ id, rows }] : [];
  });
}
