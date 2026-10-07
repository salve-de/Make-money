/**
 * 本文にある出どころの印（「（本人）」「（公式）」「（第三者）」「（本人申告）」「（本人ブログ）」「（記事）」「（提出書類）」など）を画面では出さない。
 * 文末だけでなく、文の途中や複数の文にまたがる位置も対象にする。印と時点が並ぶ「（2025年11月、本人申告）」「（本人、2018年5月）」の両方の
 * 出どころはデータ（出典URLと出所の区分）に残してあり、章の末尾の「出典1」「出典2」にまとめる。
 * 「（本人、2018年5月）」「（公式、選別あり）」のように時点や但し書きが付いている時は、印だけ外して「（2018年5月）」のように残す。
 * 出どころの媒体の呼び名（保存ページ・インタビュー・Hacker News など）も同じく出どころなので外す。
 * 呼び名を外した後に「（6万ドル）」「（Grover）」のような中身が残るならその中身だけ残し、何も残らなければ括弧ごと消す。
 * 呼び名の一覧は scripts/reader-view/rules.mjs の ORIGIN_WORDS と同じに保つ（画面の自動監査が見る語）。
 */
const PAREN_GROUP = /\s*（([^（）]*)）/g;
const ORIGIN_PART = /^\s*(?:本人|公式|第三者|記事|提出書類)[^、]*$/;
const MEDIA_WORDS = [
  '本人', '公式', '第三者', '記事', '提出書類', '報道', '保存ページ', 'インタビュー', 'ブログ', '寄稿', '投稿', '発言', '発表',
  '導入事例', '声のページ', '選別あり', '創業者の見方', 'ポッドキャスト', '対談', '取材', '魚拓', 'プレスリリース',
  'Hacker News', 'HN', 'Indie Hackers', 'TechCrunch', 'Goodreads', 'Reddit', 'Upstarts', 'Warrior Forum', 'Cool Tools', 'Product Hunt',
];
const MEDIA_PART = new RegExp(MEDIA_WORDS.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'));
/**
 * 部分が、出どころの呼び名だけで成っているか。呼び名・日付・つなぎの語（「の」「は」「投稿コメント」「創業者の」など）を除いて何も残らない時だけ、
 * 出どころの印とみなす。数字や別の語が残る部分（「公開前のHacker News投稿で132点」「2.70は公式の「約」」）は中身のある事実なので残す。
 */
const FILLER = /創業者|作者|作家|運営者|投稿者|コメント|再掲|経由|掲載時|時点|公開前|[のはでにがと・:：、\s]|根拠/g;
const DATE = /(?:約)?[0-9]{4}(?:年(?:[0-9]{1,2}月(?:[0-9]{1,2}日)?)?|-[0-9]{2}(?:-[0-9]{2})?)?/g;
const isOriginPart = (part: string): boolean => {
  if (ORIGIN_PART.test(part)) return true;
  if (!MEDIA_PART.test(part)) return false;
  const rest = part.replace(new RegExp(MEDIA_PART.source, 'g'), '').replace(DATE, '').replace(FILLER, '');
  return rest.length === 0;
};
/** 「根拠: 」の前置きは、後ろが出どころの呼び名だけの時は一緒に外す（「（根拠: 本人の説明）」）。 */
const BASIS_PREFIX = /^\s*根拠[:：]\s*/;

export function stripOriginTag(text: string): string {
  return text.replace(PAREN_GROUP, (match, inner: string) => {
    const parts = inner.split('、').map((part) => part.trim()).filter(Boolean);
    const unprefixed = parts.map((part) => part.replace(BASIS_PREFIX, ''));
    if (!unprefixed.some(isOriginPart)) return match;
    // 時点（年月日）は出どころの呼び名とセットで付いているだけなので、他に中身が無ければ一緒に消す
    const kept = parts.filter((part, i) => !isOriginPart(unprefixed[i]));
    const removed = unprefixed.filter(isOriginPart);
    // 印だけ（本人・公式…）を外した時は、残った時点を残す。媒体の呼び名を外した時は、時点だけが残っても意味が無いので消す
    if (removed.every((part) => ORIGIN_PART.test(part))) return kept.length > 0 ? `（${kept.join('、')}）` : '';
    const meaningful = kept.filter((part) => !/^(?:約)?[0-9]{4}(?:年[0-9]{0,2}月?[0-9]{0,2}日?|-[0-9]{2}(?:-[0-9]{2})?)?(?:時点)?$/.test(part));
    return meaningful.length > 0 ? `（${kept.join('、')}）` : '';
  });
}
