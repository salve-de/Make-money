import lines from '../../data/detail-lines.json';
import { textFingerprint } from './list-lines';
import { screenText } from './display-text';

/**
 * 詳細の各章の「見出し＝答え」の言い切り。事例データ本体とは別に持つ画面用の編集文で、
 * 元の推論（analysisId）の文に紐づく。元の文が変わったら（指紋が合わなくなったら）使わず、元の文のまま出す。
 * answer は1行の答え、note は一段薄く出す補足。元の文に無い事実は足さない。
 */
interface DetailLine {
  entityId: string;
  analysisId: string;
  textHash: string;
  answer: string;
  note?: string;
  /** 項目名に答える中身が材料に無い時、その項目ごと画面に出さない（「分からない」と書かずに消す）。 */
  hidden?: boolean;
}

const KEY = (entityId: string, analysisId: string) => `${entityId}\u0000${analysisId}`;
const BY_KEY = new Map<string, DetailLine>((lines as DetailLine[]).map((line) => [KEY(line.entityId, line.analysisId), line]));

export function detailLineFor(entityId: string | undefined, analysis: { id: string; text: string }): { answer: string; note?: string; hidden?: boolean } | null {
  const line = entityId ? BY_KEY.get(KEY(entityId, analysis.id)) : undefined;
  if (!line || line.textHash !== textFingerprint(analysis.text)) return null;
  return { answer: screenText(line.answer), note: line.note ? screenText(line.note) : line.note, hidden: line.hidden };
}
