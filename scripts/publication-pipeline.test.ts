import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { contentHash, evaluateForRelease, evaluatePublication, parseFinishedManifest, preparePublicationReader, publicationHash, type PublicationInput } from './reader-case/publication-evaluation';
import { applyPublicationAudit } from './reader-case/publication-audit';
import { checkCase, missingRequired } from './reader-case/analysis-lib';
import { checkWithdrawals, planRelease } from './reader-case/release-plan';
import { identifyEntity, normalizeEntityName } from './pipeline/entity-identity.mjs';
import { cachePath, type SourceCacheRecord } from './reader-case/verify-lib';
import { sourcePolicy } from './reader-case/source-policy';
import { readPublicationAudits } from './reader-case/publication-inputs';
import { projectReaderCase } from '../src/lib/company-access/reader-case-projection';
import { stageEntity, review } from '../src/lib/media/media-test-fixtures';
import { parseFinancialEntity } from '../src/shared/financial-entity-schema';
import type { FinancialEntity } from '../src/shared/terminal';

const root = process.cwd();
const saveEvidence = (name: string, text: string) => {
  const directory = process.env.PUBLICATION_TEST_EVIDENCE_DIR;
  if (directory) { mkdirSync(directory, { recursive: true }); writeFileSync(join(directory, name), text); }
};
const hash = (n: string) => n.repeat(64);
const sourceText = '店舗向けの予約管理サービス。公式の製品説明と利用条件。'.repeat(15);
function input(): PublicationInput {
  return {
    identity: { id: 'ent_fixture', name: 'Fixture business', url: 'https://fixture.example/', publishability: 'PARTIAL' }, entityEligible: true,
    reader: { sources: [{ id: 's1', url: 'https://fixture.example/', publisher: 'Fixture', kind: 'OFFICIAL' }],
      facts: [{ id: 'f1', sourceId: 's1', kind: 'DESCRIPTION', text: '店舗向けの予約管理サービス。', attribution: 'OFFICIAL' }],
      metrics: [], analysis: [], unknowns: ['REVENUE', 'PROFIT'], summaryFactId: 'f1' },
    verdicts: { f1: { verdict: 'SUPPORTED', claimText: '店舗向けの予約管理サービス。', quote: '店舗向けの予約管理サービス。', sourceUrl: 'https://fixture.example/', checkedAt: '2026-10-02' } },
    sources: [{ sourceId: 's1', url: 'https://fixture.example/', publisher: 'Fixture', text: sourceText, policy: { decision: 'allowed', usage: 'independently_worded_facts' },
      snapshot: { url: 'https://fixture.example/', status: 200, text: sourceText, via: 'direct', fetchedAt: '2026-10-02T00:00:00Z' } }],
    media: { assets: [{ assetId: 'media-fixture', rights: { decision: 'allowed' } }], displayableIds: ['media-fixture'], problems: [] },
  };
}
const audit = (i: PublicationInput, items: unknown[] = []) => {
  const inputDoc = { cases: [{ entityId: i.identity.id, snapshot: i, publicationHash: publicationHash(i) }] };
  const outputDoc = { cases: [{ entityId: i.identity.id, items }] };
  return applyPublicationAudit(i, inputDoc, outputDoc, 'data/audit/in-100.json', 'data/audit/out-100.json');
};

test('revenue/profit absent: evidence/receipt gate passes without any fabricated value; main completeness rules are reported separately', () => {
  const i = input(); const receipt = audit(i)!.receipt;
  assert.equal(evaluatePublication(i, receipt).publishable, true);
  // main の完成基準（OWNER_INTENT 2章）は別関数。空欄は推測で埋めず、理由として残る
  assert.ok(missingRequired(i.reader).includes('TAKE_HOME'));
  assert.ok(missingRequired(i.reader).includes('REVENUE_ESTIMATE'));
  assert.deepEqual(preparePublicationReader(i.reader, i.verdicts, null).reader.analysis, []);
  assert.deepEqual(i.reader.metrics, []);
});

