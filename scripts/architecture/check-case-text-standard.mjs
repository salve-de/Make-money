/**
 * 画面用の編集文（data/detail-lines.json / data/list-lines.json）が docs/CASE_TEXT_STANDARD.md の基準を守っているか見る。
 * 違反があれば exit 1。
 *  1. 外貨・外国の単位（ドル・$・ルピー・ラック・クロール・ユーロ・ポンド・INR・USD）を含む文は、同じ欄に「円」も含む（円換算の概算を添える）。
 *  2. 答え（answer）は60字以内、補足（note）は120字以内。一覧の1行（text）は45字以内。
 *  3. 答えに「と語る」「と話す」「と説明している」「と書く」を入れない。
 *  4. 空の答えを置かない。
 *  6. 項目名と答えの1対1（data/item-contract.json）。
 *  5. 「未確認」「書かれていない」「公開されていない」など、分からない旨だけの文を置かない。
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const FOREIGN = /(ドル|\$|ルピー|ラック|クロール|ユーロ|ポンド|INR|USD|EUR|GBP)/;
const ABSENCE = /(未確認|書かれていない|公開されていない|記載(が)?(ない|なし)|確認できない|わからない|分からない|不明|非公開)/;
const HEDGE = /(と語る|と話す|と説明している|と書く|と述べる)/;
const read = (file) => JSON.parse(readFileSync(resolve(process.cwd(), file), 'utf8'));
const problems = [];

function check(where, field, text, max, { hedge = false } = {}) {
  if (typeof text !== 'string' || text.trim() === '') { problems.push(`${where} ${field}: 空`); return; }
  if (text.length > max) problems.push(`${where} ${field}: ${text.length}字（上限${max}）`);
  if (FOREIGN.test(text) && !text.includes('円')) problems.push(`${where} ${field}: 外貨の数字に円換算（約◯円）が無い「${text.slice(0, 30)}…」`);
  if (ABSENCE.test(text)) problems.push(`${where} ${field}: 「分からない・未確認」と言うだけの文は載せない（載せないのが正しい）`);
  if (hedge && HEDGE.test(text)) problems.push(`${where} ${field}: 答えに「本人は〜と語る」型の言い回し`);
}

for (const line of read('data/detail-lines.json')) {
  if (line.hidden) continue;
  const where = `detail-lines ${line.entityId}/${line.analysisId}`;
  // 年表（「2013年: …。2014年: …。」の形）だけは長くてよい
  const timeline = /^\d{4}年[^:：]*[:：]/.test(line.answer) && line.answer.includes('。');
  check(where, 'answer', line.answer, timeline ? 400 : /headline/i.test(line.analysisId) ? 90 : 60, { hedge: true });
  if (line.note !== undefined) check(where, 'note', line.note, 120);
}
// 5. 項目名と答えの1対1（data/item-contract.json）。項目名が問う事に、答えが答えていなければ落とす。
const contract = read('data/item-contract.json').items;
for (const line of read('data/detail-lines.json')) {
  if (line.hidden) continue;
  const item = line.analysisId.replace(/^a-/, '').toUpperCase();
  const rule = contract[item];
  if (!rule) continue;
  if (!new RegExp(rule.must).test(`${line.answer} ${line.note ?? ''}`)) problems.push(`detail-lines ${line.entityId}/${line.analysisId}: 項目「${rule.question}」の答えになっていない「${line.answer.slice(0, 30)}…」`);
}
for (const line of read('data/list-lines.json')) check(`list-lines ${line.entityId}`, 'text', line.text, 45);

if (problems.length) {
  console.error(`[case-text] ${problems.length}件の違反（docs/CASE_TEXT_STANDARD.md）:\n${problems.join('\n')}`);
  process.exit(1);
}
console.log('[case-text] OK');
