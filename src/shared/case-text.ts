/**
 * 詳細画面の文章を「読める形」にする小さな関数。文の中身は変えず、区切る・短く切る・似た文を除くだけ。
 * 画面に出す文字は事実・推論の原文から作る（新しい文章は作らない）。
 */

const OPEN = '「（(『［[';
const CLOSE = '」）)』］]';

/** 文末（。！？）で区切る。かぎ括弧・かっこの中の句点では区切らない。 */
export function splitSentences(text: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let current = '';
  for (const ch of text.replace(/\s+/g, ' ').trim()) {
    current += ch;
    if (OPEN.includes(ch)) depth += 1;
    else if (CLOSE.includes(ch)) depth = Math.max(0, depth - 1);
    else if (depth === 0 && (ch === '。' || ch === '！' || ch === '？')) {
      out.push(current.trim());
      current = '';
    }
  }
  if (current.trim()) out.push(current.trim());
  return out;
}

/** max 字以内にする。収まらなければ max 以内で最後の読点（、）の手前で切って「…」を付ける。読点が無ければ max 字で切る。 */
export function clipAtClause(text: string, max: number): { text: string; clipped: boolean } {
  const plain = text.trim().replace(/[。]$/, '');
  if ([...plain].length <= max) return { text: plain, clipped: false };
  const chars = [...plain];
  const head = chars.slice(0, max).join('');
  const cut = head.lastIndexOf('、');
  const kept = cut >= 10 ? head.slice(0, cut) : head;
  return { text: `${kept}…`, clipped: true };
}

/** 金額・割合・件数など「要の数字」を太字にするための分割。年・月・日は太字にしない。 */
const KEY_NUMBER = /[$＄¥￥]\s?\d[\d,.]*\s?(?:[KkMmBb]|万|億|千)?|\d[\d,.]*\s?(?:万円|億円|万ドル|ドル|円|％|%|万人|人|社|件|倍|か月|ヶ月|MRR|ARR)/g;

export function splitKeyNumbers(text: string): Array<{ text: string; strong: boolean }> {
  const parts: Array<{ text: string; strong: boolean }> = [];
  let last = 0;
  for (const m of text.matchAll(KEY_NUMBER)) {
    const index = m.index ?? 0;
    // 「2人目」「3人目」のような順番の数字は太字にしない
    if (/^\d[\d,.]*\s?人$/.test(m[0]) && text[index + m[0].length] === '目') continue;
    if (index > last) parts.push({ text: text.slice(last, index), strong: false });
    parts.push({ text: m[0], strong: true });
    last = index + m[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last), strong: false });
  return parts.length ? parts : [{ text, strong: false }];
}

const bigrams = (s: string): Set<string> => {
  const t = s.replace(/[\s、。，,.「」（）()]/g, '');
  const set = new Set<string>();
  for (let i = 0; i < t.length - 1; i += 1) set.add(t.slice(i, i + 2));
  return set;
};

/** 同じ内容の文を2回出さないための記憶。文が完全一致、または文字の並びがほぼ同じ（0.6 以上）なら「出済み」とみなす。 */
export function createSentenceMemory(threshold = 0.6) {
  const seen: Array<{ key: string; grams: Set<string> }> = [];
  const keyOf = (s: string) => s.replace(/[\s、。，,.]/g, '');
  return {
    /** 出済みなら false。初めてなら記憶して true。 */
    take(sentence: string): boolean {
      const key = keyOf(sentence);
      if (!key) return false;
      const grams = bigrams(sentence);
      for (const prev of seen) {
        if (prev.key === key) return false;
        if (grams.size < 6 || prev.grams.size < 6) continue;
        let inter = 0;
        for (const g of grams) if (prev.grams.has(g)) inter += 1;
        const smaller = Math.min(grams.size, prev.grams.size);
        if (inter / smaller >= threshold) return false;
      }
      seen.push({ key, grams });
      return true;
    },
  };
}
