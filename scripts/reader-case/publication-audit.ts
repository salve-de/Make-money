/**
 * 監査の結果（data/audit/out-*.json）を、項目ごとの監査記録（PublicationAudit version 2）へ畳み込む。
 * 監査の入力は2つの形を受け付ける:
 * - 全体監査（build-audit-input.ts 既定）と差分監査（--diff）: 事例ごとに caseHash・itemHashes・review（今回確かめる項目の鍵）・reader を持つ。
 * - 旧形式（snapshot と publicationHash だけを持つ全体監査）: snapshot から同じ形を作る。旧い記録からの移行もこの経路を通る。
 * 監査役が通した項目（指摘なし・LOW・FIX で直した文）だけを「監査済み」にする。BLOCK・壊れた結果・事例単位の BLOCK は、今回確かめた項目の合格を取り消す。
 */
import { z } from 'zod';
import { applyAudit, auditEvidence, type StoredAnalysis } from './analysis-lib';
import {
  analysisItemHash, auditSnapshot, contentHash, publicationCaseHash, publicationHash, publicationItemHashes,
  type AuditFileRef, type LegacyPublicationAudit, type PublicationAudit, type PublicationInput,
} from './publication-evaluation';
import type { ReaderCase } from '../../src/shared/reader-case';

const findingsSchema = z.array(z.object({
  analysisId: z.string().min(1), kind: z.string().min(1), severity: z.enum(['BLOCK', 'FIX', 'LOW']),
  why: z.string().optional(), fix: z.string().optional(), fixFormula: z.string().optional(),
}));

/** 監査に出した1事例ぶん（形をそろえたもの） */
export interface AuditedCase {
  scope: 'full' | 'diff';
  caseHash: string;
  /** 監査に出した時点の全項目の指紋（文脈の事実・数字も含む） */
  hashes: Record<string, string>;
  /** 今回確かめる項目の鍵 */
  review: string[];
  /** 今回確かめる推論（全体監査なら全部） */
  analysis: StoredAnalysis[];
  /** 監査役の直し（FIX）を機械検査するための事実・数字 */
  reader: ReaderCase;
}

interface CaseEntry { entityId: string; snapshot?: PublicationInput; publicationHash?: string; scope?: string; caseHash?: string; itemHashes?: Record<string, string>; review?: string[]; reader?: ReaderCase }

/** 監査の入力ファイルから1事例ぶんを取り出す。形が合わない・同じ事例が2件ある時は null */
export function auditedCase(inputDocument: unknown, id: string): AuditedCase | null {
  const cases = (inputDocument as { cases?: CaseEntry[] })?.cases;
  if (!Array.isArray(cases)) return null;
  const matching = cases.filter((c) => c?.entityId === id);
  if (matching.length !== 1) return null;
  const c = matching[0];
  if (c.caseHash && c.itemHashes && Array.isArray(c.review) && c.reader && (c.scope === 'full' || c.scope === 'diff')) {
    const reviewed = new Set(c.review);
    return { scope: c.scope, caseHash: c.caseHash, hashes: c.itemHashes, review: c.review,
      analysis: c.reader.analysis.filter((a) => reviewed.has(`analysis:${a.id}`)) as StoredAnalysis[], reader: c.reader };
  }
  // 旧形式: 入力の指紋が snapshot と一致する時だけ（書き換えられた入力を通さない）
  if (!c.snapshot || !c.publicationHash || c.publicationHash !== publicationHash(c.snapshot)) return null;
  const hashes = publicationItemHashes(c.snapshot);
  return { scope: 'full', caseHash: publicationCaseHash(c.snapshot), hashes, review: Object.keys(hashes),
    analysis: c.snapshot.reader.analysis as StoredAnalysis[], reader: c.snapshot.reader };
}

export interface AuditDocumentRef { inputFile: string; outputFile: string; input: unknown; output: unknown }
export interface AppliedAudit {
  receipt: PublicationAudit;
  /** 監査役が通した推論（直しを当てたもの）。BLOCK で落ちたものは入らない。結果が無効なら null */
  analysis: StoredAnalysis[] | null;
  /** 監査に出した推論（直す前） */
  reviewed: StoredAnalysis[];
  scope: AuditedCase['scope'];
}

const fileRef = (doc: AuditDocumentRef): AuditFileRef => ({ inputFile: doc.inputFile, outputFile: doc.outputFile,
  inputFileHash: contentHash(doc.input), outputFileHash: contentHash(doc.output) });

/**
 * 1つの監査（入力と結果の組）を、その事例の記録へ畳み込む。入力にその事例が無い・形が合わない時は null（記録は変えない）。
 * 結果が壊れている・事例単位の BLOCK がある時は、今回確かめた項目のうち同じ中身で合格していたものを取り消す（新しい不合格が古い合格に勝つ）。
 */
