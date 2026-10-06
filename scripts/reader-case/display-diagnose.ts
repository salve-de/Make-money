/**
 * 画面に出せなかった理由の診断。事例ごとに「表示契約のどの項目が埋まらないか」と「どの基準（段）で落ちたか」を機械で出し、
 * 収集側（事例担当）が直すことと、経路の後段（照合・審査など）が進めることに分けて data/case-feedback/<id>.json に書く。
 *
 * 収集側への戻し方: 事例担当は data/case-feedback/<id>.json の collector を読み、AGENT_BRIEF と表示契約（docs/pipeline/DISPLAY_CONTRACT.md）に沿って作り直す。
 * 作り直した出力は import-case-rebuild → case-reflect で入力指紋が変わるので、その事例だけ再判定される。
 *
 * 入力: data/case-reflect.json（反映段の判定）、data/case-import/<id>/reader.json・analysis.json（集めたままの中身。照合前）、画像台帳。
 * 書くのはローカルの data/case-feedback/ だけ。使い方: node --import tsx scripts/reader-case/display-diagnose.ts [--ids a,b]
 */
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { DISPLAY_CONTRACT_VERSION, DISPLAY_ITEMS, displayCoverage } from '../../src/shared/display-contract';
import type { ReaderCase } from '../../src/shared/reader-case';
import { readReflectState, type ReflectEntry, type ReflectState } from './case-reflect';

export const FEEDBACK_DIR = 'data/case-feedback';

/** 落ちた基準の段。COLLECT は事例担当が直す。それ以外は経路の後段が進める */
export type DiagnosisStage = 'COLLECT' | 'ENTITY' | 'FETCH' | 'VERIFY' | 'IMAGE' | 'AUDIT' | 'IMPORT';
const STAGE_ACTION: Record<DiagnosisStage, string> = {
  COLLECT: '事例担当: 表示契約の項目を埋める／出典・リードを直して out/<id>.json を作り直す',
  ENTITY: '目録: 事業の記録（entities-index.json）を足す・出所の根拠を付ける（add-entity-records.ts）',
  FETCH: '経路: 出典本文を取得する（fetch-sources.ts）',
  VERIFY: '経路: 取り込み版の事実を出典本文と照合する（build-verify-batches → run-verify → merge-verdicts）',
  IMAGE: '経路: 製品画面の画像を集めて権利を判定する（画像台帳 data/media-staging）',
  AUDIT: '経路: 取り込み版の入力全体を審査して受領書を出す（build-audit-input → run-audit）',
  IMPORT: '事例担当: 取り込みで保留になった理由を直す（台帳 data/pipeline/ledger の理由）',
};

/** 関門の理由の文言 → 段。publication-evaluation.ts / case-reflect.ts の文言に合わせる */
export function stageOf(reason: string): DiagnosisStage {
  if (reason.startsWith('取り込み保留') || reason.startsWith('取り込み出力')) return 'IMPORT';
  if (/^(リード|仮置きの語|出典が無い|利用規約で表示できない出典|利用条件|出典の利用条件|空欄|データが少ない|根拠付きの事業説明が無い)/.test(reason)) return 'COLLECT';
  if (/^(事業の記録|事業identity|事業の公開区分)/.test(reason)) return 'ENTITY';
  if (reason.startsWith('出典本文')) return 'FETCH';
  if (/^(未照合|照合済みの事実が無い|根拠の不一致|推論:|表示形式が不正)/.test(reason)) return 'VERIFY';
  if (reason.startsWith('画像')) return 'IMAGE';
  if (reason.startsWith('現在の入力に対する監査')) return 'AUDIT';
  return 'COLLECT';
}

export interface Diagnosis {
  id: string;
  contractVersion: string;
  reflect: { state: ReflectEntry['state']; stage?: ReflectEntry['stage']; hash: string; importHash: string | null };
  /** 集めたまま（照合前）の中身で、表示契約の項目が埋まっているか */
  contract: { filled: string[]; missing: { key: string; label: string; collect: string }[] };
  /** 落ちた基準を段ごとに */
  blockers: Partial<Record<DiagnosisStage, string[]>>;
  /** 事例担当が直すこと（表示契約の空き＋収集段の基準） */
  collector: string[];
  /** 経路の後段が進めること */
  pipeline: string[];
}

