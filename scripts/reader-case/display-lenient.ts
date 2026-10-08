/**
 * 画面の文の作成を「1行が落ちても事例ごと落とさない」形にするための部品（2026-10-08 指揮の決定）。
 *
 * - 円換算はAIに書かせない: AIが付けた「（約◯円）」を外し、コード（withYenApprox）で付け直す。
 * - 古い順に並んでいない年表は、機械で並べ替える。
 * - 機械の検査の指摘は、どの行の指摘かを突き止めて、その行だけ外す（分析欄の行は「出さない」にする）。
 * - 同じ数字・同じ話の重なりは、事例の中で1か所（成功の秘訣 > 章 > 分析欄 > 概要の順）だけ残し、他の行を外す。
 * 外せないのは一覧の文だけ（無ければ画面にならない）。
 */
import { unitNumbers } from '../reader-view/rules.mjs';
import { withYenApprox } from '../../src/shared/display-text';
import { textFingerprint } from '../../src/shared/list-lines';
import { mergeEntity, type DisplayFiles, type EntityDisplay, type LiveReader } from '../../src/shared/display-build';
import { findDuplicates } from './cross-layer-dups';

const YEN_PAREN = /[（(]\s*約?[\d,.]+\s*[千万億]?(?:\s*[〜~～／/・、]\s*約?[\d,.]+\s*[千万億]?)*\s*円\s*[）)]/g;
/** 冗長な「〜を行う」（回収を行う）は「〜する」に直す（textlint の冗長表現。意味は変わらない） */
const PLAIN_VERB = /([一-龥]{2,})を行う/g;
export const withCodeYen = (text: string): string => withYenApprox(text.replace(YEN_PAREN, '').replace(PLAIN_VERB, '$1する').trim());

/** 円換算をコードで付け直し、年表を古い順に並べる */
export function normalizeDisplay(d: EntityDisplay): EntityDisplay {
  const y = withCodeYen;
  const chapters = d.chapters && {
    ...d.chapters,
    chapters: Object.fromEntries(Object.entries(d.chapters.chapters).map(([k, rows]) => {
      const mapped = (rows ?? []).map((r) => ({ ...r, text: y(r.text) }));
      if (k === 'timeline') {
        const year = (t: string) => (/^\d{4}年/.test(t) ? Number(t.slice(0, 4)) : Number.POSITIVE_INFINITY);
        mapped.sort((a, b) => year(a.text) - year(b.text)); // 安定整列
      }
      return [k, mapped] as const;
    })),
  };
  return {
    ...d,
    ...(d.list ? { list: { ...d.list, text: y(d.list.text) } } : {}),
    ...(d.summary ? { summary: { ...d.summary, text: d.summary.text ? y(d.summary.text) : '' } } : {}),
    detail: d.detail.map((l) => (l.hidden ? l : { ...l, answer: y(l.answer), ...(l.note ? { note: y(l.note) } : {}) })),
    ...(d.success ? { success: { ...d.success, points: d.success.points.map((p) => ({ ...p, head: y(p.head), body: y(p.body) })) } } : {}),
    ...(chapters ? { chapters } : {}),
  };
}

/** 数字の突き合わせ用: 出さない行は見ない */
export const visibleOnly = (d: EntityDisplay): EntityDisplay => ({ ...d, detail: d.detail.filter((l) => !l.hidden) });

