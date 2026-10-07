import type { DisplayFiles } from '../../src/shared/display-build';
import { unitNumbers } from '../reader-view/rules.mjs';
import { ANALYSIS_GROUPS } from '../../src/features/company-inspector/ui/ReaderOverview';

/**
 * 画面の層をまたいだ「同じ数字・同じ話」の検出（画面の自動監査 e の規則と同じ見方）。
 * 画面の自動監査は完成した画面に掛けるので、作る時に防がないと公開後に落ちる。ここで作る時に防ぎ、AIに直させる。
 * 場所は 概要・成功の秘訣・分析欄・章。一覧の文は監査も見ないので外す。
 */
const PHRASE_LEN = 14;

/** 画面では同じ折りたたみ（ANALYSIS_GROUPS）の分析欄は1つの節として見るので、同じ節の中の重なりは違反にしない。 */
function sectionOf(where: string): string {
  if (!where.startsWith('分析欄 ')) return where;
  const id = where.slice('分析欄 '.length).replace(/^a-/, '').toUpperCase();
  const g = ANALYSIS_GROUPS.find((x) => (x.items as string[]).includes(id));
  return g ? `分析欄グループ ${g.title}` : where;
}

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

/** 同じ数字・同じ言い回しが2か所以上にある時の指摘（重なっている場所つき）。 */
export function findDuplicates(entityId: string, files: DisplayFiles): Array<{ message: string; places: string[] }> {
  const places = placesOf(entityId, files);
  const problems: Array<{ message: string; places: string[] }> = [];
  const seen = new Map<string, { raw: string; at: Set<string> }>();
  for (const [where, text] of places) {
    for (const n of unitNumbers(text)) {
      const e = seen.get(n.key) ?? { raw: n.raw, at: new Set<string>() };
      e.at.add(where);
      seen.set(n.key, e);
    }
  }
  const sections = (at: Set<string>) => new Set([...at].map(sectionOf)).size;
  for (const { raw, at } of seen.values()) if (sections(at) >= 2) problems.push({ message: `同じ数字「${raw}」が ${[...at].join(' と ')} に重なっている（1か所だけにする。数字は最も合う1か所に残し、他は数字を使わない言い方にする）`, places: [...at] });
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
    if (sections(at) < 2) continue;
    const pair = [...at].join(' と ');
    if (reported.has(pair)) continue;
    reported.add(pair);
    problems.push({ message: `同じ話「${w}」が ${pair} に重なっている（1か所だけにし、他は言い方と焦点を変える）`, places: [...at] });
  }
  return problems;
}

/** 同じ数字・同じ言い回しが2か所以上にある時の指摘（1行ずつ）。 */
export function crossLayerDuplicates(entityId: string, files: DisplayFiles): string[] {
  return findDuplicates(entityId, files).map((d) => d.message);
}

/**
 * 重なっている行のうち、作り直せる層（概要・分析欄）だけを返す。章と成功の秘訣は別の流れ（章の直し・成功の秘訣の作成）が持つので、ここでは動かさない。
 * 作り直す行は、章など動かさない層に同じ数字・話が残る限り、書き直しで重なりが消える（章の側を正とする）。
 */
export function dedupeTargets(entityId: string, files: DisplayFiles): { summary: boolean; detail: string[] } {
  const involved = new Set(findDuplicates(entityId, files).flatMap((d) => d.places));
  return {
    summary: involved.has('概要'),
    detail: [...involved].filter((p) => p.startsWith('分析欄 ')).map((p) => p.slice('分析欄 '.length)),
  };
}

/** 作り直した行（概要・分析欄）に関わる重なりだけを返す（動かさない層どうしの重なりは、作り直しの合否に使わない）。 */
export function duplicatesInvolving(entityId: string, files: DisplayFiles, target: { summary: boolean; detail: readonly string[] }): string[] {
  const labels = new Set([...(target.summary ? ['概要'] : []), ...target.detail.map((id) => `分析欄 ${id}`)]);
  return findDuplicates(entityId, files).filter((d) => d.places.some((p) => labels.has(p))).map((d) => d.message);
}