test('active unsupported/broken analysis cannot piggyback on a valid case audit', () => {
  const i = input();
  for (const basis of [[], ['made-up-id']]) {
    const a = { id: 'a-viability', item: 'VIABILITY' as const, text: '今も有効。', confidence: 'LOW' as const, basis };
    const prepared = preparePublicationReader(i.reader, i.verdicts, [a]);
    assert.ok(prepared.problems.length);
    assert.equal(evaluatePublication({ ...i, reader: prepared.reader }, audit(i)!.receipt, prepared.problems).publishable, false);
  }
  assert.equal(checkCase('x', [{ item: 'CUSTOMER', text: '創業者は秘密の売上を公表した。', basis: [], confidence: 'LOW' }], i.reader).dropped[0].reason, 'fabricated-statement');
});

test('auditor BLOCK removes a fabricated active claim, with no mandatory refill', () => {
  const i = input();
  i.reader.analysis.push({ id: 'a-story', item: 'STORY', text: '創業者は有名企業に買収されたと語った。', basis: ['f1'], confidence: 'LOW' });
  const approved = audit(i, [{ analysisId: 'a-story', kind: 'FACT_DISGUISED', severity: 'BLOCK' }])!;
  assert.deepEqual(approved.analysis, []);
  assert.equal(evaluatePublication(i, approved.receipt).publishable, false);
  assert.equal(evaluatePublication({ ...i, reader: { ...i.reader, analysis: [] } }, approved.receipt).publishable, true);
});

test('an auditor correction approves only the corrected text and formula', () => {
  const i = input();
  i.reader.analysis.push({ id: 'a-customer', item: 'CUSTOMER', text: '全店舗が客になる。', basis: ['f1'], confidence: 'LOW' });
  const reviewed = audit(i, [{ analysisId: 'a-customer', kind: 'FACT_DISGUISED', severity: 'FIX', fix: '予約管理の手間が多い店舗が客と見られる。' }])!;
  assert.equal(evaluatePublication(i, reviewed.receipt).publishable, false);
  assert.equal(evaluatePublication({ ...i, reader: { ...i.reader, analysis: reviewed.analysis } }, reviewed.receipt).publishable, true);
});

test('source content/URL/attribution/facts/formula/rights changes invalidate an old audit', () => {
  const original = input(); const receipt = audit(original)!.receipt;
  const mutations: ((i: PublicationInput) => void)[] = [
    i => { i.sources[0].snapshot!.text += 'Changed outside the auditor excerpt.'; },
    i => { i.reader.sources[0].url = 'https://other.example/'; },
    i => { i.reader.facts[0].attribution = 'SELF_REPORTED'; },
    i => { i.reader.sources[0].publishedAt = '2026-09-01'; },
    i => { i.sources[0].snapshot!.fetchedAt = '2026-10-03T00:00:00Z'; },
    i => { i.reader.facts[0].text += '追加の主張'; },
    i => { i.sources[0].policy = { decision: 'blocked' }; },
    i => { i.media.assets = [{ rights: { decision: 'held' } }]; },
    i => { i.reader.analysis.push({ id: 'a-take_home', item: 'TAKE_HOME', text: '事業の手残り推定約10円。', basis: ['f1'], formula: '20 - 10 = 10', confidence: 'LOW' }); },
  ];
  for (const mutate of mutations) {
    const next = structuredClone(original); mutate(next);
    assert.equal(evaluatePublication(next, receipt).publishable, false);
  }
});

test('case BLOCK, malformed/duplicate review, legacy and missing audit cannot approve', () => {
  const i = input();
  assert.equal(audit(i, [{ analysisId: '__case__', kind: 'RIGHTS', severity: 'BLOCK' }]), null);
  assert.equal(audit(i, [{ analysisId: 'not-present', kind: 'X', severity: 'LOW' }]), null);
  assert.equal(audit(i, [{ analysisId: '__case__', severity: 'invalid' }]), null);
  assert.equal(evaluatePublication(i, undefined).publishable, false);
  assert.equal(applyPublicationAudit(i, { cases: [{ entityId: i.identity.id }] }, { cases: [{ entityId: i.identity.id, items: [] }] }, 'a', 'b'), null);
});

