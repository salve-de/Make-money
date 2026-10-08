import { screenText } from './display-text';
import { textFingerprint } from './text-fingerprint';
import type { ReaderDisplay } from './reader-case';

/**
 * 事実の記録の文を、読む人向けに言い直した画面用の編集文。集める層（事実・出典・数値の注記・計算の前提）は変えず、画面の層だけに置く。
 * 正本は data/fact-lines.json。公開版を作る時に事例ごとの公開データ（reader.display.factLines）へ入れる。
 * 元の文の指紋が合わなくなった（元の文が変わった）時は使わず、元の文のまま出す。
 * 外貨の円換算は、ここでは書かず、返す時に screenText がコードで付ける（AI に円を書かせない）。
 */
export type FactLineKind = 'fact' | 'basis' | 'period' | 'formula' | 'analysis';

/** 元の文に結ばれた言い直し。無い・元の文が変わっていれば null。 */
export function factLineFor(display: ReaderDisplay | undefined, kind: FactLineKind, targetId: string, original: string): string | null {
  const line = display?.factLines?.find((x) => x.kind === kind && x.targetId === targetId);
  if (!line || line.hash !== textFingerprint(original)) return null;
  return screenText(line.text);
}

/** 画面に出す文: 言い直しがあればそれ、無ければ元の文（円換算は screenText が付ける）。 */
export function factLineOr(display: ReaderDisplay | undefined, kind: FactLineKind, targetId: string, original: string, fallback: (text: string) => string): string {
  return factLineFor(display, kind, targetId, original) ?? fallback(original);
}
