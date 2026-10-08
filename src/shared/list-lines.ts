import { screenText } from './display-text';
import { textFingerprint } from './text-fingerprint';
import type { ReaderDisplay } from './reader-case';

/**
 * 一覧の下の1行（何の事業かが一瞬でわかる短い文）。事例の画面用の編集文（reader.display.listLine）で、
 * 元の要約の事実（summaryFactId）の文に紐づく。元の文が変わったら（指紋が合わなくなったら）使わず、元の要約の1文目に戻る。
 * 正本は data/list-lines.json。公開版を作る時に事例ごとの公開データへ入れる（ビルドには同梱しない）。
 */

export { textFingerprint };

/** その事例の短い1行。元の要約の事実と文が一致する時だけ返す。 */
export function listLineFor(display: ReaderDisplay | undefined, fact: { id: string; text: string }): string | null {
  const line = display?.listLine;
  if (!line || line.factId !== fact.id || line.factHash !== textFingerprint(fact.text)) return null;
  return trimLineEnd(screenText(line.text));
}

/** 一覧の1行・概要の先頭の1行は、文末を句点なしにそろえる（事例によって有無がまちまちにならないように）。 */
export function trimLineEnd(text: string): string {
  return text.replace(/[。.．]+\s*$/, '');
}
