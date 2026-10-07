/**
 * 日本語の自然さの関門（機械の側・その2）。textlint の、形態素解析で文法の誤りを見る規則だけを使う（設定は .textlintrc.json）。
 * 見る物: ら抜き言葉、二重否定、冗長な言い回し（「〜することができる」等）、言葉の誤用、同じ接続詞・逆接の「が」の連続、
 *        不自然なアルファベット、半角カナ、見えない文字。
 * 入れていない規則（2026-10-07 に公開中10件の画面の文で試し、誤検出ばかりだった物）: 助詞の重複（「AもBも」を落とす）、
 * 同じ語の連続（「15分分」「）」を落とす）、文の長さ・読点の数（字数は check-case-text-standard.mjs が別に見る）、句点の有無（見出しを落とす）。
 * 話し言葉・業界用語（「回した」「刺さる」等）は textlint では拾えないので、辞書 data/natural-japanese.json（natural-japanese.mjs）が見る。
 */
import { resolve } from 'node:path';
import { createLinter, loadTextlintrc } from 'textlint';

/**
 * 文をまとめて検査し、文ごとの指摘（無ければ空の配列）を返す。
 * @param {string[]} texts
 * @param {{ configFile?: string }} [opts]
 * @returns {Promise<string[][]>}
 */
export async function lintJapanese(texts, opts = {}) {
  const descriptor = await loadTextlintrc({ configFilePath: opts.configFile ?? resolve(import.meta.dirname, '../../.textlintrc.json') });
  const linter = createLinter({ descriptor });
  const out = [];
  for (const text of texts) {
    if (typeof text !== 'string' || !text.trim()) { out.push([]); continue; }
    const result = await linter.lintText(text, 'line.txt');
    out.push(result.messages.map((m) => `${m.message.replace(/\s+/g, ' ').trim()}（${m.ruleId}）`));
  }
  return out;
}
