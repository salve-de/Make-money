import { strict as assert } from 'node:assert';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { test } from 'node:test';
import type { ReaderCase } from '../src/shared/reader-case';
import { appendRecord } from './reader-case/ledger';
import { IMPORT_ACTOR } from './reader-case/import-case-rebuild';
import { contentProblems, withoutItems, reflectCases, reflectHoldReasons, reflectedReader, withReflectedAnalysis, withdrawalsFor, type ReleaseGate } from './reader-case/case-reflect';
import { diagnose, stageOf } from './reader-case/display-diagnose';
import { collect, mergeInto, sourceCards } from './reader-case/add-entity-records';
import { touchedCases } from './reader-case/merge-verdicts';
import { displayCoverage, displayMinimumProblems } from '../src/shared/display-contract';

// 実データは使わない。fixture だけ（一時ディレクトリに書く）
const ID = 'ent_fixture_000000000001';
const reader = (over: Partial<ReaderCase> = {}): ReaderCase => ({
  sources: [{ id: 's1', publisher: '運営者', url: 'https://example.test/about', checkedAt: '2026-10-06', kind: 'OFFICIAL' }],
  facts: [
    { id: 'f1', kind: 'DESCRIPTION', text: '月額29ドルの購読を売る小さな店。有料客は約350人。', sourceId: 's1', attribution: 'OFFICIAL' },
    { id: 'f2', kind: 'EVENT', text: '2024年に店を畳み、2025年に作り直した。', sourceId: 's1', attribution: 'OFFICIAL' },
  ],
  metrics: [{ id: 'm1', measure: 'REVENUE', periodKind: 'MONTH', period: '2025-05', amount: 10150, currency: 'USD', origin: 'SELF_REPORTED', sourceId: 's1' }],
  unknowns: [],
  analysis: [{ id: 'a1', item: 'HEADLINE', text: '店を2024年に畳んだ創業者が、翌2025年に作り直して月10,150ドルを売った。', basis: ['f2', 'm1'] }],
  ...over,
} as ReaderCase);

const setup = () => {
  const root = mkdtempSync(`${tmpdir()}/case-reflect-`);
  const dataDir = `${root}/data`;
  const ledgerDir = `${root}/ledger`;
  mkdirSync(`${dataDir}/case-import/${ID}`, { recursive: true });
  const put = (r: ReaderCase, inputHash: string) => {
    const dir = `${dataDir}/case-import/${ID}`;
    const { analysis, ...rest } = r;
    writeFileSync(`${dir}/reader.json`, JSON.stringify(rest));
    writeFileSync(`${dir}/analysis.json`, JSON.stringify(analysis));
    writeFileSync(`${dir}/import.json`, JSON.stringify({ id: ID, inputHash }));
    appendRecord({ caseId: ID, stage: 'ANALYZE', status: 'DONE', actor: IMPORT_ACTOR, inputHash, finishedAt: '2026-10-06T00:00:00Z' }, ledgerDir);
  };
  return { root, dataDir, ledgerDir, put };
};
const pass: ReleaseGate = async () => ({ publishable: true, reasons: [] });
const fail: ReleaseGate = async () => ({ publishable: false, reasons: ['現在の入力に対する監査が無い'] });

test('取り込み版が基準と関門に通れば SHOW、同じ入力の再実行では何も書かない', async () => {
  const { dataDir, ledgerDir, put } = setup();
  put(reader(), 'h1');
  const first = await reflectCases({ dataDir, ledgerDir }, pass);
  assert.deepEqual(first.outcomes.map((o) => [o.result, o.state]), [['NEW', 'SHOW']]);
  const before = readFileSync(`${dataDir}/case-reflect.json`, 'utf8');
  const again = await reflectCases({ dataDir, ledgerDir, now: new Date('2030-01-01') }, pass);
  assert.equal(again.changed, false);
  assert.equal(readFileSync(`${dataDir}/case-reflect.json`, 'utf8'), before);
  assert.equal(existsSync(`${dataDir}/case-reflect-history.jsonl`), false);
});

test('入力が変わると置き換え、旧い記録は履歴に1行残る', async () => {
  const { dataDir, ledgerDir, put } = setup();
  put(reader(), 'h1');
  await reflectCases({ dataDir, ledgerDir }, pass);
  put(reader({ facts: [...reader().facts, { id: 'f3', kind: 'TEAM', text: '運営は1人。', sourceId: 's1', attribution: 'OFFICIAL' }] } as Partial<ReaderCase>), 'h2');
  const second = await reflectCases({ dataDir, ledgerDir }, pass);
  assert.equal(second.outcomes[0].result, 'REPLACED');
  const history = readFileSync(`${dataDir}/case-reflect-history.jsonl`, 'utf8').trim().split('\n');
  assert.equal(history.length, 1);
  assert.equal(JSON.parse(history[0]).importHash, 'h1');
  assert.equal(second.state.cases[ID].importHash, 'h2');
});