export function applyAuditDocument(prev: PublicationAudit | undefined, id: string, doc: AuditDocumentRef): AppliedAudit | null {
  const c = auditedCase(doc.input, id);
  if (!c) return null;
  const sameCase = prev?.caseHash === c.caseHash;
  const items = sameCase ? { ...prev!.items } : {};
  const base: PublicationAudit = { version: 2, caseHash: c.caseHash, items, audits: sameCase ? [...prev!.audits] : [], lastAudit: doc.inputFile,
    ...(sameCase && prev!.baseAnalysisHash ? { baseAnalysisHash: prev!.baseAnalysisHash } : {}) };
  const reviews = (doc.output as { cases?: { entityId: string; items?: unknown }[] } | null)?.cases;
  const review = Array.isArray(reviews) ? reviews.filter((r) => r?.entityId === id) : [];
  const findings = review.length === 1 ? findingsSchema.safeParse(review[0].items) : null;
  const reviewedIds = new Set(c.analysis.map((a) => a.id));
  const valid = !!findings?.success && findings.data.every((f) => (f.analysisId === '__case__' ? f.severity === 'LOW' : reviewedIds.has(f.analysisId)));
  if (!valid || !findings?.success) {
    for (const key of c.review) if (items[key]?.hash === c.hashes[key]) delete items[key];
    return { receipt: tidy(base), analysis: null, reviewed: c.analysis, scope: c.scope };
  }
  const applied = applyAudit(id, c.analysis, findings.data.filter((f) => f.analysisId !== '__case__'), c.reader);
  if (c.scope === 'full') for (const key of Object.keys(items)) if (!c.review.includes(key)) delete items[key];
  for (const key of c.review) {
    if (!(key in c.hashes)) continue;
    if (!key.startsWith('analysis:')) { items[key] = { hash: c.hashes[key], by: doc.inputFile }; continue; }
    const kept = applied.kept.find((a) => `analysis:${a.id}` === key);
    if (kept) items[key] = { hash: analysisItemHash(kept, c.hashes), by: doc.inputFile };
    else delete items[key];
  }
  base.audits = [...base.audits.filter((a) => a.inputFile !== doc.inputFile), fileRef(doc)];
  if (c.scope === 'full') base.baseAnalysisHash = contentHash(c.analysis);
  return { receipt: tidy(base), analysis: applied.kept, reviewed: c.analysis, scope: c.scope };
}

/** どの項目からも使われていない監査ファイルの記録を落とす */
function tidy(receipt: PublicationAudit): PublicationAudit {
  const used = new Set(Object.values(receipt.items).map((i) => i.by));
  return { ...receipt, audits: receipt.audits.filter((a) => used.has(a.inputFile)) };
}

/** 旧形式の記録（事例丸ごとの指紋）を、それが指す監査から項目ごとの形へ移す。承認した版の指紋が再現できない時は null */
export function migrateLegacyAudit(id: string, legacy: LegacyPublicationAudit, doc: AuditDocumentRef): PublicationAudit | null {
  const c = auditedCase(doc.input, id);
  const cases = (doc.input as { cases?: CaseEntry[] }).cases ?? [];
  const snapshot = cases.find((x) => x.entityId === id)?.snapshot;
  if (!c || !snapshot || publicationHash(snapshot) !== legacy.inputHash) return null;
  const applied = applyAuditDocument(undefined, id, doc);
  if (!applied?.analysis) return null;
  if (publicationHash({ ...snapshot, reader: { ...snapshot.reader, analysis: applied.analysis } }) !== legacy.approvedHash) return null;
  return applied.receipt;
}

/**
 * 監査に出す1事例ぶん（全体監査・差分監査の共通の形）。監査役が読む材料（事実・数字・出典の本文）は全体を渡し、確かめる推論は review の分だけにする。
 * changedClaims は前の監査から中身が変わった事実・数字（確かめる対象）。
 */
export function auditCaseEntry(input: PublicationInput, scope: AuditedCase['scope'], review: string[]) {
  const auditable = auditSnapshot(input);
  const keys = new Set(review);
  const analysis = input.reader.analysis.filter((a) => keys.has(`analysis:${a.id}`));
  const changedClaims = review.filter((k) => !k.startsWith('analysis:')).map((k) => k.replace(/^(fact|metric):/, ''));
  return {
    entityId: input.identity.id, scope,
    ...(scope === 'diff' ? { auditScope: '差分監査: analysis にあるのは前の監査の後に変わった推論だけ。changedClaims は前の監査の後に変わった事実・数字。これらだけを確かめる（他は監査済み）' } : {}),
    ...auditEvidence(input.reader, auditable.sources), analysis, changedClaims,
    identity: auditable.identity, media: auditable.media,
    caseHash: publicationCaseHash(input), itemHashes: publicationItemHashes(input), review,
    reader: { ...input.reader, analysis },
  };
}
