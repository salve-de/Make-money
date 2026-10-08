/** Shared release gate. Missing optional fields are not a reason to invent a value. */
import { createHash } from 'node:crypto';
import { ReaderCaseSchema, type ReaderCase } from '../../src/shared/reader-case';
import { applyVerdicts } from '../../src/lib/company-access/reader-verdicts';
import { checkCase, citesRestrictedSource, reflectAnalysis, type StoredAnalysis } from './analysis-lib';
import { THIN_PREFIX, displayMinimumProblems } from '../../src/shared/display-contract';
import { hasText, MIN_TEXT, metricLine, quoteInText, type SourceCacheRecord, type VerdictsFile } from './verify-lib';
import { formulaSkeleton, newFactTokens } from './paraphrase-check';

export const PUBLICATION_AUDITS_FILE = 'data/publication-audits.json';
export interface PublicationSource {
  sourceId: string;
  url: string;
  publisher: string;
  text: string;
  snapshot: (Omit<SourceCacheRecord, 'text'> & { text?: string; textHash?: string; textLength?: number }) | null;
  policy: unknown | null;
  /** 'attested': 手元に本文が無く、証明書（publication-evidence.ts）の記録で判定する。省略は手元の本文を読んだ（完全な証拠） */
  evidence?: 'attested';
  /** attested の時、本文に実在すると確かめた引用の鍵 */
  attestedQuotes?: string[];
}
export interface PublicationMedia { assets: unknown[]; displayableIds: string[]; problems: string[]; /** 手元に台帳が無く、証明書で判定した */ evidence?: 'attested' }
export interface PublicationInput {
  identity: { id: string; name: string; url?: string | null; publishability?: string };
  reader: ReaderCase;
  verdicts: VerdictsFile[string] | undefined;
  sources: PublicationSource[];
  media: PublicationMedia;
  entityEligible: boolean;
  /**
   * 判定に要る手元の証拠で、手元にも証明書にも無いもの。1つでもあれば「判定できない」（不合格ではない）。
   * 取り下げの根拠にしてはならない。prepare-catalog-release が止めて、足りない物を出す
   */
  missingEvidence?: string[];
}
/** 引用が、この指紋の本文にあると確かめた、という鍵。主張・引用・本文のどれが変わっても合わなくなる */
export const quoteKey = (claimId: string, quote: string, textHash: string): string => contentHash({ claimId, quote, textHash });
/** 監査した入力・結果のファイルの身元（中身の指紋）。どちらかが書き換わったら、その監査で通した項目は無効 */
export interface AuditFileRef { inputFile: string; outputFile: string; inputFileHash: string; outputFileHash: string }
/**
 * 項目ごとの監査記録（version 2）。事例丸ごとの指紋ではなく、項目（事実・数字・推論）ごとに「監査を通った中身の指紋」を持つ。
 * - caseHash: 事例の身元（ID・名前）。変われば事例ごと監査し直し（外す）。
 * - items: 'fact:<id>' / 'metric:<id>' / 'analysis:<id>' → 監査を通った中身の指紋と、通した監査の入力ファイル。
 *   中身が変わった項目だけが「未監査」になり、画面ではその項目だけを隠す（事例は外さない）。
 * - baseAnalysisHash: 全体監査に出した推論一式の指紋。取り込み版の事例で、審査で直した推論（reader-analysis.json）を採用してよいかの判定に使う。
 * - audits: この記録に効いている監査ファイル。readPublicationAudits がファイルの指紋を確かめ、合わない監査で通した項目は捨てる。
 */
export interface PublicationAudit {
  version: 2;
  caseHash: string;
  baseAnalysisHash?: string;
  /** body: 監査を通った推論の文と式（言い回しだけの直しを機械で照合するため。推論の項目だけ） */
  items: Record<string, { hash: string; by: string; body?: { text: string; formula?: string } }>;
  audits: AuditFileRef[];
  /** 最後に畳み込んだ監査の入力ファイル。これより新しい監査だけを次に畳み込む（同じ監査を二度当てない） */
  lastAudit?: string;
}
/** 旧形式（事例丸ごとの指紋）。data/publication-audits.json に残っている間は、読み込み時に項目ごとの形へ移す */
export interface LegacyPublicationAudit extends AuditFileRef {
  version: 1;
  inputHash: string;
  approvedHash: string;
}
export type PublicationAudits = Record<string, PublicationAudit>;
export function contentHash(value: unknown): string {
  const stable = (v: unknown): unknown => Array.isArray(v) ? v.map(stable) : v && typeof v === 'object'
    ? Object.fromEntries(Object.entries(v).filter(([, x]) => x !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([k, x]) => [k, stable(x)])) : v;
  return createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
}
/** Audit files contain bounded excerpts and full-body hashes, not duplicated full cache bodies. */
export function auditSnapshot(input: PublicationInput): PublicationInput {
  return { ...input, sources: input.sources.map((source) => {
    if (!source.snapshot) return source;
    const { text, textHash, ...metadata } = source.snapshot;
    return { ...source, snapshot: { ...metadata, textHash: typeof text === 'string' ? contentHash(text) : textHash } };
  }) };
}
export const publicationHash = (input: PublicationInput): string => contentHash(auditSnapshot(input));

