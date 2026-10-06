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
export type DiagnosisStage = 'LEAD' | 'THIN' | 'COLLECT' | 'RIGHTS' | 'ENTITY' | 'FETCH' | 'VERIFY' | 'IMAGE' | 'AUDIT' | 'IMPORT';
/** 出せない理由の分類（報告・画面向けの短い名前） */
export const STAGE_LABEL: Record<DiagnosisStage, string> = {
  LEAD: 'リード書き直し待ち', THIN: '全体が薄い', COLLECT: '収集の直し待ち', RIGHTS: '権利待ち', ENTITY: '目録の記録待ち',
  FETCH: '出典本文の取得待ち', VERIFY: '照合待ち', IMAGE: '画像待ち', AUDIT: '審査待ち', IMPORT: '取り込みの直し待ち',
};
const STAGE_ACTION: Record<DiagnosisStage, string> = {
  LEAD: '事例担当: リードを書き直す（強い1〜2行。lead-standard の基準）。直せない時だけ保留',
  THIN: '事例担当: 全体が薄い（本文の節が足りない）。別の出典で事実を足すか、出せる形が無ければ保留',
  COLLECT: '事例担当: 表示契約の項目を埋める／出典・リードを直して out/<id>.json を作り直す',
  RIGHTS: '権利待ち: 出典の利用条件の個別審査（data/catalog-source-rights.json）がオーナー承認で allowed になるまで保留。提案は decision: held で記録し、承認で allowed に変える',
  ENTITY: '目録: 事業の記録（entities-index.json）を足す・出所の根拠を付ける（add-entity-records.ts）',
  FETCH: '経路: 出典本文を取得する（fetch-sources.ts）',
  VERIFY: '経路: 取り込み版の事実を出典本文と照合する（build-verify-batches → run-verify → merge-verdicts）',
  IMAGE: '経路: 製品画面の画像を集めて権利を判定する（画像台帳 data/media-staging）',
  AUDIT: '経路: 取り込み版の入力全体を審査して受領書を出す（build-audit-input → run-audit）',
  IMPORT: '事例担当: 取り込みで保留になった理由を直す（台帳 data/pipeline/ledger の理由）',
};

/** 関門の理由の文言 → 段。publication-evaluation.ts / case-reflect.ts の文言に合わせる */
export function stageOf(reason: string): DiagnosisStage {
  if (reason.startsWith('リードを書き直す') || /取り込み保留:LEAD_NOT_PASSED/.test(reason)) return 'LEAD';
  if (reason.startsWith('全体が薄い')) return 'THIN';
  if (reason.startsWith('取り込み保留') || reason.startsWith('取り込み出力')) return 'IMPORT';
  if (/^(利用条件|出典の利用条件)/.test(reason)) return 'RIGHTS';
  if (/^(リード|仮置きの語|出典が無い|利用規約で表示できない出典|空欄|データが少ない|根拠付きの事業説明が無い)/.test(reason)) return 'COLLECT';
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
  /** 出せない理由の分類（STAGE_LABEL）。表示可なら空 */
  categories: string[];
  /** 外して表示した項目（1項目・1出典の問題で事例全体を止めないため）と、補うための別の出典の候補 */
  hidden: { items: string[]; alternatives: string[] };
  /** 取り込みで型に合わず外した情報。捨てずに、型外の救済ストリーム（Layer 3: 保存済み観測の表示経路）へ載せる候補 */
  outOfType: unknown[];
}

