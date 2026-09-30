/**
 * 再監査候補の形式統一（normalize-candidate v1）— 2026-09-29
 * 担当者ごとに形が違う候補JSON（reaudit ブロックの有無、rightsUseAssessment / rightsAssessment 等）を
 * 単一の `reaudit` 契約へ揃え、旧表示を reaudit.legacyDisplaySnapshot に保持する。
 *
 * 使い方:
 *   node --import tsx scripts/reaudit/normalize-candidate.ts --in <candidate.json> --id <entityId> \
 *     --original <original-catalog.json or entities-index.json> --out data/incoming/reaudit-accepted-<slug>-<date>.json
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { checkCandidateReaderParts } from './candidate-reader-checks';
import { parseFinancialEntity } from '../../src/shared/financial-entity-schema';

type AnyRecord = Record<string, unknown>;
const AUDIT_DATE = '2026-09-29';
const args = process.argv.slice(2);
const opt = (name: string): string | undefined => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined; };
const inPath = opt('in'); const id = opt('id'); const originalPath = opt('original'); const outPath = opt('out');
if (!inPath || !id || !originalPath || !outPath) { console.error('usage: --in <file> --id <entityId> --original <file> --out <file>'); process.exit(64); }

const isHttp = (v: unknown): v is string => typeof v === 'string' && /^https?:\/\//i.test(v);

const candidates = JSON.parse(readFileSync(resolve(inPath), 'utf8')) as AnyRecord[];
const cand = candidates.find((c) => c.id === id);
if (!cand) { console.error(`candidate ${id} not found in ${inPath}`); process.exit(1); }
const originalRaw = JSON.parse(readFileSync(resolve(originalPath), 'utf8')) as AnyRecord[] | AnyRecord;
const originalList = Array.isArray(originalRaw) ? originalRaw : Object.values(originalRaw);
const original = originalList.find((o) => (o as AnyRecord).id === id) as AnyRecord | undefined;

const rua = (cand.rightsUseAssessment as AnyRecord | undefined) ?? (cand.rightsAssessment as AnyRecord | undefined) ?? {};
const cards = Array.isArray(cand.evidenceCards) ? (cand.evidenceCards as AnyRecord[]) : [];
const stream = Array.isArray(cand.observationsStream) ? (cand.observationsStream as AnyRecord[]) : [];
const urlSet = new Set<string>();
for (const u of (Array.isArray(rua.sourceUrls) ? rua.sourceUrls : []) as unknown[]) if (isHttp(u)) urlSet.add(u);
for (const c of cards) if (isHttp(c.url)) urlSet.add(c.url);
for (const o of stream) if (isHttp(o.sourceUrl)) urlSet.add(o.sourceUrl);
const pnl = (cand.pnl as AnyRecord) ?? {};
if (isHttp(pnl.sourceDoc)) urlSet.add(pnl.sourceDoc);

const tierOf = (u: string): string => {
  const h = (() => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return ''; } })();
  const official = (() => { try { return new URL(String(cand.officialUrl || cand.url || '')).hostname.replace(/^www\./, ''); } catch { return ''; } })();
  if (official && (h === official || h.endsWith(`.${official}`))) return 'TIER1_OFFICIAL';
  if (/(sec\.gov|edinet|e-stat\.go\.jp|bls\.gov)/.test(h)) return 'TIER1_PUBLIC_RECORD';
  if (/(apps\.apple\.com|play\.google\.com|github\.com|prnewswire|globenewswire|businesswire|prtimes\.jp)/.test(h)) return 'TIER1_PLATFORM';
  return 'TIER2_FACTS_ONLY';
};

const sources = [...urlSet].map((u) => ({ url: u, publisher: (() => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return 'unknown'; } })(),
  checkedAt: typeof rua.assessedAt === 'string' ? rua.assessedAt : AUDIT_DATE, rightsTier: tierOf(u), claimStatus: 'SEE_EVIDENCE_CARDS' }));

const unknownNotes = Array.isArray(cand.unknownsNotes)
  ? (cand.unknownsNotes as unknown[]).map((s) => String(s).trim()).filter(Boolean)
  : typeof cand.unknownsNotes === 'string' ? cand.unknownsNotes.split(/(?<=。)/).map((s) => s.trim()).filter(Boolean) : [];
const existingReaudit = (cand.reaudit as AnyRecord | undefined) ?? {};
const opnl = (original?.pnl as AnyRecord | undefined) ?? {};

const legacy = existingReaudit.legacyDisplaySnapshot ?? (original ? {
  status: 'SUPERSEDED_NOT_PRIMARY_VALIDATED', supersededAt: AUDIT_DATE, method: 'MANUAL_REAUDIT',
  priorPnl: opnl, priorTagline: original.tagline, priorTags: original.tags, priorVerifiedBadge: original.verifiedBadge,
  priorGrowthRateYoY: original.growthRateYoY, priorPublishability: original.publishability,
  priorEvidenceCards: (Array.isArray(original.evidenceCards) ? (original.evidenceCards as AnyRecord[]) : []).map((c) => ({ id: c.id, type: c.type, title: c.title })),
} : { status: 'ORIGINAL_NOT_FOUND', supersededAt: AUDIT_DATE });

const normalized: AnyRecord = {
  ...cand,
  publishability: 'PARTIAL',
  reaudit: {
    ...existingReaudit,
    status: 'PARTIAL', auditDate: AUDIT_DATE, timezone: 'Asia/Tokyo', method: 'MANUAL_REAUDIT',
    auditOwner: typeof rua.reviewer === 'string' ? rua.reviewer : (existingReaudit.auditOwner ?? 'lead'),
    sources, unknown: unknownNotes,
    rights: { status: typeof rua.factualReview === 'string' ? rua.factualReview : 'NOT_REVIEWED', permission: 'FACTS_ONLY_WITH_ATTRIBUTION',
      basis: typeof rua.basis === 'string' ? rua.basis : '事実のみ表示。原文・画像は転載しない。', intendedUse: rua.intendedUse ?? null, conditions: rua.conditions ?? [] },
    legacyDisplaySnapshot: legacy,
  },
};
delete normalized.rightsAssessment; // 統一: reaudit.rights に集約（rightsUseAssessment は原本ノートとして残す）
const partErrors = checkCandidateReaderParts(normalized);
if (partErrors.length) { console.error(`candidate ${id} rejected:\n  - ${partErrors.join('\n  - ')}`); process.exit(1); }
parseFinancialEntity(normalized);
writeFileSync(resolve(outPath), JSON.stringify([normalized], null, 2), 'utf8');
console.log(`✓ normalized ${id} → ${outPath} (sources: ${sources.length}, unknown: ${unknownNotes.length}, legacy: ${String((legacy as AnyRecord).status)})`);
