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
const ABSENCE = /(未確認|書かれていない|公開されていない|記載(が)?(ない|なし)|確認できない|わからない|分からない|不明|非公開(?![版のなでに]))/;
const HEDGE = /(と語る|と話す|と説明している|と書く|と述べる)/;
const read = (file) => JSON.parse(readFileSync(resolve(process.cwd(), file), 'utf8'));
const problems = [];
// 読む人に分かりにくい語（専門略語・調査用語）。data/reader-language.json に足せば、全ての画面用の文に効く。
const READER_LANGUAGE = JSON.parse(readFileSync(resolve(process.cwd(), 'data/reader-language.json'), 'utf8')).map((rule) => ({ re: new RegExp(rule.pattern), suggest: rule.suggest }));

function check(where, field, text, max, { hedge = false } = {}) {
  if (typeof text !== 'string' || text.trim() === '') { problems.push(`${where} ${field}: 空`); return; }
  if (text.length > max) problems.push(`${where} ${field}: ${text.length}字（上限${max}）`);
  if (FOREIGN.test(text) && !text.includes('円')) problems.push(`${where} ${field}: 外貨の数字に円換算（約◯円）が無い「${text.slice(0, 30)}…」`);
  if (/(?<![\d,.])0円/.test(text)) problems.push(`${where} ${field}: 「0円」は書かない（「かけていない」「無料」と言う）`);
  if (ABSENCE.test(text)) problems.push(`${where} ${field}: 「分からない・未確認」と言うだけの文は載せない（載せないのが正しい）`);
  for (const rule of READER_LANGUAGE) {
    const hit = text.match(rule.re);
    if (hit) problems.push(`${where} ${field}: 読む人に分かりにくい語「${hit[0]}」→ ${rule.suggest}`);
  }
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
  if (rule.mustNot && new RegExp(rule.mustNot).test(`${line.answer} ${line.note ?? ''}`)) problems.push(`detail-lines ${line.entityId}/${line.analysisId}: 項目「${rule.question}」に、別の章の話（結果・数字）が混ざっている「${line.answer.slice(0, 30)}…」`);
  for (const all of rule.mustAll ?? []) if (!new RegExp(all).test(`${line.answer} ${line.note ?? ''}`)) problems.push(`detail-lines ${line.entityId}/${line.analysisId}: 項目「${rule.question}」の片方が無い（/${all}/）「${line.answer.slice(0, 30)}…」`);
  if (!new RegExp(rule.must).test(`${line.answer} ${line.note ?? ''}`)) problems.push(`detail-lines ${line.entityId}/${line.analysisId}: 項目「${rule.question}」の答えになっていない「${line.answer.slice(0, 30)}…」`);
}
// 6. 成功の秘訣（data/success-points.json）。見出し＝やった事（40字以内）、本文＝根拠の事実（140字以内）、4〜5点。
const successPoints = read('data/success-points.json');
for (const entry of successPoints) {
  const list = entry.points ?? [];
  if (list.length < 3 || list.length > 5) problems.push(`success-points ${entry.entityId}: ${list.length}点（3〜5点にする）`);
  for (const point of list) {
    const where = `success-points ${entry.entityId}/${point.factId}`;
    check(where, 'head', point.head, 40);
    check(where, 'body', point.body, 140);
    if (/(しよう|しろ|せよ|してください|すべき)/.test(point.head + point.body)) problems.push(`${where}: 真似の手順（命令形）になっている`);
  }
}
// 7. 事例の追加の章（data/case-chapters.json）。1行は90字以内、出典URL必須、円換算・「0円」・「未確認」の禁止、命令形の禁止。
const CHAPTER_IDS = ['practice', 'turning', 'timeline', 'core', 'start', 'price', 'voices'];
const listLineByEntity = new Map(read('data/list-lines.json').map((line) => [line.entityId, line]));
for (const entry of read('data/case-chapters.json')) {
  const anchor = listLineByEntity.get(entry.entityId);
  if (!anchor || anchor.factId !== entry.factId || anchor.factHash !== entry.factHash) problems.push(`case-chapters ${entry.entityId}: 元の事実との紐付け（factId・factHash）が一覧の文と合っていない`);
  for (const [id, rows] of Object.entries(entry.chapters)) {
    if (!CHAPTER_IDS.includes(id)) problems.push(`case-chapters ${entry.entityId}: 知らない章「${id}」`);
    for (const row of rows) {
      const where = `case-chapters ${entry.entityId}/${id}`;
      check(where, 'text', row.text, 90);
      if (!/^https:\/\//.test(row.source ?? '')) problems.push(`${where}: 出典URLが無い「${row.text.slice(0, 20)}…」`);
      if (/(しよう|しろ|せよ|してください|すべき)/.test(row.text)) problems.push(`${where}: 真似の手順（命令形）になっている「${row.text.slice(0, 20)}…」`);
      if (id === 'turning' && !/^前[:：].+後[:：]/.test(row.text)) problems.push(`${where}: 「前: …。後: …」の形でない「${row.text.slice(0, 20)}…」`);
    }
  }
}
for (const line of read('data/list-lines.json')) check(`list-lines ${line.entityId}`, 'text', line.text, 45);
// 8. 概要の2文目以降（data/summary-lines.json）。140字以内、元の要約の事実（list-lines と同じ factId・factHash）に紐づく。空の文は、2文目以降が無い事例だけ。
for (const line of read('data/summary-lines.json')) {
  const where = `summary-lines ${line.entityId}`;
  const anchor = listLineByEntity.get(line.entityId);
  if (!anchor || anchor.factId !== line.factId || anchor.factHash !== line.factHash) problems.push(`${where}: 元の事実との紐付け（factId・factHash）が一覧の文と合っていない`);
  if (line.text !== '') check(where, 'text', line.text, 140);
}

if (problems.length) {
  console.error(`[case-text] ${problems.length}件の違反（docs/CASE_TEXT_STANDARD.md）:\n${problems.join('\n')}`);
  process.exit(1);
}
console.log('[case-text] OK');
