/**
 * 公開の関門が使う手元の証拠（出典本文・画像台帳）の「証明書」。
 * 出典本文（data/source-cache）と画像台帳（data/media-staging）は大きく、権利上 git に入れない。そのため作業場所ごとに有る・無いが分かれ、
 * 無い場所では関門が「不合格」と誤判定して公開中の事例を取り下げ扱いにしていた。
 * そこで、判定に必要な最小の事実（本文の指紋・照合済みの引用・表示できる画像の識別子）だけを data/publication-evidence.json に記録して git に入れる。
 * - 手元に本文・台帳がある時は、必ずそれを正とする（証明書は使わない）。
 * - 無い時だけ証明書で判定する。証明書も無い時は「証拠不足」として、不合格とは別に扱う（取り下げにしない）。
 * 証明書は `pnpm evidence:attest` が、手元の本文・台帳から作る。
 */
import { existsSync, readFileSync } from 'node:fs';
import { z } from 'zod';
import { contentHash, quoteKey, type PublicationInput } from './publication-evaluation';
import { quoteInText, type SourceCacheRecord } from './verify-lib';

export const PUBLICATION_EVIDENCE_FILE = 'data/publication-evidence.json';

export interface SourceAttestation {
  status: number;
  fetchedAt: string;
  via: 'direct' | 'wayback';
  finalUrl?: string;
  contentType?: string;
  error?: string;
  /** 本文全体の指紋（項目ごとの監査記録の指紋と同じもの） */
  textHash: string;
  textLength: number;
  /** 本文に実在すると確かめた引用の鍵（quoteKey）。引用そのものは verdicts にあるので、ここには鍵だけ持つ */
  quotes: string[];
  /** 本文を読んで確かめた結果、引用が本文に無かったものの鍵（本物の不一致。証拠不足ではない） */
  quotesAbsent: string[];
}
export interface CaseAttestation {
  sources: Record<string, SourceAttestation>;
  media: { displayableIds: string[] };
}
export type EvidenceAttestations = Record<string, CaseAttestation>;

const hash64 = z.string().regex(/^[a-f0-9]{64}$/);
const SourceAttestationSchema = z.object({
  status: z.number().int(), fetchedAt: z.string(), via: z.enum(['direct', 'wayback']), finalUrl: z.string().optional(), contentType: z.string().optional(), error: z.string().optional(),
  textHash: hash64, textLength: z.number().int().min(0), quotes: z.array(hash64), quotesAbsent: z.array(hash64),
}).strict();
const CaseAttestationSchema = z.object({
  sources: z.record(z.string(), SourceAttestationSchema),
  media: z.object({ displayableIds: z.array(z.string()) }).strict(),
}).strict();
export const EvidenceEnvelopeSchema = z.object({ version: z.literal(1), note: z.string().optional(), cases: z.record(z.string(), CaseAttestationSchema) }).strict();

/**
 * 証明書を読む。ファイルが無ければ「証明書なし」。有るのに形式・版が合わない（マージ事故・生成器の変更）時は、信用せず止まる（fail closed）。
 */
export function readAttestations(path = PUBLICATION_EVIDENCE_FILE): EvidenceAttestations {
  if (!existsSync(path)) return {};
  let raw: unknown;
  try { raw = JSON.parse(readFileSync(path, 'utf8')); } catch (error) { throw new Error(`${path} を読めない（壊れている）。pnpm evidence:attest で作り直す: ${error instanceof Error ? error.message : String(error)}`); }
  const parsed = EvidenceEnvelopeSchema.safeParse(raw);
  if (!parsed.success) throw new Error(`${path} の形式が合わない（版または中身が不正）。信用しない。pnpm evidence:attest で作り直す: ${parsed.error.issues.slice(0, 3).map((i) => `${i.path.join('.')}: ${i.message}`).join(' / ')}`);
  return parsed.data.cases as EvidenceAttestations;
}

/** 手元の完全な証拠（本文・台帳）から証明書を作る。証拠が欠けていれば作れないので、足りない物を返す */
export function attestCase(input: PublicationInput): { attestation: CaseAttestation } | { missing: string[] } {
  if (input.missingEvidence?.length) return { missing: input.missingEvidence };
  const sources: Record<string, SourceAttestation> = {};
  const claims = [...input.reader.facts, ...input.reader.metrics];
  for (const source of input.sources) {
    const snap = source.snapshot as (Omit<SourceCacheRecord, 'text'> & { text?: string }) | null;
    if (!snap || typeof snap.text !== 'string') return { missing: [`出典本文:${source.sourceId}`] };
    const textHash = contentHash(snap.text);
    const quotes: string[] = [];
    const quotesAbsent: string[] = [];
    for (const claim of claims.filter((c) => c.sourceId === source.sourceId)) {
      const verdict = input.verdicts?.[claim.id];
      if (!verdict || verdict.sourceUrl !== source.url) continue;
      (quoteInText(verdict.quote, snap.text) ? quotes : quotesAbsent).push(quoteKey(claim.id, verdict.quote, textHash));
    }
    sources[source.url] = {
      status: snap.status, fetchedAt: snap.fetchedAt, via: snap.via, textHash, textLength: snap.text.length, quotes: quotes.sort(), quotesAbsent: quotesAbsent.sort(),
      ...(snap.finalUrl ? { finalUrl: snap.finalUrl } : {}), ...(snap.contentType ? { contentType: snap.contentType } : {}), ...(snap.error ? { error: snap.error } : {}),
    };
  }
  if (input.media.problems.length) return { missing: [`画像台帳に問題があり証明できない:${input.media.problems.join(' / ').slice(0, 120)}`] };
  return { attestation: { sources, media: { displayableIds: [...input.media.displayableIds].sort() } } };
}

/** 証明書から、手元に本文が無い出典の「本文なしの取得記録」を作る */
export function attestedSnapshot(url: string, a: SourceAttestation): NonNullable<PublicationInput['sources'][number]['snapshot']> {
  return { url, status: a.status, fetchedAt: a.fetchedAt, via: a.via, textHash: a.textHash, textLength: a.textLength,
    ...(a.finalUrl ? { finalUrl: a.finalUrl } : {}), ...(a.contentType ? { contentType: a.contentType } : {}), ...(a.error ? { error: a.error } : {}) };
}