export function diagnose(entry: ReflectEntry, collected: ReaderCase | null, hasDisplayableImage: boolean): Diagnosis {
  const coverage = collected ? displayCoverage(collected, { hasDisplayableImage }) : { filled: [], missing: DISPLAY_ITEMS.map((i) => i.key) };
  const missing = coverage.missing.map((key) => { const item = DISPLAY_ITEMS.find((i) => i.key === key)!; return { key, label: item.label, collect: item.collect }; });
  const blockers: Diagnosis['blockers'] = {};
  // 照合が済んでいない（事実が全部落ちた）時の空欄・薄さ・出典なしは、照合待ちの結果であって収集の不足ではない。
  // 収集の不足は、照合前の中身で見た表示契約の空き（contract.missing）で判断する
  const unverified = entry.reasons.some((r) => r === '未照合' || r === '照合済みの事実が無い');
  const consequence = /^(空欄|データが少ない|根拠付きの事業説明が無い|出典の利用条件が未充足|表示形式が不正)/;
  for (const reason of entry.reasons) {
    const stage = unverified && consequence.test(reason) ? 'VERIFY' : stageOf(reason);
    (blockers[stage] ??= []).push(reason);
  }
  if (!hasDisplayableImage && !blockers.IMAGE) blockers.IMAGE = ['表示できる画像が無い'];
  const collector = [
    ...missing.filter((m) => m.key !== 'IMAGE').map((m) => `${m.label}: ${m.collect}`),
    ...(blockers.COLLECT ?? []), ...(blockers.IMPORT ?? []),
  ];
  const pipeline = (Object.keys(blockers) as DiagnosisStage[]).filter((s) => s !== 'COLLECT' && s !== 'IMPORT').map((s) => STAGE_ACTION[s]);
  return { id: entry.id, contractVersion: DISPLAY_CONTRACT_VERSION, reflect: { state: entry.state, stage: entry.stage, hash: entry.hash, importHash: entry.importHash },
    contract: { filled: coverage.filled, missing }, blockers, collector, pipeline };
}

function readCollected(dataDir: string, id: string): ReaderCase | null {
  const dir = `${dataDir}/case-import/${id}`;
  if (!existsSync(`${dir}/reader.json`) || !existsSync(`${dir}/analysis.json`)) return null;
  return { ...(JSON.parse(readFileSync(`${dir}/reader.json`, 'utf8')) as ReaderCase), analysis: JSON.parse(readFileSync(`${dir}/analysis.json`, 'utf8')) };
}

export async function diagnoseAll(state: ReflectState, ids: string[], dataDir: string, imageOf: (id: string) => Promise<boolean>): Promise<Diagnosis[]> {
  const out: Diagnosis[] = [];
  for (const id of ids) {
    const entry = state.cases[id];
    if (!entry) continue;
    out.push(diagnose(entry, readCollected(dataDir, id), await imageOf(id)));
  }
  return out;
}

async function main() {
  const args = process.argv.slice(2);
  const val = (k: string) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
  const dataDir = val('--data') ?? 'data';
  const state = readReflectState(`${dataDir}/case-reflect.json`);
  const ids = val('--ids')?.split(',').map((s) => s.trim()).filter(Boolean) ?? Object.keys(state.cases).sort();
  const { readEffectiveManifest } = await import('../../src/shared/media-asset-store');
  const { isMediaDisplayable } = await import('../../src/shared/media-decisions');
  const imageOf = async (id: string) => {
    try { return !!(await readEffectiveManifest(id))?.assets.some((a) => isMediaDisplayable(a) && a.kind !== 'og_image'); } catch { return false; }
  };
  const results = await diagnoseAll(state, ids, dataDir, imageOf);
  mkdirSync(FEEDBACK_DIR, { recursive: true });
  for (const d of results) {
    const path = `${FEEDBACK_DIR}/${d.id}.json`;
    writeFileSync(`${path}.tmp`, `${JSON.stringify(d, null, 1)}\n`);
    renameSync(`${path}.tmp`, path);
    console.log(JSON.stringify({ id: d.id, state: d.reflect.state, missing: d.contract.missing.map((m) => m.key), blockers: Object.fromEntries(Object.entries(d.blockers).map(([k, v]) => [k, v!.length])) }));
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) void main().catch((error) => { console.error(error); process.exitCode = 1; });