/** 事例の身元の指紋。ここが変われば事例ごと監査し直す */
export const publicationCaseHash = (input: Pick<PublicationInput, 'identity'>): string => contentHash({ id: input.identity.id, name: input.identity.name });
const bodyHash = (source: PublicationSource | undefined): string | null => {
  if (!source?.snapshot) return null;
  return typeof source.snapshot.text === 'string' ? contentHash(source.snapshot.text) : source.snapshot.textHash ?? null;
};
/** 推論1件の指紋。文・式・根拠の並びと、根拠にした事実・数字の指紋（＝その出典の本文）を入れる。根拠が変われば推論も監査し直す */
export function analysisItemHash(a: Pick<ReaderCase['analysis'][number], 'item' | 'text' | 'basis' | 'formula' | 'presentation'>, hashes: Record<string, string>): string {
  return contentHash({ item: a.item, text: a.text, formula: a.formula, basis: a.basis, presentation: a.presentation,
    evidence: a.basis.map((b) => hashes[`fact:${b}`] ?? hashes[`metric:${b}`] ?? null) });
}
/**
 * 項目ごとの指紋（'fact:<id>' / 'metric:<id>' / 'analysis:<id>'）。事実・数字は、中身・照合結果（取得日を除く）・出典（表示する出典の情報と本文）を入れる。
 * 出典を取り直しただけ（取得日時だけが変わった）では変わらない。本文が変われば、その出典を根拠にする項目だけが変わる。
 */
export function publicationItemHashes(input: Pick<PublicationInput, 'reader' | 'sources' | 'verdicts'>): Record<string, string> {
  const sourceHash = new Map(input.reader.sources.map((s) => [s.id,
    contentHash({ source: s, body: bodyHash(input.sources.find((x) => x.sourceId === s.id && x.url === s.url)) })]));
  const claim = (c: { id: string; sourceId: string }) => {
    const v = input.verdicts?.[c.id];
    const verdict = v ? { verdict: v.verdict, quote: v.quote, sourceUrl: v.sourceUrl, claimText: v.claimText, fix: v.fix } : null;
    return contentHash({ claim: c, verdict, source: sourceHash.get(c.sourceId) ?? null });
  };
  const hashes: Record<string, string> = {};
  for (const f of input.reader.facts) hashes[`fact:${f.id}`] = claim(f);
  for (const m of input.reader.metrics) hashes[`metric:${m.id}`] = claim(m);
  for (const a of input.reader.analysis) hashes[`analysis:${a.id}`] = analysisItemHash(a, hashes);
  return hashes;
}
/** 未監査の項目（と、それを根拠にする推論）を外した表示版。画面に出すのはこちら */
export function withoutUnaudited(reader: ReaderCase, keys: readonly string[]): ReaderCase {
  if (!keys.length) return reader;
  const drop = new Set(keys);
  const facts = reader.facts.filter((f) => !drop.has(`fact:${f.id}`));
  const metrics = reader.metrics.filter((m) => !drop.has(`metric:${m.id}`));
  const live = new Set([...facts, ...metrics].map((c) => c.id));
  const analysis = reader.analysis.filter((a) => !drop.has(`analysis:${a.id}`) && a.basis.every((b) => live.has(b)));
  const next = { ...reader, facts, metrics, analysis } as ReaderCase;
  if (next.summaryFactId && !live.has(next.summaryFactId)) delete (next as { summaryFactId?: string }).summaryFactId;
  return next;
}
/** 未監査の理由の頭。evaluateForRelease はこれを「その項目だけ隠す」に回す */
export const UNAUDITED_PREFIX = '未監査:';
export const CASE_UNAUDITED = '現在の入力に対する監査が無い';
/**
 * 監査記録と今の入力を突き合わせる。事例の身元が違えば事例ごと未監査、そうでなければ中身が変わった項目の鍵を返す。
 * 推論のうち、文と式だけが変わり（根拠・根拠の事実は同じ）、直した文に監査済みの文にも事実にも無い数字・年月日・固有名が無いものは、
 * 言い回しだけの直しとして監査済みのまま扱う（paraphrased。別のAIの監査に回さない）。
 */
