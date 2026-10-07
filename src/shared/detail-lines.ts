import { textFingerprint } from './list-lines';
import { screenText } from './display-text';
import type { ReaderDisplay } from './reader-case';

/**
 * 詳細の各章の「見出し＝答え」の言い切り。事例の画面用の編集文（reader.display.detailLines。正本は data/detail-lines.json）で、
 * 元の推論（analysisId）の文に紐づく。元の文が変わったら（指紋が合わなくなったら）使わず、元の文のまま出す。
 * answer は1行の答え、note は一段薄く出す補足。元の文に無い事実は足さない。
 */
export function detailLineFor(display: ReaderDisplay | undefined, analysis: { id: string; text: string }): { answer: string; note?: string; hidden?: boolean } | null {
  // hidden: 項目名に答える中身が材料に無い時、その項目ごと画面に出さない（「分からない」と書かずに消す）
  const line = display?.detailLines?.find((x) => x.analysisId === analysis.id);
  if (!line || line.textHash !== textFingerprint(analysis.text)) return null;
  return { answer: screenText(line.answer), note: line.note ? screenText(line.note) : line.note, hidden: line.hidden };
}
