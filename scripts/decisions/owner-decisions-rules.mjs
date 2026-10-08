/**
 * オーナー決定の台帳（data/owner-decisions.json）を、画面の文に掛ける純粋関数。
 * 画面の文は「読む人に見える文」（詳細画面の innerText）。台帳の forbidden の1つでも当たれば違反。
 */
import { readFileSync } from 'node:fs';

/** @typedef {{ label: string; pattern: string; flags?: string }} Forbidden */
/** @typedef {{ id: string; date: string; ownerWords: string; source: string; forbidden: Forbidden[]; how: string }} Decision */
/** @typedef {{ id: string; caseId: string; label: string; excerpt: string }} Violation */

export function loadDecisions(file) {
  const json = JSON.parse(readFileSync(file, 'utf8'));
  /** @type {Decision[]} */
  const decisions = json.decisions;
  if (!Array.isArray(decisions) || decisions.length === 0) throw new Error('decisions が空');
  const ids = new Set();
  for (const d of decisions) {
    if (!d.id || !d.date || !d.ownerWords || !d.how || !Array.isArray(d.forbidden) || d.forbidden.length === 0) throw new Error(`台帳の形が不正: ${d.id}`);
    if (ids.has(d.id)) throw new Error(`id が重複: ${d.id}`);
    ids.add(d.id);
    for (const f of d.forbidden) new RegExp(f.pattern, `${f.flags ?? ''}u`);
  }
  return decisions;
}

/** 1事例の画面の文に台帳を掛ける。1つの決定・1つの禁止につき最初の当たりだけ返す。 */
export function scanScreen(caseId, text, decisions) {
  /** @type {Violation[]} */
  const out = [];
  for (const d of decisions) {
    for (const f of d.forbidden) {
      const m = new RegExp(f.pattern, `${f.flags ?? ''}u`).exec(text);
      if (!m) continue;
      const from = Math.max(0, m.index - 20);
      out.push({ id: d.id, caseId, label: f.label, excerpt: text.slice(from, m.index + m[0].length + 20).replace(/\s+/g, ' ') });
    }
  }
  return out;
}
