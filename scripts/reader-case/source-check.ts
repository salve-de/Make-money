/**
 * 原文照合の関門（画面に出す前）。事実・数字・章の行を、出典を実際に取得した本文で機械で照らし、台帳に残す。
 * 判定の規則は src/shared/source-check.ts。手順の説明は docs/COLLECT_TO_UI.md 段5c、docs/DATA_COLLECTION_MASTER_GUIDE.md「数字の5つの約束」。
 *
 *   node --import tsx scripts/reader-case/source-check.ts                 仕上げ済みの全件を照らす（結果を記録するだけ）
 *   ... --ids <file>                                                      対象を絞る
 *   ... --sample 30                                                       公開後の抜き取り（日付で決まる30項目だけ照らす）
 *   ... --apply                                                           不合格の扱いを進める（やり直しの指示書を出す／上限に達したら保留にして画面から外す）
 *   ... --max-attempts 3                                                  やり直しの上限（既定3回）
 *   ... --label <名前>                                                    誤り率の台帳に残す回の名前
 *
 * 不合格の時の流れ（消して終わりにしない）:
 *  1. その場で出典を取り直す（新しく取得 → だめなら Web アーカイブの保存版）。取れたら照らし直す。
 *  2. まだ不合格なら、やり直しの回数を1つ増やし、再収集の指示書（data/runner/instructions/recollect/）を出す。
 *     別のAIが別の出典・保存版を探し、訂正の台帳の形（data/fact-corrections.json と同じ）で data/runner/inbox/recollect/ に置く。
 *     scripts/reader-case/apply-fact-corrections.ts が取り込み、次の回でこの関門がもう一度照らす。
 *  3. 上限に達したら保留（data/source-check/held.json）。その事実・数字・章の行だけを画面から外す（事例全体は止めない）。
 * 記録: data/source-check/state.json（項目ごとの今の合否。lint がこれで画面の元を確かめる）、
 *       data/source-check/ledger.jsonl（回ごとの誤り率）、data/source-check/runs/<回>.json（その回の全項目）。
 * 書き込み先はローカルのファイルだけ。R2・公開・本番には触れない。
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { argValue, loadReaders, readIdsFile } from './load-readers';
import { VERDICTS_FILE, cachePath, metricLine, readCache, type VerdictsFile, type SourceCacheRecord } from './verify-lib';
import { fetchArchive, fetchOne } from './fetch-sources';
import { applyVerdicts } from '../../src/lib/company-access/reader-verdicts';
import { checkMetric, checkText, REASON_LABELS, type CheckReason } from '../../src/shared/source-check';
import { textFingerprint } from '../../src/shared/list-lines';
import { serialize, type ChapterEntry } from '../../src/shared/display-build';
import { ownerContext } from './owner-context';

export const STATE_FILE = 'data/source-check/state.json';
export const LEDGER_FILE = 'data/source-check/ledger.jsonl';
export const HELD_FILE = 'data/source-check/held.json';
const RUNS_DIR = 'data/source-check/runs';
const RECOLLECT_DIR = 'data/runner/instructions/recollect';

export type ItemKind = 'fact' | 'metric' | 'chapter';
export interface StateEntry { textHash: string; status: 'PASS' | 'FAIL' | 'HELD'; attempts: number; reasons: CheckReason[]; sourceUrl: string; runId: string; checkedAt: string }
export type SourceCheckState = Record<string, StateEntry>;
export interface HeldEntry { key: string; entityId: string; kind: ItemKind; id: string; text: string; sourceUrl: string; reasons: CheckReason[]; heldAt: string; chapter?: string }

/** 項目の鍵。章の行は文の指紋で識別する（行の並びが変わっても同じ行を指す） */
export const itemKey = (entityId: string, kind: ItemKind, id: string) => `${entityId}|${kind}|${id}`;
export const readJson = <T>(file: string, fallback: T): T => (existsSync(file) ? (JSON.parse(readFileSync(file, 'utf8')) as T) : fallback);

interface Item { key: string; entityId: string; kind: ItemKind; id: string; text: string; textHash: string; sourceUrl: string; publishedAt?: string; quote?: string; metric?: Parameters<typeof checkMetric>[0]; chapter?: string }