export function unauditedItems(input: PublicationInput, audit: PublicationAudit | undefined): { caseLevel: boolean; keys: string[]; paraphrased: string[] } {
  if (audit?.version !== 2 || audit.caseHash !== publicationCaseHash(input)) return { caseLevel: true, keys: [], paraphrased: [] };
  const now = publicationItemHashes(input);
  const facts = [...input.reader.facts.map((f) => f.text), ...input.reader.metrics.map((m) => metricLine(m))];
  const keys: string[] = [];
  const paraphrased: string[] = [];
  for (const key of Object.keys(now)) {
    const approved = audit.items[key];
    if (approved?.hash === now[key]) continue;
    const a = key.startsWith('analysis:') ? input.reader.analysis.find((x) => `analysis:${x.id}` === key) : undefined;
    const body = approved?.body;
    if (a && body && analysisItemHash({ ...a, text: body.text, formula: body.formula }, now) === approved.hash &&
        formulaSkeleton(a.formula) === formulaSkeleton(body.formula) &&
        !newFactTokens([a.text, a.formula ?? ''].join('\n'), [body.text, body.formula ?? ''].join('\n'), facts).length) {
      paraphrased.push(key);
      continue;
    }
    keys.push(key);
  }
  return { caseLevel: false, keys, paraphrased };
}

/** Null/omitted analysis means unknown; an active but invalid item is rejected, never silently approved. */
export function preparePublicationReader(reader: ReaderCase, verdicts: VerdictsFile[string] | undefined, analysis: StoredAnalysis[] | null | undefined) {
  if (analysis != null && !Array.isArray(analysis)) return { reader: { ...reader, analysis: [] }, problems: ['推論の形式が不正'] };
  const applied = applyVerdicts(reader, verdicts);
  if (!applied) return { reader: { ...reader, facts: [], metrics: [], analysis: [] }, problems: ['未照合'] };
  const checked = checkCase('publication', analysis ?? [], applied.reader);
  return { reader: reflectAnalysis(applied.reader, checked.kept), problems: checked.dropped.map((x) => `推論:${x.item}:${x.reason}`) };
}

/** 画像の権利・実体が未充足の理由。文の反映（case-reflect）は無視し、公開の目録作り（prepare-catalog-release）だけが効かせる */
export const MEDIA_UNMET = '画像の権利または実体が未充足';