test('current media rights withdrawal permits a withdrawal-only release', () => {
  const original = input(); const receipt = audit(original)!.receipt;
  const next = structuredClone(original); next.media.displayableIds = []; next.media.assets = [{ rights: { decision: 'blocked' } }];
  const published: Record<string, string> = evaluatePublication(next, receipt).publishable ? { ent_fixture: hash('b') } : {};
  const plan = planRelease({ details: { ent_fixture: hash('a') } }, { details: published });
  assert.equal(plan.changed, true); assert.deepEqual(plan.withdrawn, ['ent_fixture']); assert.deepEqual(plan.added, []);
});

test('correction-only, equal-count replacement, unchanged and intentionally empty plans', () => {
  const before = { details: { a: hash('a') } };
  assert.deepEqual(planRelease(before, { details: { a: hash('b') } }).corrected, ['a']);
  assert.equal(planRelease(before, { details: { a: hash('b') } }).changed, true);
  assert.equal(planRelease(before, before).changed, false);
  assert.deepEqual(planRelease(before, { details: { b: hash('b') } }).withdrawn, ['a']);
  assert.equal(planRelease(before, { details: {} }).after, 0);
  assert.equal(checkWithdrawals(['a']).allowed, false);
  assert.equal(checkWithdrawals(['a'], new Set(['a'])).allowed, true);
  assert.equal(checkWithdrawals(['a'], new Set(['a', 'unexpected'])).allowed, false);
  assert.notEqual(planRelease(before, { details: { a: hash('b') } }).planId, planRelease(before, { details: { a: hash('c') } }).planId);
  assert.deepEqual([...parseFinishedManifest('# no selected cases\n')], []);
  assert.throws(() => parseFinishedManifest('a\na\n'));
});

test('release gate adds the display-contract minimum: thin cases stay out even with a current receipt', () => {
  const i = input(); const receipt = audit(i)!.receipt;
  assert.equal(evaluatePublication(i, receipt).publishable, true);
  const gate = evaluateForRelease(i, receipt);
  assert.equal(gate.publishable, false);
  assert.ok(gate.reasons.some((r) => r.startsWith('全体が薄い:事実2件以下')));
  assert.ok(gate.reasons.some((r) => r.startsWith('全体が薄い:本文の節')));
});

test('legal suffix normalization preserves letters; ID/domain updates and duplicates are distinct', () => {
  assert.equal(normalizeEntityName('Clinic Inc.'), 'clinic');
  assert.equal(normalizeEntityName('株式会社クリニック'), 'クリニック');
  assert.notEqual(normalizeEntityName('Clinic'), normalizeEntityName('Clonic'));
  assert.notEqual(normalizeEntityName('coincide'), normalizeEntityName('coide'));
  const registry = [{ id: 'e1', name: 'Clinic LLC', domain: 'clinic.example' }];
  assert.equal(identifyEntity({ id: 'e1', url: 'https://clinic.example/new' }, registry, 'update').status, 'UPDATE');
  assert.equal(identifyEntity({ id: 'new-id', url: 'https://clinic.example/' }, registry).status, 'EXISTS');
  assert.equal(identifyEntity({ domain: 'www.clinic.example' }, registry, 'update').targetEntityId, 'e1');
  assert.equal(identifyEntity({ id: 'new-id', domain: 'clinic.example' }, registry, 'update').status, 'EXISTS');
  assert.equal(identifyEntity({ id: 'e1', domain: 'unrelated.example' }, registry, 'update').status, 'IDENTITY_CONFLICT');
  assert.equal(identifyEntity({ name: 'Clinic Inc.' }, registry, 'update').status, 'POSSIBLE_DUPLICATE');
  assert.equal(identifyEntity({ name: 'Clonic', domain: 'clonic.example' }, registry).status, 'AVAILABLE');
});

