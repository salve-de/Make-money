/**
 * 訂正の台帳（data/fact-corrections.json、または再収集の返り data/runner/inbox/recollect/*.json）を当てる。
 * 事例を1件ずつ手で書き換えない。原文で確かめた直し方を台帳に書き、この道具で当てる。
 *
 *  - claim + fix        → 照合の判定を PARTIAL にして直した文・値を入れる（照合した時の文 claimText は今の文のまま）
 *  - claim + unverified → 判定を HELD にする（その事実・数字だけ画面から外れる。事例全体は止めない）
 *  - chapter / success / detail → 画面の層の行を、指紋（factHash・textHash）を保ったまま直す・消す
 * 何度当てても同じ結果になる（既に直っている行は飛ばす）。直す先が見つからない時は止まる。
 *
 * 使い方: node --import tsx scripts/reader-case/apply-fact-corrections.ts [台帳のファイル…]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import type { FactCorrection } from '@/shared/fact-integrity';
import { VERDICTS_FILE, type VerdictsFile } from './verify-lib';

const CHAPTERS = 'data/case-chapters.json';
const SUCCESS = 'data/success-points.json';
const DETAIL = 'data/detail-lines.json';

type ChapterRow = { text: string; source: string };
type ChapterEntry = { entityId: string; chapters: Record<string, ChapterRow[] | undefined> };
type SuccessEntry = { entityId: string; points: { head: string; body: string; factId: string; factHash: string }[] };
type DetailLine = { entityId: string; analysisId: string; answer: string; note?: string; hidden?: boolean };

const read = <T,>(p: string): T => JSON.parse(readFileSync(p, 'utf8')) as T;

export function applyCorrections(
  corrections: readonly FactCorrection[],
  files: { verdicts: VerdictsFile; chapters: ChapterEntry[]; success: SuccessEntry[]; detail: DetailLine[] },
): { applied: number; skipped: number } {
  let applied = 0; let skipped = 0;
  const fail = (c: FactCorrection, msg: string) => { throw new Error(`訂正 ${c.id}（${c.entityId}）: ${msg}`); };
  for (const c of corrections) {
    for (const a of c.actions) {
      if (a.target === 'claim') {
        const v = files.verdicts[c.entityId]?.[a.claimId];
        if (!v) fail(c, `主張 ${a.claimId} の照合結果が無い`);
        const next = 'unverified' in a
          ? { ...v!, verdict: 'HELD' as const, reason: a.unverified, fix: undefined, checkedAt: c.checkedAt }
          : { ...v!, verdict: 'PARTIAL' as const, fix: a.fix, quote: a.quote ?? v!.quote, checkedAt: c.checkedAt };
        if (JSON.stringify(next) === JSON.stringify(v)) { skipped += 1; continue; }
        files.verdicts[c.entityId][a.claimId] = JSON.parse(JSON.stringify(next));
        applied += 1;
      } else if (a.target === 'chapter') {
        const entry = files.chapters.find((e) => e.entityId === c.entityId);
        if (!entry) fail(c, '章が無い');
        let hit = false;
        for (const [id, rows] of Object.entries(entry!.chapters)) {
          if (!rows || (a.chapter !== '*' && a.chapter !== id)) continue;
          const kept: ChapterRow[] = [];
          for (const r of rows) {
            if (!r.text.includes(a.match)) { kept.push(r); continue; }
            hit = true;
            if ('remove' in a && a.remove) continue;
            kept.push({ ...r, text: r.text.replace(a.match, a.replace ?? '') });
          }
          entry!.chapters[id] = kept;
        }
        if (hit) applied += 1;
        else if (a.replace && Object.values(entry!.chapters).some((rows) => rows?.some((r) => r.text.includes(a.replace!)))) skipped += 1;
        else if ('remove' in a && a.remove) skipped += 1;
        else fail(c, `章の行「${a.match}」が無い`);
      } else if (a.target === 'success') {
        const pts = files.success.find((e) => e.entityId === c.entityId)?.points;
        const p = pts?.find((x) => x.factId === a.factId && (x.head.includes(a.match) || x.body.includes(a.match)));
        if (!p && a.remove) { skipped += 1; continue; }
        if (!p) {
          const done = files.success.find((e) => e.entityId === c.entityId)?.points.some((x) => x.factId === a.factId && ((a.head && x.head === a.head) || (a.body && x.body === a.body)));
          if (done) { skipped += 1; continue; }
          fail(c, `成功の秘訣「${a.match}」が無い`);
        }
        if (a.remove) pts!.splice(pts!.indexOf(p!), 1);
        if (a.head) p!.head = a.head;
        if (a.body) p!.body = a.body;
        applied += 1;
      } else if (a.target === 'detail') {
        const l = files.detail.find((x) => x.entityId === c.entityId && x.analysisId === a.analysisId);
        if (!l) fail(c, `分析欄 ${a.analysisId} が無い`);
        if (!`${l!.answer} ${l!.note ?? ''}`.includes(a.match)) {
          if ((a.answer && l!.answer === a.answer) || (a.note && l!.note === a.note) || (a.note === '' && l!.note === undefined)) { skipped += 1; continue; }
          fail(c, `分析欄の文「${a.match}」が無い`);
        }
        if (a.answer) l!.answer = a.answer;
        if (a.note === '') delete l!.note;
        else if (a.note) l!.note = a.note;
        if (a.hidden) l!.hidden = true;
        applied += 1;
      } else {
        fail(c, `未対応の直し方 ${(a as { target: string }).target}`);
      }
    }
  }
  return { applied, skipped };
}

if (process.argv[1]?.endsWith('apply-fact-corrections.ts')) {
  const paths = process.argv.slice(2).length ? process.argv.slice(2) : ['data/fact-corrections.json'];
  const corrections = paths.flatMap((p) => read<FactCorrection[]>(p));
  const files = { verdicts: read<VerdictsFile>(VERDICTS_FILE), chapters: read<ChapterEntry[]>(CHAPTERS), success: read<SuccessEntry[]>(SUCCESS), detail: read<DetailLine[]>(DETAIL) };
  const r = applyCorrections(corrections, files);
  writeFileSync(VERDICTS_FILE, `${JSON.stringify(files.verdicts, null, 1)}\n`);
  writeFileSync(CHAPTERS, `${JSON.stringify(files.chapters, null, 2)}\n`);
  writeFileSync(SUCCESS, `${JSON.stringify(files.success, null, 2)}\n`);
  writeFileSync(DETAIL, `${JSON.stringify(files.detail, null, 2)}\n`);
  console.log(`[fact-corrections] 当てた ${r.applied}、既に当たっていた ${r.skipped}（訂正 ${corrections.length} 件）`);
  // 公開中の事例を直すと、公開の入力の指紋が変わり、前の監査の受領書は無効になる（目録から外れる）。直した事例は必ず監査し直す
  const ids = [...new Set(corrections.map((c) => c.entityId))];
  console.log(`[fact-corrections] 次の手順: 直した ${ids.length} 件は監査の受領書が無効になる。`
    + '\n  1. printf で事例IDを1行ずつ書いた一覧を作り、node --import tsx scripts/reader-case/build-audit-input.ts --ids <一覧> --per 10 --tag <999999+日時>'
    + '\n  2. AUDIT_ONLY=\'<tag>*\' bash scripts/reader-case/run-audit.sh を実行し、出る指示書を別のAIに実行させる（自分で監査しない）'
    + '\n  3. node --import tsx scripts/reader-case/merge-analysis.ts --ids <一覧> で受領書を取り込み、node --import tsx scripts/prepare-catalog-release.ts --dry-run で外れる事例が0件か確かめる'
    + `\n  対象: ${ids.join(' ')}`);
}