/** 指定の行を外す。分析欄は「出さない」にする。一覧の文は外せない */
export function dropRows(d: EntityDisplay, ids: ReadonlySet<string>, reader: LiveReader): EntityDisplay {
  const detail = d.detail.map((l) => (ids.has(`detail.${l.analysisId}`) ? { entityId: l.entityId, analysisId: l.analysisId, textHash: l.textHash, answer: '出さない', hidden: true } : l));
  for (const id of ids) {
    if (!id.startsWith('detail.')) continue;
    const aid = id.slice('detail.'.length);
    if (detail.some((l) => l.analysisId === aid)) continue;
    const a = reader.analysis.find((x) => x.id === aid);
    if (a) detail.push({ entityId: d.list?.entityId ?? d.summary?.entityId ?? '', analysisId: aid, textHash: textFingerprint(a.text), answer: '出さない', hidden: true });
  }
  return {
    ...d,
    detail,
    ...(d.summary && ids.has('summary') ? { summary: { ...d.summary, text: '' } } : {}),
    ...(d.success ? { success: { ...d.success, points: d.success.points.filter((_, i) => !ids.has(`success.${i}`)) } } : {}),
    ...(d.chapters ? {
      chapters: {
        ...d.chapters,
        chapters: Object.fromEntries(Object.entries(d.chapters.chapters)
          .map(([k, rows]) => [k, (rows ?? []).filter((_, i) => !ids.has(`chapters.${k}.${i}`))] as const)
          .filter(([, rows]) => rows.length > 0)),
      },
    } : {}),
  };
}

const chapOf = (d: EntityDisplay, k: string): Array<{ text: string; source: string }> => ((d.chapters?.chapters ?? {}) as Record<string, Array<{ text: string; source: string }> | undefined>)[k] ?? [];
const IGNORED = /(^分析欄 [^（:]+$|作る対象の分析項目ではない|同じ項目を2回返した|文が無い（材料に答えが無ければ|factId .* 一覧に無い|factId .* 事実の一覧に無い|\d+点（3〜5点にする）|古い順に並んでいない)/;

/** 検査の指摘1件が、どの行の指摘かを返す。突き止められなければ null。無視してよい指摘は [] */
export function localize(problem: string, d: EntityDisplay): string[] | null {
  const p = problem.trim();
  if (IGNORED.test(p)) return [];
  const chap = (k: string) => chapOf(d, k).map((r, i) => ({ i, text: r.text }));
  const chapIds = (k: string, pick: (r: { i: number; text: string }) => boolean = () => true) => chap(k).filter(pick).map((r) => `chapters.${k}.${r.i}`);
  let m: RegExpMatchArray | null;
  if (/^list(?:-lines|:)/.test(p)) return ['list'];
  if (/^summary(?:-lines|:)/.test(p)) return ['summary'];
  if ((m = p.match(/^detail (a-[\w-]+):/))) return [`detail.${m[1]}`];
  if ((m = p.match(/^detail-lines \S+?\/(a-[\w-]+)/))) return [`detail.${m[1]}`];
  if ((m = p.match(/^分析欄 .*?（ent_\w+）の「.*?」（(a-[\w-]+)）/))) return [`detail.${m[1]}`];
  if ((m = p.match(/^success「(.*?)」:/))) {
    const hit = (d.success?.points ?? []).map((pt, i) => (pt.head.slice(0, 15) === m![1] ? `success.${i}` : '')).filter(Boolean);
    return hit.length ? hit : null;
  }
  if ((m = p.match(/^success-points \S+?\/(\S+?)(?: (head|body))?:/))) {
    const points = (d.success?.points ?? []).map((pt, i) => ({ pt, i })).filter((x) => x.pt.factId === m![1]);
    const len = p.match(/(\d+)字（上限/);
    const field = m[2] as 'head' | 'body' | undefined;
    const narrowed = len && field ? points.filter((x) => x.pt[field].length === Number(len[1])) : points;
    const use = narrowed.length ? narrowed : points;
    return use.length ? use.map((x) => `success.${x.i}`) : null;
  }
  if ((m = p.match(/^chapters (\w+)「(.*?)」:/))) {
    const hit = chapIds(m[1], (r) => r.text.slice(0, 15) === m![2]);
    return hit.length ? hit : chapIds(m[1]);
  }
  if ((m = p.match(/^case-chapters \S+?\/(\w+)(?: text)?:/))) {
    const q = p.match(/「(.*?)…」/);
    const len = p.match(/(\d+)字（上限(\d+)）/);
    const k = m[1];
    let hit = q ? chapIds(k, (r) => r.text.startsWith(q[1])) : [];
    if (!hit.length && len) hit = chapIds(k, (r) => r.text.length === Number(len[1]));
    if (!hit.length && len) hit = chapIds(k, (r) => r.text.length > Number(len[2]));
    return hit.length ? hit : chapIds(k);
  }
  if ((m = p.match(/^同じ文を2か所に出している「(.*?)」/))) {
    const t = m[1];
    const ids = [
      ...Object.entries(d.chapters?.chapters ?? {}).flatMap(([k, rows]) => (rows ?? []).map((r, i) => (r.text.startsWith(t) ? `chapters.${k}.${i}` : '')).filter(Boolean)),
      ...(d.success?.points ?? []).map((pt, i) => (pt.head.startsWith(t) ? `success.${i}` : '')).filter(Boolean),
      ...d.detail.filter((l) => !l.hidden && l.answer.startsWith(t)).map((l) => `detail.${l.analysisId}`),
    ];
    return ids.slice(1);
  }
  return null;
}

