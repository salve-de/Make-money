/**
 * 本文にある出どころの印（「（本人）」「（公式）」「（第三者）」「（本人申告）」「（本人ブログ）」「（記事）」「（提出書類）」など）を外す。
 * 文末だけでなく、文の途中や複数の文にまたがる位置も対象にする。印と時点が並ぶ「（2025年11月、本人申告）」「（本人、2018年5月）」の両方の並びを扱う。
 * 出どころはデータ（出典URLと出所の区分）に残してあり、章の末尾の「出典1」「出典2」にまとめる。
 * 「（本人、2018年5月）」「（公式、選別あり）」のように時点や但し書きが付いている時は、印だけ外して「（2018年5月）」のように残す。
 */
const PAREN_GROUP = /\s*（([^（）]*)）/g;
const ORIGIN_PART = /^\s*(?:本人|公式|第三者|記事|提出書類)[^、]*$/;

export function stripOriginTag(text: string): string {
  return text.replace(PAREN_GROUP, (match, inner: string) => {
    const parts = inner.split('、');
    if (!parts.some((part) => ORIGIN_PART.test(part))) return match;
    const kept = parts.filter((part) => !ORIGIN_PART.test(part)).map((part) => part.trim()).filter(Boolean);
    return kept.length > 0 ? `（${kept.join('、')}）` : '';
  });
}