export function evaluatePublication(input: PublicationInput, audit: PublicationAudit | undefined, problems: string[] = []) {
  const reasons = [...problems];
  const { reader, identity } = input;
  reasons.push(...checkCase(identity.id, reader.analysis, reader).dropped.map((d) => `推論:${d.item}:${d.reason}`));
  if (!identity.id?.trim() || !identity.name?.trim()) reasons.push('事業identityが無い');
  if (!input.entityEligible) reasons.push('事業の公開区分または根拠が無効');
  if (!ReaderCaseSchema.safeParse(reader).success) reasons.push('表示形式が不正');
  if (!reader.facts.some((f) => f.kind === 'DESCRIPTION') && !reader.analysis.some((a) => a.item === 'BUSINESS_MODEL')) reasons.push('根拠付きの事業説明が無い');
  if (!reader.facts.length && !reader.metrics.length) reasons.push('照合済みの事実が無い');
  if (!reader.sources.length || citesRestrictedSource(reader)) reasons.push('出典の利用条件が未充足');
  for (const source of reader.sources) {
    const current = input.sources.find((s) => s.sourceId === source.id && s.url === source.url);
    if (!current?.policy || (typeof current.policy === 'object' && 'decision' in current.policy && current.policy.decision !== 'allowed')) reasons.push(`利用条件:${source.id}`);
    if (current?.evidence === 'attested') {
      // 手元に本文が無い。証明書の記録（取得結果・本文の長さ・照合済みの引用）で、本文ありの場合と同じ基準を当てる
      const snap = current.snapshot;
      if (!snap || snap.url !== source.url || snap.status !== 200 || !!snap.error || !snap.textHash || (snap.textLength ?? 0) < MIN_TEXT) { reasons.push(`出典本文:${source.id}`); continue; }
      for (const claim of [...reader.facts, ...reader.metrics].filter((c) => c.sourceId === source.id)) {
        const verdict = input.verdicts?.[claim.id];
        if (!verdict || !['SUPPORTED', 'PARTIAL'].includes(verdict.verdict) || verdict.sourceUrl !== source.url || !current.attestedQuotes?.includes(quoteKey(claim.id, verdict.quote, snap.textHash))) reasons.push(`根拠の不一致:${claim.id}`);
      }
      continue;
    }
    if (!current?.snapshot || current.snapshot.url !== source.url || current.snapshot.status !== 200 || typeof current.snapshot.text !== 'string' || !hasText(current.snapshot as SourceCacheRecord) || !!current.snapshot.error) {
      reasons.push(`出典本文:${source.id}`); continue;
    }
    for (const claim of [...reader.facts, ...reader.metrics].filter((c) => c.sourceId === source.id)) {
      const verdict = input.verdicts?.[claim.id];
      if (!verdict || !['SUPPORTED', 'PARTIAL'].includes(verdict.verdict) || verdict.sourceUrl !== source.url || !quoteInText(verdict.quote, current.snapshot.text)) reasons.push(`根拠の不一致:${claim.id}`);
    }
  }
  const claimIds = [...reader.facts, ...reader.metrics].map((c) => c.id);
  if (new Set(claimIds).size !== claimIds.length || new Set(reader.sources.map((s) => s.id)).size !== reader.sources.length) reasons.push('根拠IDが重複');
  for (const metric of reader.metrics) if (metric.origin === 'ESTIMATED' && !metric.basis?.trim()) reasons.push(`推定の根拠:${metric.id}`);
  if (input.media.problems.length || !input.media.displayableIds.length) reasons.push(MEDIA_UNMET);
  const hash = publicationHash(input);
  const unaudited = unauditedItems(input, audit);
  if (unaudited.caseLevel) reasons.push(CASE_UNAUDITED);
  reasons.push(...unaudited.keys.map((k) => `${UNAUDITED_PREFIX}${k}`));
  return { publishable: reasons.length === 0, reasons, hash, reader, unaudited: unaudited.keys, paraphrased: unaudited.paraphrased };
}

/**
 * 選別（select-finished）と公開データ作り（prepare-catalog-release）が共通で使う関門。
 * 受領書・出典・権利・画像の確認（evaluatePublication）に、表示契約の下限（薄い事例は出さない）を足す。
 */
export function evaluateForRelease(input: PublicationInput, audit: PublicationAudit | undefined, problems: string[] = []) {
  const base = evaluatePublication(input, audit, problems);
  // 1項目の欠けで事例全体を止めない（オーナー指示 2026-10-06）。検査で落ちた推論の項目と事業説明の欠けは、その項目を隠すだけにする。
  // 監査の後に中身が変わった項目（未監査）も、その項目だけを隠す。事例ごと外すのは、身元・出典の権利・本文・画像など事例全体の問題だけ。
  // ただしリード（HEADLINE）が落ちた・隠れた時は表示契約の下限が「リードを書き直す」を出す
  const hideOnly = (r: string) => (r.startsWith('推論:') && !r.startsWith('推論:HEADLINE:')) || r === '根拠付きの事業説明が無い' || r.startsWith(UNAUDITED_PREFIX);
  const reasons = base.reasons.filter((r) => !hideOnly(r));
  const hidden = base.reasons.filter(hideOnly);
  const reader = withoutUnaudited(input.reader, base.unaudited);
  if (reader.facts.length <= 2 && reader.metrics.length === 0) reasons.push(`${THIN_PREFIX}:事実2件以下で数字なし`);
  // 下限は表示契約（src/shared/display-contract.ts）。推論の項目（手残り・大手の死角・教訓など）は必須にしない（#128 D01・D05・D06）
  reasons.push(...displayMinimumProblems(reader).filter((r) => !reasons.includes(r)));
  return { ...base, reasons, hidden, reader, publishable: reasons.length === 0 };
}

/** A release candidate list is mandatory. An absent/malformed file must never mean all records. */
export function parseFinishedManifest(text: string): Set<string> {
  const ids = text.split(/\r?\n/).map((s) => s.trim()).filter((s) => s && !s.startsWith('#'));
  if (ids.some((id) => !/^[A-Za-z0-9_-]+$/.test(id)) || new Set(ids).size !== ids.length) throw new Error('Invalid catalog-finished-ids manifest');
  return new Set(ids);
}