const run = (cwd: string, script: string, args: string[] = []) => spawnSync(process.execPath,
  ['--import', resolve(root, 'node_modules/tsx/dist/loader.mjs'), resolve(root, script), ...args],
  { cwd, env: { ...process.env, TSX_TSCONFIG_PATH: resolve(root, 'tsconfig.json') }, encoding: 'utf8', timeout: 180_000 });

test('an individually reviewed article/review is allowed; a later rights withdrawal wins', () => {
  const dir = mkdtempSync(join(tmpdir(), 'mm-rights-')); mkdirSync(join(dir, 'data')); process.chdir(dir);
  try {
    const url = 'https://independent-review.example/business-review';
    const record = { url, decision: 'allowed', usage: 'independently_worded_facts', reviewer: 'fixture-reviewer', reviewedAt: '2026-10-02T00:00:00Z', termsUrl: 'https://independent-review.example/terms', note: 'Fixture: independently worded facts with attribution allowed.' };
    writeFileSync('data/catalog-source-rights.json', JSON.stringify({ [url]: record }));
    assert.ok(sourcePolicy(url));
    writeFileSync('data/catalog-source-rights.json', JSON.stringify({ [url]: { ...record, decision: 'blocked' } }));
    assert.equal(sourcePolicy(url), null);
  } finally { process.chdir(root); }
});

/** A complete synthetic record. Unknown DTO zeros carry flags and never turn into reader metrics. */
function fixtureEntity(): FinancialEntity {
  const entity = {
    id: 'ent_fixture', ticker: 'FIXTURE', name: 'Fixture business', tagline: '店舗向けの予約管理サービス。', sector: 'NICHE_SAAS', scale: 'UNKNOWN', founder: '未確認', country: '未確認', url: 'https://fixture.example/',
    verifiedBadge: false, growthRateYoY: 0, tags: [], publishability: 'PARTIAL', architecturePattern: '未確認', pipelineStack: '未確認', targetPainWallet: '未確認',
    pnl: { monthlyRevenue: 0, cogs: 0, grossProfit: 0, grossMargin: 0, operatingExpenses: { serverAndApi: 0, advertising: 0, subcontracting: 0, toolsAndSaaS: 0, other: 0 }, operatingProfit: 0, operatingMargin: 0, estimatedAnnualNetProfit: 0, financialStatus: 'UNAVAILABLE', isRevenueUnconfirmed: true, isOperatingProfitUnconfirmed: true, isMarginUnconfirmed: true, isGrossProfitUnconfirmed: true, isGrossMarginUnconfirmed: true, isCogsUnconfirmed: true, isCostsUnconfirmed: true, isNetProfitUnconfirmed: true },
    operations: { teamSize: 0, weeklyHours: 0, initialCapitalRequired: 0, automationLevel: 0, primaryChannels: [], toolStack: [], isTeamSizeUnconfirmed: true, isWeeklyHoursUnconfirmed: true, isCapitalUnconfirmed: true, isAutomationUnconfirmed: true },
    strategy: { moatType: 'UNKNOWN', blindspot: '未確認', moatDescription: '未確認', secretInsight: '未確認', initialTraction: [], actionPlaybook: [], coldOutreachTemplate: '', incumbentDilemma: '未確認' },
    evidenceCards: [{ id: 'e1', type: 'UNKNOWN_AUDIT', title: '出典: Fixture', badge: '出典', evidenceStatus: 'REPORTED', punchline: '', details: [], url: 'https://fixture.example/', sourceNote: 'Fixture', sourceClass: 'PRIMARY' }],
    reaudit: { supported: ['公式サイトは、店舗向けの予約管理サービスとして紹介している（出典: https://fixture.example/）。', '公式サイトは、予約の自動通知を機能として紹介している（出典: https://fixture.example/）。', '公式サイトは、店舗ごとの予約枠の管理を機能として紹介している（出典: https://fixture.example/）。'] },
  };
  return parseFinancialEntity(entity);
}