test('取り込みが保留なら旧版も出さない（reader なし → null）', async () => {
  const { dataDir, ledgerDir, put } = setup();
  put(reader(), 'h1');
  appendRecord({ caseId: ID, stage: 'ANALYZE', status: 'HOLD', reasonCode: 'LEAD_NOT_PASSED', reasonText: 'x', actor: IMPORT_ACTOR, inputHash: 'h2', finishedAt: '2026-10-06T00:00:00Z' }, ledgerDir);
  const { state } = await reflectCases({ dataDir, ledgerDir }, pass);
  assert.equal(state.cases[ID].stage, 'IMPORT');
  assert.equal(reflectedReader(state, ID), null);
  assert.deepEqual(withReflectedAnalysis({ [ID]: [] }, state), {});
  assert.deepEqual(withdrawalsFor(state, [ID, 'ent_other']), [ID]);
});

test('関門に落ちた版は reader を持つが表示しない（照合・審査の対象にはなる）', async () => {
  const { dataDir, ledgerDir, put } = setup();
  put(reader(), 'h1');
  const { state } = await reflectCases({ dataDir, ledgerDir }, fail);
  assert.equal(state.cases[ID].state, 'HOLD');
  assert.ok(reflectedReader(state, ID));
  assert.deepEqual(reflectHoldReasons(state, ID), ['現在の入力に対する監査が無い']);
});

test('中身の基準: 仮置きの語の項目は外すだけ、範囲のリードは書き直しへ、出典なしは止める', () => {
  assert.deepEqual(contentProblems(reader()), []);
  const placeholder = reader({ analysis: [...reader().analysis, { id: 'a2', item: 'TAKE_HOME', text: '費用を仮置きで月$2,000とする。', basis: ['m1'] }] } as Partial<ReaderCase>);
  const stripped = withoutItems(placeholder, { placeholders: true });
  assert.deepEqual(stripped.hidden, ['推論:TAKE_HOME']);
  assert.deepEqual(contentProblems(stripped.reader), []);
  const range = reader({ analysis: [{ id: 'a1', item: 'HEADLINE', text: '月99〜149ドルの購読で店を作り直した。', basis: ['f2'] }] } as Partial<ReaderCase>);
  assert.ok(contentProblems(range).some((p) => p.startsWith('リードを書き直す:リード基準外')));
  assert.equal(stageOf(contentProblems(range)[0]), 'LEAD');
});

test('使えない出典は、その出典と根拠にする項目だけ外して出す（事例全体を止めない）', async () => {
  const { dataDir, ledgerDir, put } = setup();
  const two = reader({ sources: [...reader().sources, { id: 's2', publisher: '紹介サイト', url: 'https://other.test/a', checkedAt: '2026-10-06', kind: 'ARTICLE' }],
    facts: [...reader().facts, { id: 'f3', kind: 'TEAM', text: '運営は1人。', sourceId: 's2', attribution: 'ARTICLE' }],
    analysis: [...reader().analysis, { id: 'a3', item: 'CAPITAL_AND_TEAM', text: '運営は1人で回している。', basis: ['f3'] }] } as Partial<ReaderCase>);
  put(two, 'h1');
  const gate: ReleaseGate = async (_id, r) => (r.sources.some((x) => x.id === 's2') ? { publishable: false, reasons: ['利用条件:s2'] } : { publishable: true, reasons: [] });
  const { state } = await reflectCases({ dataDir, ledgerDir }, gate);
  assert.equal(state.cases[ID].state, 'SHOW', JSON.stringify(state.cases[ID].reasons));
  assert.deepEqual(state.cases[ID].hidden, ['出典:s2:https://other.test/a', '事実:f3', '推論:CAPITAL_AND_TEAM']);
  const d = diagnose(state.cases[ID], reader(), true, { officialUrl: 'https://example.test/' });
  assert.deepEqual(d.categories, []);
  assert.ok(d.hidden.alternatives.some((a) => a.includes('https://example.test/')));
});

test('手で書き換えた SHOW 記録は指紋が合わず出さない', async () => {
  const { dataDir, ledgerDir, put } = setup();
  put(reader(), 'h1');
  const { state } = await reflectCases({ dataDir, ledgerDir }, pass);
  state.cases[ID].reader = { ...state.cases[ID].reader!, sources: [{ ...state.cases[ID].reader!.sources[0], publisher: '書き換え' }] };
  assert.ok(reflectHoldReasons(state, ID)?.some((r) => r.includes('指紋')));
});

