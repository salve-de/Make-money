/**
 * 文末の出どころの印（「（本人）」「（公式）」「（第三者）」「（本人申告）」など）を、画面に出す文から外す。
 * 出どころはデータ（出典URLと出所の区分）に残してあり、画面では章の末尾の「出典1」「出典2」にまとめる。
 */
const ORIGIN_TAG = /\s*（(?:本人|公式|第三者|記事)[^）]*）(?=。?$)/;

export function stripOriginTag(text: string): string {
  return text.replace(ORIGIN_TAG, '');
}
