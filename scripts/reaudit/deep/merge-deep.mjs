/** Additive local deep-wave candidate builder. Never ingests, fetches, or writes the catalog. */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, realpathSync } from 'node:fs';
import { resolve, dirname, basename } from 'node:path';
import { pathToFileURL } from 'node:url';

export const TOPICS = ['initialTraction', 'affiliate', 'pricingHistory', 'hiring', 'reviews', 'platformDependency', 'dataPortability', 'prepayment', 'pivots', 'incumbentBarrier', 'timeline', 'eraContext', 'viability', 'fatalCause'];
const LABELS = ['初期集客', '紹介制度', '料金の変遷', '求人の記載', '公開レビュー', 'プラットフォーム依存', 'データ移行', '年払い・前払い', '転換・過去の失敗', '大手の参入制約', '年表', '時代背景', '現在の再現性', '破綻の原因'];
const TIERS = ['TIER1_OFFICIAL', 'TIER1_PUBLIC_RECORD', 'TIER1_PLATFORM', 'TIER2_FACTS_ONLY'];
const VIABILITY = ['ACTIVE_PLAYBOOK', 'RISING_WAVE', 'MATURED_MOAT', 'HISTORICAL_WINDOW', 'EVOLVING_BARRIER'];
const VIABILITY_LABELS = ['現在も有効', '急上昇中', '先行者の堀が成立', '過去の時代に限定', '要求水準が変化'];
const period = v => typeof v === 'string' && /^\d{4}(?:-(?:0[1-9]|1[0-2])(?:-(?:0[1-9]|[12]\d|3[01]))?)?$/.test(v) && (v.length !== 10 || date(v));
const fail = (message) => { throw new Error(`deep-wave: ${message}`); };
const obj = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const nonempty = (v) => typeof v === 'string' && v.trim().length > 0;
export const canonical = (value) => JSON.stringify(value, (_, v) => obj(v) ? Object.fromEntries(Object.keys(v).sort().map(k => [k, v[k]])) : v);
const hash = (v) => createHash('sha256').update(canonical(v)).digest('hex').slice(0, 24);
const date = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z)?$/.test(v) && Number.isFinite(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v.slice(0, 10);
const http = (v) => { try { const u = new URL(v); return /^https?:$/.test(u.protocol) && !u.username && !u.password && !!u.hostname; } catch { return false; } };
const urlKey = (v) => { const u = new URL(v); u.hash = ''; return u.href.replace(/\/$/, ''); };
const identity = (f) => hash([f.topic, urlKey(f.sourceUrl), f.text.trim(), f.statedAt ?? null]);
const label = (topic) => LABELS[TOPICS.indexOf(topic)];
const unknown = (v) => v === undefined || v === null || v === '' || v === 'UNKNOWN' || (typeof v === 'string' && /^未確認/.test(v));
function safeText(value) {
  if (typeof value === 'string') {
    let decoded = value; try { decoded = decodeURIComponent(value); } catch { /* retain malformed input for checks */ }
    if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(decoded)) fail('email address forbidden');
    if (/(?:作れ|しろ|せよ|してください|しましょう|すべき|するべき|あなたも|今夜使える|DM爆撃|how to|you should|follow these steps|ignore (?:all |previous )?instructions|system prompt)/i.test(value)) fail('instructional text forbidden');
    if (/(?:電話番号|自宅住所|生年月日|passport|social security|credit card number)/i.test(value)) fail('personal data forbidden');
    for (const match of value.matchAll(/["“「『‘']([^"”」』’']+)["”」』’']/gu)) if (match[1].trim().split(/\s+/u).length >= 15 || match[1].length > 140) fail('long quotation forbidden');
  } else if (Array.isArray(value)) value.forEach(safeText);
  else if (obj(value)) for (const [key, item] of Object.entries(value)) {
    if (['__proto__', 'prototype', 'constructor', 'quote', 'quotation', 'verbatim', 'rawHtml', 'email', 'phone', 'address', 'author'].includes(key)) fail(`unsafe field ${key}`);
    safeText(item);
  }
}
function fields(value, allowed, context) { if (!obj(value)) fail(`${context} must be object`); for (const key of Object.keys(value)) if (!allowed.includes(key)) fail(`${context}: unsupported field ${key}`); }
export function validateDeepRecord(record) {
  fields(record, ['id', 'startedAt', 'completedAt', 'findings', 'coverage', 'familyIndex', 'index', 'family', 'activeSeconds'], 'record');
  safeText(record);
  if (!nonempty(record.id) || !date(record.startedAt) || !date(record.completedAt) || Date.parse(record.completedAt) < Date.parse(record.startedAt)) fail('invalid id or research timestamps');
  if (record.activeSeconds !== undefined && (!Number.isFinite(record.activeSeconds) || record.activeSeconds < 0)) fail('invalid activeSeconds');
  if (!Array.isArray(record.findings) || !obj(record.coverage)) fail('findings array / coverage object required');
  for (const f of record.findings) {
    fields(f, ['topic', 'text', 'sourceUrl', 'observedAt', 'statedAt', 'originType', 'rightsTier', 'toolNames', 'viabilityStatus', 'occurredAt', 'eventType', 'formula', 'sampleCount'], 'finding');
    if (!TOPICS.includes(f.topic) || !nonempty(f.text) || !http(f.sourceUrl) || !date(f.observedAt)) fail('finding missing topic/text/sourceUrl/observedAt');
    if (!['observed', 'reported', 'estimated'].includes(f.originType) || !TIERS.includes(f.rightsTier)) fail('finding missing originType/rightsTier');
    if (f.statedAt !== undefined && (!nonempty(f.statedAt) || !period(f.statedAt) || (f.statedAt.length === 10 && !date(f.statedAt)))) fail('invalid statedAt');
    if (f.originType === 'estimated' && (!nonempty(f.formula) || !/[=＝]/.test(f.formula) || !/\d/.test(f.formula))) fail('estimate requires reproducible formula');
    if (f.topic === 'viability' && (!VIABILITY.includes(f.viabilityStatus) || f.originType === 'estimated')) fail('viability needs sourced factual rationale and status');
    if (f.formula !== undefined && (f.originType !== 'estimated' || !nonempty(f.formula))) fail('formula reserved for estimates');
    if ((f.occurredAt !== undefined || f.eventType !== undefined) && f.topic !== 'timeline') fail('event metadata on wrong topic');
    if (f.sampleCount !== undefined && f.topic !== 'reviews') fail('sampleCount on wrong topic');
    if (f.viabilityStatus !== undefined && f.topic !== 'viability') fail('viabilityStatus on wrong topic');
    if (f.toolNames !== undefined && (f.topic !== 'hiring' || !Array.isArray(f.toolNames) || f.toolNames.some(t => !nonempty(t)))) fail('invalid toolNames');
    if (f.topic === 'reviews' && (!Number.isInteger(f.sampleCount) || f.sampleCount < 1)) fail('reviews need sampleCount');
    if (f.topic === 'timeline' && (!nonempty(f.eventType) || !nonempty(f.occurredAt) || !period(f.occurredAt))) fail('timeline needs occurredAt/eventType');
  }
  for (const key of Object.keys(record.coverage)) if (!TOPICS.includes(key)) fail('unknown coverage topic');
  for (const topic of TOPICS) {
    const c = record.coverage[topic]; fields(c, ['status', 'reason', 'attempts'], `coverage.${topic}`);
    if (!['found', 'unconfirmed', 'not_applicable', 'not_attempted'].includes(c.status) || !nonempty(c.reason) || !Array.isArray(c.attempts)) fail(`invalid coverage ${topic}`);
    if ((c.status === 'found') !== record.findings.some(f => f.topic === topic)) fail(`coverage/findings mismatch ${topic}`);
    if (['found', 'unconfirmed'].includes(c.status) && !c.attempts.length) fail(`found/unconfirmed needs actual attempts ${topic}`);
    for (const a of c.attempts) { fields(a, ['url', 'observedAt', 'outcome'], 'attempt'); if (!http(a.url) || !date(a.observedAt) || !nonempty(a.outcome)) fail('invalid attempt'); }
  }
  return record;
}
function appendUnique(array, value, key = canonical) { if (!array.some(x => key(x) === key(value))) array.push(value); }
export function mergeDeepRecord(base, record) {
  validateDeepRecord(record);
  if (base.id !== record.id || base.reaudit?.method !== 'MANUAL_REAUDIT') fail('target must be same manually reaudited catalog id');
  const out = structuredClone(base);
  out.observationsStream ??= []; out.observations ??= []; out.evidenceCards ??= []; out.reaudit.sources ??= []; out.reaudit.deepWaves ??= [];
  if (out.reaudit.deepWaves.some(r => canonical(r) === canonical(record))) return out;
  for (const f of record.findings) {
    const id = `deep-${identity(f)}`;
    if (out.observationsStream.some(o => o.id === id)) continue;
    const provenance = { sourceUrl: f.sourceUrl, observedAt: f.observedAt, originType: f.originType, rightsTier: f.rightsTier, ...(f.statedAt ? { statedAt: f.statedAt } : {}), ...(f.formula ? { formula: f.formula } : {}) };
    const sourceId = `deep-source-${hash(urlKey(f.sourceUrl))}`;
    const sourceNote = `${f.observedAt} 観測${f.statedAt ? ` / ${f.statedAt} 時点` : ''} / ${f.rightsTier} / ${f.sourceUrl}`;
    const publicText = `${f.text}${f.topic === 'reviews' ? `（確認対象 ${f.sampleCount} 件、全体の代表性は未確認）` : ''}${f.originType === 'estimated' ? `（推計式: ${f.formula}）` : ''}`;
    const observation = { id, category: f.topic === 'reviews' ? 'FORUM_RAGE' : f.topic === 'initialTraction' ? 'FOUNDER_HACK' : f.topic === 'incumbentBarrier' ? 'INCUMBENT_DILEMMA' : 'TECH_VERIFICATION', categoryLabel: label(f.topic), text: publicText, ...provenance, verificationStatus: 'SUPPORTED', evidenceIds: [sourceId], observationType: `deep.${f.topic}`, publicDisplay: { title: label(f.topic), subject: out.name, note: publicText, facts: [{ label: '観測日', value: f.observedAt }, ...(f.statedAt ? [{ label: '資料の時点', value: f.statedAt }] : [])], sourceLabel: new URL(f.sourceUrl).hostname, sourceUrls: [f.sourceUrl], attribution: { displayTier: 'facts_only', providerName: new URL(f.sourceUrl).hostname, retrievedAt: f.observedAt, ...(f.statedAt ? { publishedAt: f.statedAt } : {}), selfReported: f.originType === 'reported', rule: '事実の独自要約のみ。原文・画像は再配布しない。' } } };
    out.observationsStream.push(observation);
    appendUnique(out.observations, publicText);
    out.evidenceCards.push({ id, type: f.topic === 'initialTraction' ? 'DIRTY_GENESIS' : f.topic === 'incumbentBarrier' ? 'INCUMBENT_TRAP' : f.topic === 'fatalCause' ? 'FATAL_BLEED' : 'SMOKING_GUN', title: label(f.topic), evidenceStatus: f.topic === 'fatalCause' ? 'POST_MORTEM' : f.originType === 'estimated' ? 'ESTIMATED' : 'REPORTED', punchline: publicText, url: f.sourceUrl, sourceNote, ...provenance });
    if (!out.reaudit.sources.some(s => http(s.url) && urlKey(s.url) === urlKey(f.sourceUrl))) out.reaudit.sources.push({ url: f.sourceUrl, checkedAt: f.observedAt, publicationDate: f.statedAt ?? null, rightsTier: f.rightsTier, originType: f.originType, sourceType: 'deep_wave_public_facts', publisher: new URL(f.sourceUrl).hostname, displayTier: 'facts_only', rawStoredPrivately: false });
    const cited = `${publicText}（${sourceNote}）`;
    if (f.topic === 'initialTraction') { out.strategy ??= {}; out.strategy.initialTraction ??= []; appendUnique(out.strategy.initialTraction, cited); }
    if (f.topic === 'hiring') for (const name of f.toolNames ?? []) { out.operations ??= {}; out.operations.toolStack ??= []; if (!out.operations.toolStack.some(t => t.name.toLowerCase() === name.toLowerCase())) out.operations.toolStack.push({ name, category: '求人記載（本番利用は未確認）', monthlyCost: 0, isCostUnconfirmed: true, purpose: cited, url: f.sourceUrl, ...provenance }); }
    if (f.topic === 'timeline') { out.timelineEvents ??= []; appendUnique(out.timelineEvents, { eventType: f.eventType, occurredAt: f.occurredAt, description: cited, ...provenance }); }
    if (f.topic === 'eraContext' || f.topic === 'viability') {
      out.temporal ??= { foundedYear: 0, initialTractionPeriod: '未確認', dataSnapshotPeriod: '未確認', viabilityStatus: 'UNKNOWN', viabilityLabel: '未確認', eraContext: '未確認', currentViabilityAnalysis: '未確認' };
      if (f.topic === 'eraContext' && unknown(out.temporal.eraContext)) out.temporal.eraContext = cited;
      if (f.topic === 'viability' && unknown(out.temporal.viabilityStatus)) { out.temporal.viabilityStatus = f.viabilityStatus; out.temporal.viabilityLabel = VIABILITY_LABELS[VIABILITY.indexOf(f.viabilityStatus)]; out.temporal.currentViabilityAnalysis = unknown(out.temporal.currentViabilityAnalysis) ? cited : `${out.temporal.currentViabilityAnalysis}\n${cited}`; }
    }
  }
  out.coverageAudit ??= [];
  const limited = [];
  for (const topic of TOPICS) {
    const c = record.coverage[topic];
    if (c.status !== 'not_attempted') appendUnique(out.coverageAudit, { dimension: `deep.${topic}`, status: c.status === 'unconfirmed' ? 'attempted_unavailable' : c.status, note: c.reason, attempts: c.attempts.map(a => `${a.observedAt} ${a.outcome} ${a.url}`) });
    if (c.status !== 'found') limited.push(`${label(topic)}（${c.status === 'not_attempted' ? '未調査' : c.status === 'not_applicable' ? '対象外' : '未確認'}）`);
  }
  // 未確認の項目は1枚にまとめる。項目ごとの理由と試行URLは coverageAudit に残す。
  const limitId = `deep-limit-${hash([record.id, record.coverage])}`;
  if (limited.length && !out.evidenceCards.some(card => card.id === limitId)) out.evidenceCards.push({ id: limitId, type: 'UNKNOWN_AUDIT', title: '深掘り調査で確認できなかった項目', evidenceStatus: 'UNKNOWN', punchline: `${limited.join('、')}。確認した公開ページの範囲で裏付けが見つからなかったもので、存在しないことを意味しない。` });
  out.reaudit.deepWaves.push(structuredClone(record));
  return out;
}
export function mergeDeep(catalog, input) {
  fields(input, ['schemaVersion', 'records'], 'input');
  if (input.schemaVersion !== 'deep-wave.v1' || !Array.isArray(input.records) || !input.records.length) fail('invalid deep-wave.v1 envelope');
  const seen = new Set();
  return input.records.map(r => { if (seen.has(r.id)) fail('duplicate record id'); seen.add(r.id); const base = catalog.find(e => e.id === r.id); if (!base) fail('unknown catalog id'); return mergeDeepRecord(base, r); });
}
/** Rebuild every candidate from current catalog plus validated history: catches deletion/injected projections. */
export function validateDeepCandidate(candidate, base, required = false) {
  try {
    const waves = candidate.reaudit?.deepWaves;
    if (!waves) { if (required) fail('missing deepWaves provenance'); return []; }
    if (!Array.isArray(waves) || !waves.length) fail('invalid deepWaves');
    let expected = base;
    for (const wave of waves) expected = mergeDeepRecord(expected, wave);
    if (canonical(expected) !== canonical(candidate)) fail('candidate differs from additive replay against current catalog; rebuild (stale base, deleted facts or injected fields)');
    return [];
  } catch (err) { return [err instanceof Error ? err.message : String(err)]; }
}
export function main(args = process.argv.slice(2)) {
  const opt = key => { const i = args.indexOf(key); return i < 0 ? undefined : args[i + 1]; };
  const inputPath = opt('--input'), outputPath = opt('--output');
  if (!inputPath || !outputPath) fail('usage: --input <deep-wave.json> --output data/incoming/reaudit-deep-<fam>-batch-NNN-YYYYMMDD.json');
  const output = resolve(outputPath), incoming = realpathSync(resolve('data/incoming'));
  if (realpathSync(dirname(output)) !== incoming || !/^reaudit-deep-[a-z0-9-]+-batch-\d{3}-\d{8}\.json$/.test(basename(output))) fail('output must be a new named deep candidate in data/incoming');
  const result = mergeDeep(JSON.parse(readFileSync(resolve('data/entities-index.json'), 'utf8')), JSON.parse(readFileSync(resolve(inputPath), 'utf8')));
  writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`, { flag: 'wx' });
  console.log(`Created ${result.length} candidates: ${outputPath}. Validate before any separately authorized ingest.`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main();