/** 照合の対象（画面に出る形の事実・数字と、章の行） */
export function collectItems(ids: readonly string[]): Item[] {
  const verdicts = readJson<VerdictsFile>(VERDICTS_FILE, {});
  const chapters = readJson<ChapterEntry[]>('data/case-chapters.json', []);
  const readers = loadReaders([...ids]);
  const items: Item[] = [];
  for (const id of ids) {
    const base = readers.get(id);
    const applied = base ? applyVerdicts(base, verdicts[id]) : null;
    if (applied) {
      const src = new Map(applied.reader.sources.map((s) => [s.id, s]));
      for (const f of applied.reader.facts) {
        const s = src.get(f.sourceId)!;
        items.push({ key: itemKey(id, 'fact', f.id), entityId: id, kind: 'fact', id: f.id, text: f.text, textHash: textFingerprint(f.text), sourceUrl: s.url, publishedAt: s.publishedAt, quote: verdicts[id]?.[f.id]?.quote });
      }
      for (const m of applied.reader.metrics) {
        const s = src.get(m.sourceId)!;
        const line = metricLine(m);
        items.push({ key: itemKey(id, 'metric', m.id), entityId: id, kind: 'metric', id: m.id, text: line, textHash: textFingerprint(line), sourceUrl: s.url, publishedAt: s.publishedAt, quote: verdicts[id]?.[m.id]?.quote ?? '', metric: m });
      }
    }
    for (const [chapter, rows] of Object.entries(chapters.find((e) => e.entityId === id)?.chapters ?? {})) {
      for (const r of rows ?? []) {
        const h = textFingerprint(r.text);
        items.push({ key: itemKey(id, 'chapter', `${chapter}:${h}`), entityId: id, kind: 'chapter', id: `${chapter}:${h}`, text: r.text, textHash: h, sourceUrl: r.source, chapter });
      }
    }
  }
  return items;
}

const cacheOk = (r: SourceCacheRecord | undefined) => !!r && r.text.length >= 200;
async function sourceText(url: string, fresh: boolean): Promise<SourceCacheRecord | undefined> {
  let rec = fresh ? undefined : readCache(url);
  if (!cacheOk(rec)) {
    rec = await fetchOne(url);
    mkdirSync(dirname(cachePath(url)), { recursive: true });
    writeFileSync(cachePath(url), JSON.stringify(rec));
  }
  return rec;
}

function judge(item: Item, rec: SourceCacheRecord | undefined) {
  const text = rec?.text ?? '';
  if (item.kind === 'metric') return checkMetric(item.metric!, item.quote ?? '', text, item.publishedAt);
  if (item.kind === 'fact') return checkText(item.text, text, { quote: item.quote ?? '', publishedAt: item.publishedAt });
  return checkText(item.text, text);
}

/** 日付で決まる抜き取り（同じ日なら同じ項目。公開後の定期の照合し直しに使う） */
export function sampleItems<T extends { key: string }>(items: readonly T[], n: number, seed: string): T[] {
  const score = (k: string) => textFingerprint(`${seed}|${k}`);
  return [...items].sort((a, b) => score(a.key).localeCompare(score(b.key))).slice(0, n);
}

