import { strict as assert } from 'node:assert';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { test } from 'node:test';
import type { ReaderCase } from '../src/shared/reader-case';
import { currentStates, readCaseRecords } from './reader-case/ledger';
import { IMPORT_RULE_VERSION, convertCase, importCases, importFingerprint, makeCheckCaseGate, type ImportDeps, type RebuildOut } from './reader-case/import-case-rebuild';
import type { PublicationInput } from './reader-case/publication-evaluation';

// 実データは使わない。fixture だけ（一時ディレクトリに書く）
const ID = 'ent_fixture_000000000001';
const fixture = (over: Partial<RebuildOut> = {}): RebuildOut => ({
  id: ID,
  status: 'READY',
  incompleteReasons: [],
  lead: 'フィクスチャの店を2024年に畳み、翌年に作り直した。',
  reader: {
    sources: [{ id: 's1', publisher: '運営者', url: 'https://example.test/about', checkedAt: '2026-10-06', kind: 'OFFICIAL' }],
    facts: [
      { id: 'f1', kind: 'DESCRIPTION', text: '月額29ドルの購読を売る小さな店。有料客は約350人。', sourceId: 's1', attribution: 'OFFICIAL' },
      { id: 'f2', kind: 'EVENT', text: '2024年に店を畳み、2025年に作り直した。', sourceId: 's1', attribution: 'OFFICIAL' },
    ],
    metrics: [{ id: 'm1', measure: 'REVENUE', periodKind: 'MONTH', period: '2025-05', amount: 10150, currency: 'USD', origin: 'SELF_REPORTED', sourceId: 's1' }],
    unknowns: ['PROFIT', 'COST', 'FONT_REVENUE_ACTUAL'],
    summaryFactId: 'f1',
    analysis: [
      { item: 'HEADLINE', text: 'フィクスチャの店を2024年に畳み、翌年に作り直した。', basis: ['f2'], confidence: 'MEDIUM' },
      { item: 'BUSINESS_MODEL', text: '月額29ドルの購読を、約350人に売る。', basis: ['f1'], confidence: 'HIGH' },
      { item: 'COST_STRUCTURE', text: '決済手数料は約$294。', basis: ['m1'], formula: '$10,150 × 2.9% = $294（Stripe標準）', confidence: 'LOW' },
      { item: 'TAKE_HOME', text: '費用を仮置きで月$2,000とすると手残りは約$8,000。', basis: ['m1'], formula: '$10,150 − 仮置き $2,000', confidence: 'LOW' },
    ],
  },
  removedPlaceholders: [{ where: '旧 TAKE_HOME', text: '仮置き' }],
  followUps: ['年次報告の確認'],
  ...over,
});

const setup = () => {
  const root = mkdtempSync(`${tmpdir()}/import-rebuild-`);
  const srcDir = `${root}/src`;
  mkdirSync(`${srcDir}/out`, { recursive: true });
  const write = (out: RebuildOut) => writeFileSync(`${srcDir}/out/${out.id}.json`, JSON.stringify(out));
  const opts = { ids: [ID], srcDir, dataDir: `${root}/data`, ledgerDir: `${root}/ledger` };
  return { root, srcDir, write, opts };
};
const deps = (over: Partial<ImportDeps> = {}): ImportDeps => ({
  buildPublicationInput: async (id: string, reader: ReaderCase): Promise<PublicationInput> => ({
    identity: { id, name: 'フィクスチャ', url: 'https://example.test/' }, entityEligible: true, reader, verdicts: undefined,
    sources: reader.sources.map((s) => ({ sourceId: s.id, url: s.url, publisher: s.publisher, snapshot: null, text: '', policy: null })),
    media: { assets: [], displayableIds: [], problems: [] },
  }),
  ...over,
});
const readJson = (p: string) => JSON.parse(readFileSync(p, 'utf8'));

