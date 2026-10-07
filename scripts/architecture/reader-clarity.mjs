/**
 * 「初めて見る人が1回読んで意味が取れるか」の関門（機械の側）。規則の正本は .claude/skills/natural-japanese/SKILL.md。
 * 決定的に判定できる物だけを見る。決められない物（主語の抜け、説明のない固有名詞など）は display:build の読者役（別のAI）が見る。
 *
 * 差し込み式:
 *  - 語の規則は data/reader-clarity.json に1件ずつ足す（id・pattern・reason・suggest、正当な使い方を外す allow、bad/good の例）。
 *  - 形の規則は下の SHAPE_RULES に関数を1つ足す（text → 当たり[]）。
 *  - 外の道具（textlint のルール等）を足す時も、SHAPE_RULES と同じ形（text → 当たり[]）で包んで足す。
 * 使う所: scripts/architecture/check-case-text-standard.mjs（pnpm lint・case-text:verify）、scripts/reader-case/build-display.ts（直しの対象選び）。
 */
import { readFileSync } from 'node:fs';

/**
 * @typedef {{ id: string; pattern: string; reason: string; suggest: string[]; allow?: string[]; bad?: string; good?: string }} ClarityRule
 * @typedef {{ id: string; re: RegExp; allow: RegExp[]; reason: string; suggest: string[] }} CompiledClarityRule
 * @typedef {{ rule: string; word: string; index: number; reason: string; suggest: string[] }} ClarityHit
 */

/** @param {ClarityRule[]} rules @returns {CompiledClarityRule[]} */
export function compileClarityRules(rules) {
  return rules.map((r) => ({ id: r.id, re: new RegExp(r.pattern, 'gu'), allow: (r.allow ?? []).map((p) => new RegExp(p, 'gu')), reason: r.reason, suggest: r.suggest }));
}

/** @param {string} file */
export function loadClarityRules(file) {
  return compileClarityRules(JSON.parse(readFileSync(file, 'utf8')));
}

function excused(text, start, end, allow) {
  for (const re of allow) {
    re.lastIndex = 0;
    for (const m of text.matchAll(re)) if (m.index <= start && end <= m.index + m[0].length) return true;
  }
  return false;
}

// ---------- 形の規則（text → 当たり[]）。足す時はここに1つ足し、reader-clarity.test.mjs に悪い例と正しい例を足す ----------

const PAREN = /[（(][^（）()]*[）)]/gu;
// 連体の形で終わる区切り（動詞・形容詞・「ない」）。名詞の前に掛かる修飾とみなす
const ADNOMINAL_END = /(?:ない|[うくすつぬむぐぶる]|た|だ|しい|さい|きい|かい|たい)$/u;
// 述語で終わる区切り（言い切りの文）。これで終わる文は、修飾の羅列ではない
const PREDICATE_END = /(?:[うくすつぬむぐぶる]|た|だ|い|です|ます|ず|[にで])$/u;

/** 修飾語の連なり: 「広告のない、読者の支払いで支える、組版の本」のように、連体の区切りが2つ以上続いて名詞で終わる */
function modifierChain(text) {
  const hits = [];
  let offset = 0;
  for (const sentence of text.split('。')) {
    const segs = sentence.replace(PAREN, '').split('、').map((s) => s.trim());
    const last = segs[segs.length - 1] ?? '';
    if (segs.length >= 3 && last && !PREDICATE_END.test(last)) {
      let run = 0;
      for (const seg of segs.slice(0, -1)) {
        run = ADNOMINAL_END.test(seg) && !/^[\d０-９]/.test(seg) ? run + 1 : 0;
        if (run >= 2) {
          hits.push({ rule: 'modifier-chain', word: sentence.slice(0, 40), index: offset, reason: '名詞の前に修飾を重ねている（修飾語の3連）。何の何かが読めない', suggest: ['2文に分ける', '述語で言い切る（「〜の本。広告は載せず、〜」）'] });
          break;
        }
      }
    }
    offset += sentence.length + 1;
  }
  return hits;
}

/** 「Aする、Bする、Cする、の3つ」: 何の3つかを後から言う並べ方 */
function trailingCount(text) {
  return [...text.matchAll(/[、・]\s?の[2-9２-９二三四五六七八九]つ/gu)].map((m) => ({ rule: 'trailing-count', word: m[0], index: m.index, reason: '動詞を並べて最後に「の3つ」と付けると、何の3つか読めない', suggest: ['先に「〜は3つ。」と言ってから並べる'] }));
}

/** 名詞と名詞を矢印だけでつなぐ（「GoRails.com→隔週の無料動画→Hacker News掲載」）。数字の推移（347ドル→2,100ドル）は外す */
function wordArrow(text) {
  const hits = [];
  for (const m of text.matchAll(/→/gu)) {
    const left = text.slice(Math.max(0, m.index - 12), m.index);
    const right = text.slice(m.index + 1, m.index + 13);
    if (/\d/.test(left) && /\d/.test(right)) continue;
    hits.push({ rule: 'word-arrow', word: `${left.slice(-6)}→${right.slice(0, 6)}`, index: m.index, reason: '矢印だけでは、何が何の原因・順番か読めない', suggest: ['「〜に人が集まり、〜し、〜になった」と文で書く'] });
  }
  return hits;
}

export const SHAPE_RULES = [modifierChain, trailingCount, wordArrow];

/** @param {string} text @param {CompiledClarityRule[]} rules @returns {ClarityHit[]} */
export function findUnclear(text, rules) {
  if (typeof text !== 'string' || !text) return [];
  /** @type {ClarityHit[]} */
  const hits = [];
  for (const rule of rules) {
    rule.re.lastIndex = 0;
    for (const m of text.matchAll(rule.re)) {
      if (excused(text, m.index, m.index + m[0].length, rule.allow)) continue;
      hits.push({ rule: rule.id, word: m[0], index: m.index, reason: rule.reason, suggest: rule.suggest });
    }
  }
  for (const shape of SHAPE_RULES) hits.push(...shape(text));
  return hits.sort((a, b) => a.index - b.index);
}

/** 落ちた時に出す1行 @param {ClarityHit} hit */
export const describeUnclear = (hit) => `意味が取れない言い方「${hit.word}」（${hit.reason}）→ ${hit.suggest.join('／')}（規則 .claude/skills/natural-japanese/SKILL.md）`;
