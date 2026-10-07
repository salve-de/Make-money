import lines from '../../data/summary-lines.json';
import { textFingerprint } from './list-lines';

/**
 * 概要の2文目以降を、読む人に分かる言い方に直した画面用の編集文。
 * 元の要約の事実（factId）の文に紐づき、元の文が変わったら（指紋が合わなくなったら）使わず、元の文に戻る。
 * 1文目は一覧と同じ短い1行（list-lines）が大きく出るので、ここは2文目以降だけを持つ。
 */
interface SummaryLine {
  entityId: string;
  factId: string;
  factHash: string;
  text: string;
}

const BY_ENTITY = new Map<string, SummaryLine>((lines as SummaryLine[]).map((line) => [line.entityId, line]));

/** その事例の概要の2文目以降の編集文。元の要約の事実と文が一致する時だけ返す。 */
export function summaryRestFor(entityId: string | undefined, fact: { id: string; text: string }): string | null {
  const line = entityId ? BY_ENTITY.get(entityId) : undefined;
  if (!line || line.factId !== fact.id || line.factHash !== textFingerprint(fact.text)) return null;
  return line.text;
}