test('READY は経路の入力に変換される: confidence は引き継がず、仮置きの項目は落ち、未知の未調査は外れる', async () => {
  const { write, opts, srcDir } = setup();
  const out = fixture();
  write(out);
  const before = readFileSync(`${srcDir}/out/${ID}.json`, 'utf8');
  const [r] = await importCases(opts, deps());
  assert.equal(r.result, 'IMPORTED');
  const dir = `${opts.dataDir}/case-import/${ID}`;
  assert.deepEqual(readdirSync(dir).sort(), ['analysis.json', 'audit-input.json', 'import.json', 'reader.json']);
  const analysis = readJson(`${dir}/analysis.json`) as { id: string; item: string; presentation?: string; confidence?: string }[];
  assert.deepEqual(analysis.map((a) => a.item), ['HEADLINE', 'BUSINESS_MODEL', 'COST_STRUCTURE']);
  assert.ok(analysis.every((a) => a.confidence === undefined));
  assert.deepEqual(analysis.map((a) => a.presentation), ['FACT_SUMMARY', 'FACT_SUMMARY', 'ESTIMATE']);
  assert.equal(analysis[0].id, 'a-headline');
  const manifest = readJson(`${dir}/import.json`);
  assert.deepEqual(manifest.items.dropped.map((d: { item: string; reason: string }) => [d.item, d.reason]), [['TAKE_HOME', 'placeholder-number']]);
  assert.deepEqual(manifest.droppedUnknowns, ['FONT_REVENUE_ACTUAL']);
  assert.deepEqual(readJson(`${dir}/reader.json`).unknowns, ['PROFIT', 'COST']);
  const audit = readJson(`${dir}/audit-input.json`);
  assert.equal(audit.entityId, ID);
  assert.match(audit.publicationHash, /^[0-9a-f]{64}$/);
  assert.equal(audit.analysis.length, 3);
  assert.equal(currentStates(opts.ledgerDir)[0].status, 'DONE');
  assert.equal(readFileSync(`${srcDir}/out/${ID}.json`, 'utf8'), before, '入力ファイルは書き換えない');
});

test('同じ入力の再実行は何も変えない（台帳にも足さない）。入力が変わった時だけ作り直す', async () => {
  const { write, opts } = setup();
  write(fixture());
  await importCases(opts, deps());
  const dir = `${opts.dataDir}/case-import/${ID}`;
  const first = readFileSync(`${dir}/import.json`, 'utf8');
  const [again] = await importCases(opts, deps());
  assert.equal(again.result, 'SKIPPED_SAME_INPUT');
  assert.equal(readFileSync(`${dir}/import.json`, 'utf8'), first);
  assert.equal(readCaseRecords(ID, opts.ledgerDir).length, 1);
  // followUps だけが変わっても指紋は変わらない
  write(fixture({ followUps: ['別の確認'] }));
  assert.equal((await importCases(opts, deps()))[0].result, 'SKIPPED_SAME_INPUT');
  // 本文が変われば新しい指紋で取り込み直す
  const changed = fixture();
  changed.reader.facts = [{ ...(changed.reader.facts[0] as object), text: '月額29ドルの購読を売る小さな店。有料客は約350人で、年払いもある。' }, changed.reader.facts[1]];
  write(changed);
  const [next] = await importCases(opts, deps());
  assert.equal(next.result, 'IMPORTED');
  const recs = readCaseRecords(ID, opts.ledgerDir);
  assert.equal(recs.length, 2);
  assert.notEqual(recs[0].inputHash, recs[1].inputHash);
  assert.equal(recs[1].ruleVersion, IMPORT_RULE_VERSION);
});

test('READY 以外は通さず、台帳に理由つきの保留を1回だけ残す（再実行で増えない）', async () => {
  const { write, opts } = setup();
  write(fixture({ status: 'INCOMPLETE', incompleteReasons: ['最初の客が未調査'] }));
  const [a] = await importCases(opts, deps());
  const [b] = await importCases(opts, deps());
  assert.equal(a.result, 'HELD');
  assert.equal(b.result, 'HELD');
  assert.equal(existsSync(`${opts.dataDir}/case-import/${ID}`), false);
  const recs = readCaseRecords(ID, opts.ledgerDir);
  assert.equal(recs.length, 1);
  assert.equal(recs[0].status, 'HOLD');
  assert.equal(recs[0].reasonCode, 'THIN');
  assert.match(recs[0].reasonText ?? '', /最初の客が未調査/);
});

