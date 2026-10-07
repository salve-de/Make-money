import { screenText } from './display-text';
import type { ReaderDisplay } from './reader-case';

/**
 * 一覧の下の1行（何の事業かが一瞬でわかる短い文）。事例の画面用の編集文（reader.display.listLine）で、
 * 元の要約の事実（summaryFactId）の文に紐づく。元の文が変わったら（指紋が合わなくなったら）使わず、元の要約の1文目に戻る。
 * 正本は data/list-lines.json。公開版を作る時に事例ごとの公開データへ入れる（ビルドには同梱しない）。
 */

/** 文字列の短い指紋（FNV-1a 32bit）。改ざん検知ではなく、元の文が変わったことの検知に使う。 */
export function textFingerprint(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

/** その事例の短い1行。元の要約の事実と文が一致する時だけ返す。 */
export function listLineFor(display: ReaderDisplay | undefined, fact: { id: string; text: string }): string | null {
  const line = display?.listLine;
  if (!line || line.factId !== fact.id || line.factHash !== textFingerprint(fact.text)) return null;
  return screenText(line.text);
}