async function main() {
  const idsFile = argValue('--ids');
  const finished = readIdsFile('data/catalog-finished-ids.txt');
  const ids = idsFile ? readIdsFile(idsFile) : finished;
  const apply = process.argv.includes('--apply');
  const maxAttempts = Number(argValue('--max-attempts') ?? 3);
  const sample = argValue('--sample');
  const now = new Date();
  const runId = now.toISOString().replace(/[-:]/g, '').slice(0, 15);
  let items = collectItems(ids);
  if (sample) items = sampleItems(items, Number(sample), now.toISOString().slice(0, 10));

  const results: Array<Item & { status: 'PASS' | 'FAIL'; reasons: CheckReason[]; detail: string[]; via?: string; retried: boolean }> = [];
  for (const item of items) {
    let rec = await sourceText(item.sourceUrl, false);
    let r = judge(item, rec);
    let retried = false;
    // 1. その場で取り直す（新しく取得。だめなら fetchOne が Web アーカイブを試す）
    if (!r.ok) {
      retried = true;
      const again = await fetchOne(item.sourceUrl);
      if (cacheOk(again)) { writeFileSync(cachePath(item.sourceUrl), JSON.stringify(again)); rec = again; r = judge(item, rec); }
    }
    // 2. 直接取得の本文に無かった時だけ、保存ページでも照らす（直接取得では一部が欠けることがある。照らすだけで控えは書き換えない）
    if (!r.ok && rec?.via !== 'wayback') {
      const archived = await fetchArchive(item.sourceUrl);
      if (archived) { const ra = judge(item, archived); if (ra.ok) { rec = archived; r = ra; } }
    }
    results.push({ ...item, status: r.ok ? 'PASS' : 'FAIL', reasons: r.reasons, detail: r.detail, via: rec?.via, retried });
  }

  // 台帳（項目ごとの今の合否）
  const state = readJson<SourceCheckState>(STATE_FILE, {});
  const held = readJson<HeldEntry[]>(HELD_FILE, []);
  const checkedAt = now.toISOString().slice(0, 10);
  const recollect: typeof results = [];
  const toHold: typeof results = [];
  for (const r of results) {
    const prev = state[r.key];
    const attempts = r.status === 'PASS' ? 0 : (prev && prev.textHash === r.textHash ? prev.attempts : 0) + (apply ? 1 : 0);
    state[r.key] = { textHash: r.textHash, status: r.status, attempts, reasons: r.reasons, sourceUrl: r.sourceUrl, runId, checkedAt };
    if (r.status === 'FAIL' && apply) (attempts >= maxAttempts ? toHold : recollect).push(r);
  }

  if (apply && toHold.length) {
    // 3. 上限に達した項目だけを画面から外す: 事実・数字は照合の判定を「保留」に、章の行は章から抜いて保留の一覧へ
    const verdicts = readJson<VerdictsFile>(VERDICTS_FILE, {});
    const chapters = readJson<ChapterEntry[]>('data/case-chapters.json', []);
    for (const r of toHold) {
      state[r.key].status = 'HELD';
      held.push({ key: r.key, entityId: r.entityId, kind: r.kind, id: r.id, text: r.text, sourceUrl: r.sourceUrl, reasons: r.reasons, heldAt: checkedAt, ...(r.chapter ? { chapter: r.chapter } : {}) });
      if (r.kind === 'chapter') {
        const entry = chapters.find((e) => e.entityId === r.entityId);
        const rows = entry?.chapters[r.chapter as keyof ChapterEntry['chapters']];
        if (entry && rows) {
          const left = rows.filter((row) => textFingerprint(row.text) !== r.textHash);
          if (left.length) entry.chapters[r.chapter as keyof ChapterEntry['chapters']] = left;
          else delete entry.chapters[r.chapter as keyof ChapterEntry['chapters']];
        }
      } else {
        const v = verdicts[r.entityId]?.[r.id];
        if (v) verdicts[r.entityId][r.id] = { ...v, verdict: 'HELD', reason: `原文照合で${maxAttempts}回不合格: ${r.reasons.map((x) => REASON_LABELS[x]).join('、')}` };
      }
    }
    writeFileSync(VERDICTS_FILE, `${JSON.stringify(verdicts, null, 1)}\n`);
    writeFileSync('data/case-chapters.json', serialize(chapters));
  }
  if (apply && recollect.length) {
    // 2. 再収集の指示書（別のAIが別の出典・保存版を探し、訂正の台帳の形で inbox に置く）
    mkdirSync(RECOLLECT_DIR, { recursive: true });
    const prompt = readFileSync('scripts/reader-case/recollect-prompt.md', 'utf8');
    const list = recollect.map((r) => ({ key: r.key, entityId: r.entityId, kind: r.kind, id: r.id, text: r.text, sourceUrl: r.sourceUrl, quote: r.quote, reasons: r.reasons.map((x) => REASON_LABELS[x]), detail: r.detail, attempt: state[r.key].attempts, maxAttempts }));
    writeFileSync(`${RECOLLECT_DIR}/${runId}.md`, `${prompt}${ownerContext('.')}\n\n## 入力（${list.length}項目）\n\n結果の書き先: data/runner/inbox/recollect/${runId}.json\n\n\`\`\`json\n${JSON.stringify(list, null, 1)}\n\`\`\`\n`);
  }

  mkdirSync(RUNS_DIR, { recursive: true });
  writeFileSync(STATE_FILE, `${JSON.stringify(Object.fromEntries(Object.entries(state).sort(([a], [b]) => a.localeCompare(b))), null, 1)}\n`);
  writeFileSync(HELD_FILE, `${JSON.stringify(held, null, 1)}\n`);
  writeFileSync(`${RUNS_DIR}/${runId}.json`, `${JSON.stringify(results.map((r) => ({ ...r, metric: undefined })), null, 1)}\n`);
  // 誤り率（回ごと）: 原文照合で落ちた数／照らした数。事例単位でも残す（公開10件の基準値は 10件中7件）
  const failed = results.filter((r) => r.status === 'FAIL');
  const byCase = new Map<string, { total: number; failed: number }>();
  for (const r of results) { const c = byCase.get(r.entityId) ?? { total: 0, failed: 0 }; c.total += 1; if (r.status === 'FAIL') c.failed += 1; byCase.set(r.entityId, c); }
  const reasons: Record<string, number> = {};
  for (const r of failed) for (const x of r.reasons) reasons[x] = (reasons[x] ?? 0) + 1;
  const line = {
    runId, at: now.toISOString(), label: argValue('--label') ?? (sample ? 'sample' : 'full'), mode: sample ? `sample-${sample}` : 'full', apply,
    cases: byCase.size, casesWithFailure: [...byCase.values()].filter((c) => c.failed > 0).length,
    total: results.length, failed: failed.length, failRate: results.length ? Number((failed.length / results.length).toFixed(4)) : 0,
    reasons, recollect: recollect.length, held: toHold.length,
  };
  mkdirSync(dirname(LEDGER_FILE), { recursive: true });
  appendFileSync(LEDGER_FILE, `${JSON.stringify(line)}\n`);
  console.log(JSON.stringify(line));
  for (const r of failed) console.log(`不合格 ${r.key}: ${r.reasons.map((x) => REASON_LABELS[x]).join('、')}${r.detail.length ? `（${r.detail.join('／')}）` : ''}「${r.text.slice(0, 50)}」`);
  // 不合格が残る間は異常終了にする（続けて回す側がここで止まれる）
  if (failed.length) process.exitCode = 1;
}

if (process.argv[1]?.endsWith('source-check.ts')) void main();
