import type { DisplayFiles } from '../../src/shared/display-build';
import { unitNumbers } from '../reader-view/rules.mjs';

/**
 * 画面の層をまたいだ「同じ数字・同じ話」の検出（画面の自動監査 e の規則と同じ見方）。
 * 画面の自動監査は完成した画面に掛けるので、作る時に防がないと公開後に落ちる。ここで作る時に防ぎ、AIに直させる。
 * 場所は 概要・成功の秘訣・分析欄・章。一覧の文は監査も見ないので外す。
 */
const PHRASE_LEN = 14;

function placesOf(entityId: string, files: DisplayFiles): Array<[string, string]> {
  const places: Array<[string, string]> = [];
  const summary = files['summary-lines'].find((l) => l.entityId === entityId);
  if (summary) places.push(['概要', summary.text]);
  files['success-points'].find((e) => e.entityId === entityId)?.points.forEach((p, i) => places.push([`成功の秘訣${i + 1}`, `${p.head} ${p.body}`]));
  for (const d of files['detail-lines']) if (d.entityId === entityId && !d.hidden) places.push([`分析欄 ${d.analysisId}`, `${d.answer} ${d.note ?? ''}`]);
  const chapters = files['case-chapters'].find((e) => e.entityId === entityId)?.chapters ?? {};
  for (const [id, rows] of Object.entries(chapters)) if (rows?.length) places.push([`章 ${id}`, rows.map((r) => r.text).join('\n')]);
  return places;
}

/** 同じ数字・同じ言い回しが2か所以上にある時の指摘（1行ずつ）。 */
export function crossLayerDuplicates(entityId: string, files: DisplayFiles): string[] {
  const places = placesOf(entityId, files);
  const problems: string[] = [];
  const seen = new Map<string, { raw: string; at: Set<string> }>();
  for (const [where, text] of places) {
    for (const n of unitNumbers(text)) {
      const e = seen.get(n.key) ?? { raw: n.raw, at: new Set<string>() };
      e.at.add(where);
      seen.set(n.key, e);
    }
  }
  for (const { raw, at } of seen.values()) if (at.size >= 2) problems.push(`同じ数字「${raw}」が ${[...at].join(' と ')} に重なっている（1か所だけにする。数字は最も合う1か所に残し、他は数字を使わない言い方にする）`);
  const phrases = new Map<string, Set<string>>();
  for (const [where, text] of places) {
    const flat = text.replace(/[\s、。，．,.・:：（）()「」『』〜~\-—–]/g, '');
    for (let i = 0; i + PHRASE_LEN <= flat.length; i += 1) {
      const w = flat.slice(i, i + PHRASE_LEN);
      if ((w.match(/[0-9０-９]/g) ?? []).length > PHRASE_LEN / 2) continue;
      phrases.set(w, (phrases.get(w) ?? new Set<string>()).add(where));
    }
  }
  const reported = new Set<string>();
  for (const [w, at] of phrases) {
    if (at.size < 2) continue;
    const pair = [...at].join(' と ');
    if (reported.has(pair)) continue;
    reported.add(pair);
    problems.push(`同じ話「${w}」が ${pair} に重なっている（1か所だけにし、他は言い方と焦点を変える）`);
  }
  return problems;
}