export function diagnose(entry: ReflectEntry, collected: ReaderCase | null, hasDisplayableImage: boolean, extra: { outOfType?: unknown[]; officialUrl?: string | null } = {}): Diagnosis {
  const coverage = collected ? displayCoverage(collected, { hasDisplayableImage }) : { filled: [], missing: DISPLAY_ITEMS.map((i) => i.key) };
  const missing = coverage.missing.map((key) => { const item = DISPLAY_ITEMS.find((i) => i.key === key)!; return { key, label: item.label, collect: item.collect }; });
  const blockers: Diagnosis['blockers'] = {};
  // 照合が済んでいない（事実が全部落ちた）時の空欄・薄さ・出典なしは、照合待ちの結果であって収集の不足ではない。
  // 収集の不足は、照合前の中身で見た表示契約の空き（contract.missing）で判断する
  const unverified = entry.reasons.some((r) => r === '未照合' || r === '照合済みの事実が無い');
  const consequence = /^(全体が薄い|空欄|データが少ない|根拠付きの事業説明が無い|出典の利用条件が未充足|表示形式が不正)/;
  for (const reason of entry.reasons) {
    const stage = unverified && consequence.test(reason) ? 'VERIFY' : stageOf(reason);
    (blockers[stage] ??= []).push(reason);
  }
  if (!hasDisplayableImage && !blockers.IMAGE) blockers.IMAGE = ['表示できる画像が無い'];
  const hiddenItems = entry.hidden ?? [];
  // 外した出典の代わりの候補: 事業の公式サイト、創業者本人の発信、事例に残っている他の出典（使える条件は権利の審査記録で確かめる）
  const kept = new Set((entry.reader?.sources ?? []).map((s) => s.url));
  const alternatives = hiddenItems.some((h) => h.startsWith('出典:') || h.startsWith('事実:') || h.startsWith('数値:'))
    ? [...new Set([...(extra.officialUrl ? [`公式サイト: ${extra.officialUrl}`] : []), '創業者本人の発信（本人のブログ・SNS・登壇。本人申告として表示）', ...[...kept].map((u) => `この事例の他の出典: ${u}`)])]
    : [];
  for (const h of hiddenItems.filter((x) => x.startsWith('出典:'))) (blockers.RIGHTS ??= []).push(`権利待ち・取得不可で外した出典（承認・取得できれば次の反映で自動で戻る）: ${h.split(':').slice(2).join(':')}`);
  if (entry.state === 'SHOW') for (const k of Object.keys(blockers) as DiagnosisStage[]) if (k === 'IMAGE' && hasDisplayableImage) delete blockers[k];
  const collector = [
    ...(hiddenItems.length ? [`外して表示した項目（別の出典で補えれば戻る）: ${hiddenItems.join(' / ')}`] : []),
    ...missing.filter((m) => m.key !== 'IMAGE').map((m) => `${m.label}: ${m.collect}`),
    ...(blockers.COLLECT ?? []), ...(blockers.IMPORT ?? []),
  ];
  const pipeline = (Object.keys(blockers) as DiagnosisStage[]).filter((s) => s !== 'COLLECT' && s !== 'IMPORT').map((s) => STAGE_ACTION[s]);
  const order: DiagnosisStage[] = ['RIGHTS', 'LEAD', 'THIN', 'IMAGE', 'COLLECT', 'IMPORT', 'ENTITY', 'FETCH', 'VERIFY', 'AUDIT'];
  const categories = entry.state === 'SHOW' ? [] : order.filter((k) => blockers[k]?.length && !(k === 'RIGHTS' && !entry.reasons.some((r) => stageOf(r) === 'RIGHTS'))).map((k) => STAGE_LABEL[k]);
  return { id: entry.id, contractVersion: DISPLAY_CONTRACT_VERSION, reflect: { state: entry.state, stage: entry.stage, hash: entry.hash, importHash: entry.importHash },
    contract: { filled: coverage.filled, missing }, blockers, collector, pipeline, categories, hidden: { items: hiddenItems, alternatives }, outOfType: extra.outOfType ?? [] };
}

function readCollected(dataDir: string, id: string): ReaderCase | null {
  const dir = `${dataDir}/case-import/${id}`;
  if (!existsSync(`${dir}/reader.json`) || !existsSync(`${dir}/analysis.json`)) return null;
  return { ...(JSON.parse(readFileSync(`${dir}/reader.json`, 'utf8')) as ReaderCase), analysis: JSON.parse(readFileSync(`${dir}/analysis.json`, 'utf8')) };
}

export async function diagnoseAll(state: ReflectState, ids: string[], dataDir: string, imageOf: (id: string) => Promise<boolean>, officialUrlOf?: (id: string) => string | null): Promise<Diagnosis[]> {
  const out: Diagnosis[] = [];
  for (const id of ids) {
    const entry = state.cases[id];
    if (!entry) continue;
    const manifestPath = `${dataDir}/case-import/${id}/import.json`;
    const manifest = existsSync(manifestPath) ? (JSON.parse(readFileSync(manifestPath, 'utf8')) as { outOfType?: unknown[] }) : {};
    out.push(diagnose(entry, readCollected(dataDir, id), await imageOf(id), { outOfType: manifest.outOfType ?? [], officialUrl: officialUrlOf?.(id) ?? null }));
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
  const { loadEntities } = await import('./load-readers');
  const entities = loadEntities(ids);
  const results = await diagnoseAll(state, ids, dataDir, imageOf, (id) => { const e = entities.get(id) as { officialUrl?: string; url?: string } | undefined; return e?.officialUrl ?? e?.url ?? null; });
  mkdirSync(FEEDBACK_DIR, { recursive: true });
  for (const d of results) {
    const path = `${FEEDBACK_DIR}/${d.id}.json`;
    writeFileSync(`${path}.tmp`, `${JSON.stringify(d, null, 1)}\n`);
    renameSync(`${path}.tmp`, path);
    console.log(JSON.stringify({ id: d.id, state: d.reflect.state, categories: d.categories, hidden: d.hidden.items.length, outOfType: d.outOfType.length, missing: d.contract.missing.map((m) => m.key), blockers: Object.fromEntries(Object.entries(d.blockers).map(([k, v]) => [k, v!.length])) }));
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) void main().catch((error) => { console.error(error); process.exitCode = 1; });