test('CLI select → prepare dry-run shares gate; fresh audit passes, cache change rejects, blocked media withdraws', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'mm-publication-e2e-')); mkdirSync(join(dir, 'data/audit'), { recursive: true }); process.chdir(dir);
  try {
    const entity = fixtureEntity(); const reader = projectReaderCase(entity as unknown as Record<string, unknown>).reader;
    assert.ok(reader.facts.some(f => f.kind === 'DESCRIPTION'));
    const verdicts = Object.fromEntries(reader.facts.map(f => [f.id, { verdict: 'SUPPORTED', claimText: f.text, quote: '店舗向けの予約管理サービス。', sourceUrl: reader.sources.find(s => s.id === f.sourceId)!.url, checkedAt: '2026-10-02' }]));
    const cache: SourceCacheRecord = { ...(input().sources[0].snapshot! as SourceCacheRecord), url: reader.sources[0].url };
    mkdirSync('data/source-cache', { recursive: true }); writeFileSync(cachePath(cache.url), JSON.stringify(cache));
    const mediaRoot = join(dir, 'data/media-staging');
    const [asset] = await stageEntity(mediaRoot, entity.id, [{ kind: 'app_icon', bytes: Buffer.from('fixture-only-image') }]);
    await review(mediaRoot, entity.id, asset, 'allowed');
    writeFileSync('data/entities-index.json', JSON.stringify([entity])); writeFileSync('data/reader-verdicts.json', JSON.stringify({ [entity.id]: verdicts }));
    const f0 = reader.facts[0].id;
    const required = ['HEADLINE', 'STORY', 'CUSTOMER_PAIN', 'FIRST_CUSTOMERS', 'CHANNELS', 'TAKE_HOME', 'INCUMBENT_BLINDSPOT', 'VIABILITY', 'LESSON', 'REVENUE_ESTIMATE', 'PRICING']
      .map((item) => ({ id: `a-${item.toLowerCase()}`, item, text: '予約の取りこぼしを嫌う小さな店舗向けで、月額課金が中心と推す。', basis: [f0], confidence: 'LOW' }));
    writeFileSync('data/reader-analysis.json', JSON.stringify({ [entity.id]: required })); writeFileSync('data/candidate.ids', '# scope\nent_fixture\n');
    writeFileSync('data/catalog-finished-ids.txt', '# initially empty\n'); writeFileSync('data/catalog-release.json', JSON.stringify({ details: {} }));
    // Real audit input writer; synthetic reviewer output makes this an offline fixture, never an actual approval.
    const built = run(dir, 'scripts/reader-case/build-audit-input.ts', ['--ids', 'data/candidate.ids', '--tag', '100']);
    assert.equal(built.status, 0, built.stderr);
    const inputFile = 'data/audit/in-100001.json'; const outputFile = 'data/audit/out-100001.json';
    const inputDoc = JSON.parse(readFileSync(inputFile, 'utf8')); const outputDoc = { cases: [{ entityId: entity.id, items: [] }] };
    writeFileSync(outputFile, JSON.stringify(outputDoc));
    const merged = run(dir, 'scripts/reader-case/merge-analysis.ts', ['--ids', 'data/candidate.ids']);
    assert.equal(merged.status, 0, merged.stderr);
    assert.ok(readPublicationAudits()[entity.id]);
    const select = run(dir, 'scripts/reader-case/select-finished.ts', ['--ids', 'data/candidate.ids']);
    assert.equal(select.status, 0, select.stderr); assert.equal(JSON.parse(select.stdout).finished, 1, select.stdout);
    const before = readFileSync('data/catalog-release.json', 'utf8');
    const dry = run(dir, 'scripts/prepare-catalog-release.ts', ['--dry-run']);
    saveEvidence('addition-dry-run.json', dry.stdout);
    assert.equal(dry.status, 0, dry.stderr); assert.deepEqual(JSON.parse(dry.stdout).plan.added, ['ent_fixture']);
    assert.equal(readFileSync('data/catalog-release.json', 'utf8'), before); assert.equal(existsSync('.catalog-release'), false);
    // Retain the selection, mutate source text beyond an unchanged quote: publication must still recheck audit.
    writeFileSync(cachePath(cache.url), JSON.stringify({ ...cache, text: cache.text + ' update' }));
    const changed = run(dir, 'scripts/prepare-catalog-release.ts', ['--dry-run']);
    saveEvidence('stale-source-dry-run.json', changed.stdout);
    assert.equal(changed.status, 0, changed.stderr); assert.deepEqual(JSON.parse(changed.stdout).plan.added, []);
    assert.match(JSON.parse(changed.stdout).caseStamps.ent_fixture.reason, /現在の入力に対する監査が無い/);
    writeFileSync(cachePath(cache.url), JSON.stringify(cache));
    writeFileSync('data/catalog-release.json', JSON.stringify({ details: { ent_fixture: hash('a') } }));
    const correction = run(dir, 'scripts/prepare-catalog-release.ts', ['--dry-run']);
    saveEvidence('correction-dry-run.json', correction.stdout);
    assert.equal(correction.status, 0, correction.stderr);
    assert.deepEqual(JSON.parse(correction.stdout).plan.corrected, ['ent_fixture']);
    assert.deepEqual(JSON.parse(correction.stdout).plan.added, []);
    await review(mediaRoot, entity.id, asset, 'blocked', { note: 'fixture withdrawal' });
    const withdrawn = run(dir, 'scripts/prepare-catalog-release.ts', ['--dry-run']);
    saveEvidence('withdrawal-dry-run.json', withdrawn.stdout);
    assert.equal(withdrawn.status, 0, withdrawn.stderr); assert.deepEqual(JSON.parse(withdrawn.stdout).plan.withdrawn, ['ent_fixture']);
    assert.equal(JSON.parse(withdrawn.stdout).canApply, false);
    const blockedApply = run(dir, 'scripts/prepare-catalog-release.ts');
    assert.notEqual(blockedApply.status, 0); assert.match(blockedApply.stderr, /explicit --withdrawals/);
    assert.deepEqual(JSON.parse(readFileSync('data/catalog-release.json', 'utf8')).details, { ent_fixture: hash('a') });
    assert.equal(existsSync('.catalog-release'), false);
    writeFileSync('data/withdrawals.ids', 'ent_fixture\n');
    const explicitPlan = run(dir, 'scripts/prepare-catalog-release.ts', ['--dry-run', '--withdrawals', 'data/withdrawals.ids']);
    assert.equal(explicitPlan.status, 0, explicitPlan.stderr); assert.equal(JSON.parse(explicitPlan.stdout).canApply, true);
    saveEvidence('approved-withdrawal-dry-run.json', explicitPlan.stdout);

    // A later negative review for the identical input overrides an earlier pass even before merging it.
    assert.ok(readPublicationAudits()[entity.id]);
    writeFileSync('data/audit/in-200001.json', JSON.stringify(inputDoc));
    writeFileSync('data/audit/out-200001.json', JSON.stringify({ cases: [{ entityId: entity.id, items: [{ analysisId: '__case__', kind: 'FACT_DISGUISED', severity: 'BLOCK' }] }] }));
    assert.deepEqual(readPublicationAudits(), {});
    // Audit file tampering also invalidates the receipt.
    writeFileSync(outputFile, JSON.stringify({ ...outputDoc, changed: true })); assert.deepEqual(readPublicationAudits(), {});
    assert.equal(contentHash(inputDoc), contentHash(JSON.parse(readFileSync(inputFile, 'utf8'))));
  } finally { process.chdir(root); }
});
