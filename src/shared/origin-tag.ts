/**
 * 文末の出どころの印（「（本人）」「（公式）」「（第三者）」「（本人申告）」「（本人ブログ）」など）を、章の本文から外す。
 * 出どころはデータ（出典URLと出所の区分）に残してあり、章の末尾の「出典1」「出典2」にまとめる。
 * 「（本人、2018年5月）」「（公式、選別あり）」のように時点や但し書きが付いている時は、印だけ外して「（2018年5月）」のように残す。
 */
const ORIGIN_TAG = /\s*（((?:本人|公式|第三者|記事)[^、）]*)(?:、([^）]*))?）(?=。?$)/;
const ORIGIN_WORDS_ONLY = /^(?:本人|公式|第三者|記事|[・、,\s])+$/;

export function stripOriginTag(text: string): string {
  return text.replace(ORIGIN_TAG, (_m, _label: string, rest: string | undefined) => {
    const kept = rest?.trim();
    return kept && !ORIGIN_WORDS_ONLY.test(kept) ? `（${kept}）` : '';
  });
}
