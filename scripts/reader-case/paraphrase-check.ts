/**
 * 言い回しだけの直しを、別のAIの監査なしで通すための機械の照合。
 * 監査済みの版と直した版のそれぞれから「数字（金額・率・人数・件数。単位つき）」「年月日」「固有名（英字の語・カタカナの語）」を抜き出す。
 * 直した版に、監査済みの版にも事実（facts・metrics）にも無い語が1つも無ければ、言い回しだけの直しとみなす。
 * 1つでもあれば、その項目は別のAIの監査に回す（それまで画面から隠す）。
 * 漢字だけの固有名（人名など）と漢数字は拾わない。根拠（basis）・式以外の欄が変わった項目は、そもそもこの照合に回さない（publication-evaluation.ts）。
 */

// 数字の後ろの単位（倍率・通貨・年月日・人数など）。単位まで含めて1語にする（「1月」と「3月」、「6万」と「6千」を区別する）
const UNIT = '(?:兆|億|万|千|百)?(?:ドル|円|ユーロ|ポンド|ルピー|%|％|割|倍|年|か月|ヶ月|カ月|月|日|人|件|社|本|個|回|時間|分|秒|週|歳|店|国|ページ|校|曲|台)?';
const NUMBER = new RegExp(`\\d+(?:[.,]\\d+)*${UNIT}`, 'g');
const LATIN = /[A-Za-z][A-Za-z0-9&'’+.-]*[A-Za-z0-9+]|[A-Za-z]/g;
const KATAKANA = /[ァ-ヺー・]{2,}/g;

const normalize = (text: string) => text.normalize('NFKC').replace(/(\d),(?=\d{3}\b)/g, '$1');

/** 文から数字・年月日・固有名の語を抜き出す（重複なし） */
export function factTokens(text: string): string[] {
  const t = normalize(text);
  const out = new Set<string>();
  for (const m of t.match(NUMBER) ?? []) out.add(m.replace(/[%％]/, '%'));
  for (const m of t.match(LATIN) ?? []) out.add(m.toLowerCase().replace(/[.'’-]+$/, ''));
  for (const m of t.match(KATAKANA) ?? []) out.add(m.replace(/^[・ー]+|[・]+$/g, ''));
  out.delete('');
  return [...out];
}

/**
 * 直した版にだけ現れる語（監査済みの版にも、事実の文にも無いもの）。空なら言い回しだけの直し。
 * 事実の文は、語の一部として含まれていればよい（「Hacker News」は事実の「Hacker Newsに載った」に含まれる）。
 */
export function newFactTokens(edited: string, audited: string, facts: readonly string[]): string[] {
  const known = new Set(factTokens([audited, ...facts].join('\n')));
  const haystack = normalize([audited, ...facts].join('\n')).toLowerCase();
  // 数字は単位まで同じ語が無ければ新しい（「11月」に「1月」が含まれる、のような部分一致では通さない）
  return factTokens(edited).filter((tok) => !known.has(tok) && (/^\d/.test(tok) || !haystack.includes(tok.toLowerCase())));
}
