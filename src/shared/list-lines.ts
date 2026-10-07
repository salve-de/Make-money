import lines from '../../data/list-lines.json';

/**
 * 一覧の下の1行（何の事業かが一瞬でわかる短い文）。事例データ本体とは別に持つ画面用の編集文で、
 * 元の要約の事実（summaryFactId）の文に紐づく。元の文が変わったら（指紋が合わなくなったら）使わず、元の要約の1文目に戻る。
 */
interface ListLine {
  entityId: string;
  factId: string;
  factHash: string;
  text: string;
}

/** 文字列の短い指紋（FNV-1a 32bit）。改ざん検知ではなく、元の文が変わったことの検知に使う。 */
export function textFingerprint(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

const BY_ENTITY = new Map<string, ListLine>((lines as ListLine[]).map((line) => [line.entityId, line]));

/** その事例の短い1行。元の要約の事実と文が一致する時だけ返す。 */
export function listLineFor(entityId: string | undefined, fact: { id: string; text: string }): string | null {
  const line = entityId ? BY_ENTITY.get(entityId) : undefined;
  if (!line || line.factId !== fact.id || line.factHash !== textFingerprint(fact.text)) return null;
  return line.text;
}