test('診断: 照合待ちの空欄は収集のせいにしない、表示契約の空きは収集側へ返す', () => {
  const entry = { id: ID, state: 'HOLD' as const, stage: 'RELEASE' as const, reasons: ['照合済みの事実が無い', '空欄:STORY', '現在の入力に対する監査が無い'], importHash: 'h1', ruleVersion: 'x', hash: 'y', reflectedAt: 'z' };
  const d = diagnose(entry, reader(), false);
  assert.equal(d.blockers.COLLECT, undefined);
  assert.deepEqual(Object.keys(d.blockers).sort(), ['AUDIT', 'IMAGE', 'VERIFY']);
  assert.ok(d.contract.missing.some((m) => m.key === 'VIABILITY'));
  assert.ok(d.collector.some((c) => c.startsWith('今の有効性')));
  assert.equal(stageOf('リード基準外:number-range'), 'COLLECT');
  assert.equal(stageOf('出典本文:s1'), 'FETCH');
});

test('表示契約: 誰が何をいくらでは、説明と料金の両方が要る', () => {
  assert.ok(displayCoverage(reader()).missing.includes('WHO_WHAT_PRICE'));
  const priced = reader({ facts: [...reader().facts, { id: 'f9', kind: 'PRICING', text: '月額29ドル。', sourceId: 's1', attribution: 'OFFICIAL' }] } as Partial<ReaderCase>);
  assert.ok(displayCoverage(priced).filled.includes('WHO_WHAT_PRICE'));
});

test('目録への追加: 指紋を確かめ、既存の id・公式サイトとは重ねず、審査待ちの印を付ける', () => {
  const root = mkdtempSync(`${tmpdir()}/add-entity-`);
  const zeroOps = { automationLevel: 0, initialCapitalRequired: 0, isAutomationUnconfirmed: true, isCapitalUnconfirmed: true, isTeamSizeUnconfirmed: true, isWeeklyHoursUnconfirmed: true, primaryChannels: [], teamSize: 0, toolStack: [], weeklyHours: 0 };
  const zeroPnl = { cogs: 0, estimatedAnnualNetProfit: 0, financialStatus: 'UNAVAILABLE', grossMargin: 0, grossProfit: 0, isCogsUnconfirmed: true, isCostsUnconfirmed: true, isGrossMarginUnconfirmed: true, isGrossProfitUnconfirmed: true, isMarginUnconfirmed: true, isNetProfitUnconfirmed: true, isOperatingProfitUnconfirmed: true, isRevenueUnconfirmed: true, monthlyRevenue: 0, operatingExpenses: { advertising: 0, other: 0, serverAndApi: 0, subcontracting: 0, toolsAndSaaS: 0 }, operatingMargin: 0, operatingProfit: 0, sourceDoc: 'https://new.example/ — 財務資料未取得。' };
  const record = { aliases: [], architecturePattern: '', country: '', founder: '', growthRateYoY: 0, id: 'ent_new_1', isGrowthUnconfirmed: true, name: 'New', operations: zeroOps, pipelineStack: '', pnl: zeroPnl,
    publishability: 'PARTIAL', scale: 'UNKNOWN', sector: 'UNKNOWN', strategy: { actionPlaybook: [], blindspot: '', initialTraction: [], moatDescription: '', moatType: 'UNKNOWN' },
    tagline: 'テスト用の事例。', tags: [], targetPainWallet: '', ticker: '', url: 'https://new.example/', verifiedBadge: false, reader: { old: true } };
  const json = JSON.stringify(record);
  const hash = createHash('sha256').update(json).digest('hex');
  mkdirSync(`${root}/art`);
  writeFileSync(`${root}/art/${hash}.json.gz`, gzipSync(json));
  writeFileSync(`${root}/m.json`, JSON.stringify({ details: { ent_new_1: hash } }));
  mkdirSync(`${root}/packs`);
  writeFileSync(`${root}/packs/ent_new_1.json`, JSON.stringify({ sources: [{ id: 's1', kind: 'OFFICIAL', publisher: 'New', url: 'https://new.example/' }] }));
  const file = collect(`${root}/m.json`, `${root}/art`, ['ent_new_1'], new Date('2026-10-06'), `${root}/packs`);
  const added = file.records[0].record;
  assert.equal('reader' in added, false);
  assert.deepEqual(added.tags, ['収集事例']);
  assert.equal((added.evidenceCards as unknown[]).length, 1);
  const merged = mergeInto([{ id: 'ent_old', url: 'https://www.new.example/' }], [file]);
  assert.deepEqual(merged.added, []);
  assert.match(merged.skipped[0].reason, /公式サイト/);
  // 既存の記録の URL が記事などのページ（パスあり）なら、その事業の公式サイトではないので重ならない
  assert.deepEqual(mergeInto([{ id: 'ent_old', url: 'https://www.new.example/x' }], [file]).added, ['ent_new_1']);
  assert.deepEqual(mergeInto([], [file]).added, ['ent_new_1']);
  assert.equal(sourceCards('x', [{ id: 's1', url: 'ftp://bad' }]).length, 0);
  writeFileSync(`${root}/art/${hash}.json.gz`, gzipSync(`${json} `));
  assert.throws(() => collect(`${root}/m.json`, `${root}/art`, ['ent_new_1']), /指紋/);
});

