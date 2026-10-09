// オーナーの指示の短い紙（docs/owner/OWNER_RULES.md）が、経緯の全記録（docs/owner/OWNER_DIALOGUE_LOG.md）の項目を1つも落としていないかを見る。
// 記録の項目（「### 3-13」の番号と、項目の無い章「## 12.」の番号）が、短い紙の〔 〕のどこにも無ければ止める。紙に無い番号を〔 〕に書いても止める。
// 使い方: node scripts/architecture/check-owner-rules.mjs
import { readFileSync } from 'node:fs';

const LOG = 'docs/owner/OWNER_DIALOGUE_LOG.md';
const RULES = 'docs/owner/OWNER_RULES.md';

export function logIds(md) {
  const ids = new Set();
  let chapter = null;
  let chapterHasItems = false;
  const closeChapter = () => { if (chapter && !chapterHasItems) ids.add(chapter); };
  for (const line of md.split('\n')) {
    const ch = line.match(/^## (\d+)\./);
    if (ch) { closeChapter(); chapter = ch[1]; chapterHasItems = false; continue; }
    const item = line.match(/^### (\d+-\d+)\s/);
    if (item) { ids.add(item[1]); chapterHasItems = true; }
  }
  closeChapter();
  ids.delete('0');
  return ids;
}

export function ruleIds(md) {
  const ids = new Set();
  for (const m of md.matchAll(/〔([^〕]+)〕/g)) for (const id of m[1].split(/[,、]\s*/)) if (/^\d+(-\d+)?$/.test(id.trim())) ids.add(id.trim());
  return ids;
}

export function coverage(logMd, rulesMd) {
  const log = logIds(logMd);
  const rules = ruleIds(rulesMd);
  return { missing: [...log].filter((id) => !rules.has(id)), unknown: [...rules].filter((id) => !log.has(id)) };
}

if (process.argv[1]?.endsWith('check-owner-rules.mjs')) {
  const { missing, unknown } = coverage(readFileSync(LOG, 'utf8'), readFileSync(RULES, 'utf8'));
  if (missing.length) console.error(`[owner-rules] 短い紙に入っていない記録の項目: ${missing.join(', ')}。${RULES} のどこかの指示に〔番号〕で入れる`);
  if (unknown.length) console.error(`[owner-rules] 記録に無い番号: ${unknown.join(', ')}`);
  if (missing.length || unknown.length) process.exit(1);
  console.log('[owner-rules] 記録の項目は、すべて短い紙に入っている');
}