const flat = (t: string) => t.replace(/[\s、。，．,.・:：（）()「」『』〜~\-—–]/g, '');
/** 重なり（同じ数字・同じ話）のうち、残す1か所以外の行 */
export function duplicateDrops(entityId: string, files: DisplayFiles, d: EntityDisplay): Array<{ id: string; why: string }> {
  const out: Array<{ id: string; why: string }> = [];
  const priority = (place: string) => (place.startsWith('成功の秘訣') ? 0 : place.startsWith('章 ') ? 1 : place.startsWith('分析欄 ') ? 2 : 3);
  const matches = (text: string, needle: { kind: string; value: string }) => (needle.kind === 'number' ? unitNumbers(text).some((n: { key: string }) => n.key === needle.value) : flat(text).includes(needle.value));
  for (const dup of findDuplicates(entityId, files)) {
    const keep = [...dup.places].sort((a, b) => priority(a) - priority(b))[0];
    for (const place of dup.places) {
      if (place === keep) continue;
      if (place === '概要') { out.push({ id: 'summary', why: dup.message }); continue; }
      let m: RegExpMatchArray | null;
      if ((m = place.match(/^成功の秘訣(\d+)$/))) { out.push({ id: `success.${Number(m[1]) - 1}`, why: dup.message }); continue; }
      if ((m = place.match(/^分析欄 (a-[\w-]+)$/))) { out.push({ id: `detail.${m[1]}`, why: dup.message }); continue; }
      if ((m = place.match(/^章 (\w+)$/))) {
        chapOf(d, m[1]).forEach((r, i) => { if (matches(r.text, dup.needle)) out.push({ id: `chapters.${m![1]}.${i}`, why: dup.message }); });
      }
    }
  }
  return out;
}

export interface Dropped { id: string; why: string }
export interface PruneResult { display: EntityDisplay; dropped: Dropped[]; leftover: string[] }

/** 指摘が無くなるまで、指摘された行だけを外す。一覧の文の指摘と、行を突き止められない指摘は leftover に残す */
export function pruneUntilClean(o: { entityId: string; reader: LiveReader; files: DisplayFiles; display: EntityDisplay; problemsOf: (d: EntityDisplay) => string[] }): PruneResult {
  let d = normalizeDisplay(o.display);
  const dropped: Dropped[] = [];
  let leftover: string[] = [];
  for (let round = 0; round < 12; round += 1) {
    const reasons = new Map<string, string>();
    const unmapped: string[] = [];
    for (const problem of o.problemsOf(d)) {
      const ids = localize(problem, d);
      if (ids === null) { unmapped.push(problem); continue; }
      for (const id of ids) if (!reasons.has(id)) reasons.set(id, problem);
    }
    for (const x of duplicateDrops(o.entityId, mergeEntity(o.files, o.entityId, d), d)) if (!reasons.has(x.id)) reasons.set(x.id, x.why);
    const listBad = reasons.delete('list');
    leftover = [...(listBad ? ['一覧の文が検査に落ちた'] : []), ...unmapped];
    const real = [...reasons.keys()].filter((id) => id !== 'summary' || d.summary?.text);
    if (!real.length) break;
    for (const id of real) dropped.push({ id, why: reasons.get(id)!.slice(0, 160) });
    d = dropRows(d, new Set(real), o.reader);
  }
  return { display: d, dropped, leftover };
}