test('表示の下限: 1項目の欠け（料金など）では止めず、本文の節が足りない時だけ「全体が薄い」', () => {
  const thin = displayMinimumProblems(reader({ facts: [reader().facts[0]], metrics: [], analysis: [{ id: 'a1', item: 'HEADLINE', text: '月額29ドルの購読を売る小さな店。', basis: ['f1'] }] } as Partial<ReaderCase>));
  assert.ok(!thin.some((p) => p.includes('WHO_WHAT_PRICE')));
  assert.ok(thin.some((p) => p.startsWith('全体が薄い:本文の節が')));
  assert.equal(stageOf(thin.find((p) => p.startsWith('全体が薄い'))!), 'THIN');
  assert.equal(stageOf('利用条件:s1'), 'RIGHTS');
});

test('関門が審査で直した推論を返せば、それを表示版に採用する', async () => {
  const { dataDir, ledgerDir, put } = setup();
  put(reader(), 'h1');
  const fixed = [{ id: 'a1', item: 'HEADLINE', text: '店を2024年に畳んだ創業者が、2025年に作り直して月10,150ドルを売った。', basis: ['f2', 'm1'] }];
  const approve: ReleaseGate = async () => ({ publishable: true, reasons: [], analysis: fixed as never });
  const { state } = await reflectCases({ dataDir, ledgerDir }, approve);
  assert.equal(state.cases[ID].state, 'SHOW');
  assert.deepEqual(reflectedReader(state, ID)?.analysis, fixed);
  assert.deepEqual(reflectHoldReasons(state, ID), []);
  // 審査の入力と合流には取り込み版の推論を返す（受領書の入力指紋を毎回同じにする）
  assert.deepEqual(withReflectedAnalysis({}, state, 'audit')[ID], reader().analysis);
  assert.deepEqual(withReflectedAnalysis({}, state)[ID], fixed);
  const again = await reflectCases({ dataDir, ledgerDir }, approve);
  assert.equal(again.changed, false);
});

test('取り込み出力が手元に無くても、反映記録の取り込み版から作り直し、新しい受領書の審査済みの推論を届ける', async () => {
  const { dataDir, ledgerDir, put } = setup();
  put(reader(), 'h1');
  const v1 = [{ id: 'a1', item: 'HEADLINE', text: '店を2024年に畳んだ創業者が、2025年に作り直して月10,150ドルを売った。', basis: ['f2', 'm1'] }];
  await reflectCases({ dataDir, ledgerDir }, async () => ({ publishable: true, reasons: [], analysis: v1 as never }));
  // 出典の訂正と監査のあと: 取り込み出力は無く、受領書は新しい審査済みの推論を指す
  rmSync(`${dataDir}/case-import`, { recursive: true });
  const v2 = [{ id: 'a1', item: 'HEADLINE', text: '店を2024年に畳んだ創業者が、2025年に作り直して月10,150ドルを売った（本人の申告）。', basis: ['f2', 'm1'] }];
  const seen: unknown[] = [];
  const gate: ReleaseGate = async (_id, r) => { seen.push(r.analysis); return { publishable: true, reasons: [], analysis: v2 as never }; };
  const second = await reflectCases({ dataDir, ledgerDir }, gate);
  assert.equal(second.outcomes[0].result, 'REPLACED');
  assert.deepEqual(reflectedReader(second.state, ID)?.analysis, v2);
  // 関門に渡すのは取り込み版の推論（審査の入力）のまま。審査していない版は関門が通さない
  assert.deepEqual(seen[0], reader().analysis);
  assert.deepEqual(withReflectedAnalysis({}, second.state, 'audit')[ID], reader().analysis);
  // 受領書が審査していなければ（関門が通さなければ）SHOW にならず、旧い承認の推論も残らない
  const third = await reflectCases({ dataDir, ledgerDir }, fail);
  assert.equal(third.state.cases[ID].state, 'HOLD');
  assert.equal(third.state.cases[ID].approvedAnalysis, undefined);
});

test('照合の合流: 判定の無い事例は置き換えない（--ids なしでも既存の判定が減らない）', () => {
  const touched = touchedCases([`${ID}\u0000f1`], [`ent_other\u0000f2`]);
  assert.deepEqual([...touched].sort(), [ID, 'ent_other'].sort());
  assert.equal(touched.has('ent_untouched'), false);
});
