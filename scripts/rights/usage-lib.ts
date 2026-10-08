/**
 * 「どのサイトが、どの事例のどの事実・どの画面の文に使われているか」を調べる（読み取り専用。公開側にも書かない）。
 * 公開中の事例（data/catalog-release.json の details）を、出典の権利判定をかけない形で読み、ドメインに当たる出典から辿る。
 */
import { existsSync, readFileSync } from 'node:fs';
import { projectReaderCase } from '../../src/lib/company-access/reader-case-projection';
import type { ReaderCase } from '../../src/shared/reader-case';
import { readReflectState, reflectedReader } from '../reader-case/case-reflect';
import { sourcePolicyIgnoringLedger } from '../reader-case/source-policy';
import { domainCovers, hostOf } from './ledger-lib';

export interface UsageHit {
  caseId: string;
  caseName: string;
  /** 台帳の使用停止を見ない判定で、いま許可されている出典か（false=もともと不許可で、画面には出ていない） */
  sources: { id: string; url: string; publisher: string; allowedByRules: boolean }[];
  facts: { id: string; text: string }[];
  metrics: { id: string; label: string }[];
  /** 外れた事実・数字を根拠(basis)に含む分析（外れる事実を根拠にしている分だけ） */
  analysis: { id: string; item: string; text: string; basisLost: string[]; basisKept: string[] }[];
  /** 画面の文（data/*.json）のうち、外れる事実・分析に結びついているもの */
  screen: { file: string; kind: string; ref: string }[];
}

type Rec = Record<string, unknown>;
const readJson = <T,>(file: string, fallback: T): T => (existsSync(file) ? (JSON.parse(readFileSync(file, 'utf8')) as T) : fallback);

export function publishedIds(): string[] {
  return Object.keys(readJson<{ details: Record<string, string> }>('data/catalog-release.json', { details: {} }).details);
}

/** 出典の権利判定をかけずに、公開中の事例の reader を作る（loadReaders と同じ反映段つき） */
export function loadUnfilteredReaders(ids = publishedIds()): Map<string, { reader: ReaderCase; entityUrl: string; name: string }> {
  const want = new Set(ids);
  const raw = readJson<Rec[]>('data/entities-index.json', []);
  const out = new Map<string, { reader: ReaderCase; entityUrl: string; name: string }>();
  for (const r of raw) {
    const id = typeof r?.id === 'string' ? r.id : undefined;
    if (!id || !want.has(id)) continue;
    out.set(id, { reader: projectReaderCase(r).reader, entityUrl: typeof r.url === 'string' ? r.url : '', name: String(r.name ?? id) });
  }
  const reflect = readReflectState();
  for (const id of [...out.keys()]) {
    const rr = reflectedReader(reflect, id);
    if (rr === null) out.delete(id);
    else if (rr) out.set(id, { ...out.get(id)!, reader: rr });
  }
  return out;
}

/** 画面の文を持つ data/*.json から、事実ID・分析IDに結びついた行を引く */
function screenRefs(caseId: string, factIds: Set<string>, analysisIds: Set<string>): UsageHit['screen'] {
  const out: UsageHit['screen'] = [];
  const arr = (f: string) => readJson<Rec[]>(`data/${f}.json`, []).filter((x) => x.entityId === caseId);
  for (const l of arr('list-lines')) if (factIds.has(String(l.factId))) out.push({ file: 'list-lines.json', kind: '一覧の1行', ref: String(l.factId) });
  for (const l of arr('fact-lines')) if (l.kind === 'fact' && factIds.has(String(l.targetId))) out.push({ file: 'fact-lines.json', kind: '事実の表示文', ref: String(l.targetId) });
  for (const l of arr('fact-lines')) if (l.kind !== 'fact' && factIds.has(String(l.targetId))) out.push({ file: 'fact-lines.json', kind: `${String(l.kind)}の表示文`, ref: String(l.targetId) });
  for (const l of arr('detail-lines')) if (analysisIds.has(String(l.analysisId))) out.push({ file: 'detail-lines.json', kind: '分析欄の文', ref: String(l.analysisId) });
  for (const c of arr('success-points')) {
    for (const p of (c.points as Rec[] | undefined) ?? []) if (factIds.has(String(p.factId))) out.push({ file: 'success-points.json', kind: '成功の秘訣', ref: String(p.factId) });
  }
  for (const c of arr('case-chapters')) if (factIds.has(String(c.factId))) out.push({ file: 'case-chapters.json', kind: '章', ref: String(c.factId) });
  return out;
}

/** domain（サブドメイン込み）の出典を使っている事例ごとの結果。使っていない事例は含めない */
export function findUsage(domain: string, readers = loadUnfilteredReaders()): UsageHit[] {
  const hits: UsageHit[] = [];
  for (const [caseId, { reader, entityUrl, name }] of readers) {
    const matched = reader.sources.filter((s) => { const h = hostOf(s.url); return !!h && domainCovers(domain, h); });
    if (!matched.length) continue;
    const ids = new Set(matched.map((s) => s.id));
    const facts = reader.facts.filter((f) => ids.has(f.sourceId));
    const metrics = reader.metrics.filter((m) => ids.has(m.sourceId));
    const lost = new Set([...facts.map((f) => f.id), ...metrics.map((m) => m.id)]);
    const allEvidence = [...reader.facts.map((f) => f.id), ...reader.metrics.map((m) => m.id)];
    const analysis = (reader.analysis ?? []).filter((a) => a.basis.some((b) => lost.has(b))).map((a) => ({
      id: a.id, item: a.item, text: a.text,
      basisLost: a.basis.filter((b) => lost.has(b)), basisKept: a.basis.filter((b) => !lost.has(b) && allEvidence.includes(b)),
    }));
    hits.push({
      caseId, caseName: name,
      sources: matched.map((s) => ({ id: s.id, url: s.url, publisher: s.publisher, allowedByRules: !!sourcePolicyIgnoringLedger(s.url, entityUrl) })),
      facts: facts.map((f) => ({ id: f.id, text: f.text })),
      metrics: metrics.map((m) => ({ id: m.id, label: `${m.label ?? m.measure} ${m.period} ${m.amount}${m.currency ?? m.unit ?? ''}` })),
      analysis,
      screen: screenRefs(caseId, new Set([...lost]), new Set(analysis.map((a) => a.id))),
    });
  }
  return hits;
}