test('品質検査（門）に落ちたら取り込まない。門が呼べない時は記録のみで通す', async () => {
  const { write, opts } = setup();
  write(fixture());
  const [held] = await importCases(opts, deps({ gate: () => ({ available: true, errors: [{ code: 'LEAD', where: 'lead', detail: '製品説明' }] }) }));
  assert.equal(held.result, 'HELD');
  assert.equal(held.result === 'HELD' && held.reasonCode, 'LEAD_NOT_PASSED');
  assert.equal(existsSync(`${opts.dataDir}/case-import/${ID}`), false);
  const [ok] = await importCases(opts, deps({ gate: () => ({ available: false, errors: [] }) }));
  assert.equal(ok.result, 'IMPORTED');
  assert.match(readJson(`${opts.dataDir}/case-import/${ID}/import.json`).gate, /NOT_RUN/);
  // 実際の check-case.mjs が無い場所を指す門は available:false
  assert.equal((await makeCheckCaseGate(`${opts.srcDir}/nowhere/data/case-rebuild`)(fixture())).available, false);
});

test('reader の形が不正な READY は取り込まず保留。出力ファイルが無い id も保留', async () => {
  const { write, opts } = setup();
  const bad = fixture();
  bad.reader.facts = [{ id: 'f1', kind: 'NOPE', text: 'x', sourceId: 's1', attribution: 'OFFICIAL' }];
  write(bad);
  const [r] = await importCases({ ...opts, ids: [ID, 'ent_fixture_missing'] }, deps());
  assert.equal(r.result, 'HELD');
  assert.equal(convertCase(bad).ok, false);
  const all = await importCases({ ...opts, ids: ['ent_fixture_missing'] }, deps());
  assert.equal(all[0].result, 'HELD');
});

test('入力指紋は変換に効く欄だけで決まる', () => {
  assert.equal(importFingerprint(fixture()), importFingerprint(fixture({ followUps: ['x'], removedPlaceholders: [] })));
  assert.notEqual(importFingerprint(fixture()), importFingerprint(fixture({ lead: '別のリード' })));
});

test('意味を変えない形式のずれだけ機械で直し、記録に残す。式欄が説明だけの項目は ESTIMATE にしない', () => {
  const out = fixture();
  out.reader.metrics = [
    ...out.reader.metrics,
    { id: 'm2', measure: 'USERS', periodKind: 'POINT', period: '2025', amount: 650000, currency: '人', origin: 'SELF_REPORTED', sourceId: 's1' },
    { id: 'm3', measure: 'USERS', periodKind: 'POINT', period: '2026', amount: 700000, currency: '', origin: 'SELF_REPORTED', sourceId: 's1' },
  ];
  out.reader.analysis = [{ item: 'BUSINESS_MODEL', text: '月額29ドルの購読を売る。', basis: ['f1'], formula: '公式ページの表示額をそのまま載せた' }];
  const r = convertCase(out);
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.deepEqual(r.value.repairs.map((x) => [x.where, x.to]), [['metrics.m2.currency', 'unit'], ['metrics.m3.currency', '(外した)']]);
  assert.equal(r.value.reader.metrics[1].unit, '人');
  assert.equal(r.value.reader.metrics[1].currency, undefined);
  assert.equal(r.value.analysis[0].presentation, 'FACT_SUMMARY');
  assert.equal(r.value.analysis[0].formula, '公式ページの表示額をそのまま載せた');
});

test('year だけの statedAt など、直すと意味を作ってしまう形式のずれは取り込まず保留', () => {
  const out = fixture();
  (out.reader.facts[0] as { statedAt?: string }).statedAt = '2023';
  const r = convertCase(out);
  assert.equal(r.ok, false);
});
