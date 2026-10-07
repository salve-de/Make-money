import chapters from '../../data/case-chapters.json';

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
  chapters: Partial<Record<ChapterId, ChapterRow[]>>;
}

const BY_ENTITY = new Map<string, Entry['chapters']>((chapters as Entry[]).map((entry) => [entry.entityId, entry.chapters]));

/** 事例の章を、決まった並びで返す。行の無い章は含めない。 */
export function caseChaptersFor(entityId: string | undefined): Array<{ id: ChapterId; rows: ChapterRow[] }> {
  const found = entityId ? BY_ENTITY.get(entityId) : undefined;
  if (!found) return [];
  return CHAPTER_IDS.flatMap((id) => {
    const rows = found[id];
    return rows && rows.length > 0 ? [{ id, rows }] : [];
  });
}
