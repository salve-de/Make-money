import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { applyNumberContract, basicFactTextCheck, checkFactEntry, checkMetricEntry, quoteTooLong } from './reader-case/number-contract';
import { normalizeResearchRecord } from './reader-case/add-entity-records';

const good = { numberKind: 'REVENUE', amount: 10000, currency: 'USD', periodKind: 'MONTH', asOf: '2024-03', quote: 'we hit $10K MRR in March 2024', sourceUrl: 'https://example.com/a', checkedAt: '2026-10-07' };

test('種類・時点・引用・出典・取得日が揃った数字は残り、時点は出来事の日付（asOf）になる', () => {
  const r = checkMetricEntry({ ...good, statedAt: '2026-01-13' });
  assert.deepEqual(r.reasons, []);
  assert.equal(r.metric.measure, 'REVENUE');
  assert.equal(r.metric.statedAt, '2024-03'); // 投稿日ではなく出来事の日付
  assert.equal(r.metric.period, '2024-03');
});

test('欠けた項目はそれぞれ理由になる', () => {
  const r = checkMetricEntry({ amount: 5, sourceUrl: 'x' });
  for (const x of ['NO_KIND', 'NO_AS_OF', 'NO_QUOTE', 'NO_SOURCE_URL', 'NO_CHECKED_AT']) assert.ok(r.reasons.includes(x as never), x);
});

test('直接の支払いを「年商」にした数字は、種類と欄名が合わない', () => {
  const r = checkMetricEntry({ ...good, numberKind: 'DIRECT_PAYMENT', measure: 'REVENUE', label: '年商', quote: 'direct payments of $10,000' });
  assert.ok(r.reasons.includes('KIND_MISMATCH'));
  const ok = checkMetricEntry({ ...good, numberKind: 'DIRECT_PAYMENT', quote: 'direct payments of $10,000' });
  assert.deepEqual(ok.reasons, []);
  assert.equal(ok.metric.measure, 'OTHER');
  assert.equal(ok.metric.label, '直接の支払い');
});

test('数字が引用に無い・引用が長すぎる', () => {
  assert.ok(checkMetricEntry({ ...good, amount: 20000 }).reasons.includes('AMOUNT_NOT_IN_QUOTE'));
  assert.ok(quoteTooLong('one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen'));
  assert.ok(!quoteTooLong('月商は100万円を超えた'));
});

test('どの事実も引用・出典・取得日が要り、数を含む事実は種類と時点も要る', () => {
  const base = { sourceUrl: 'https://e.com', checkedAt: '2026-10-07' };
  assert.deepEqual(checkFactEntry({ ...base, text: '2016年に創業した。', quote: 'I founded it in 2016' }).reasons, []);
  assert.ok(checkFactEntry({ ...base, text: '2016年に創業した。' }).reasons.includes('NO_QUOTE'));
  assert.ok(checkFactEntry({ ...base, text: '料金は月24ドルから。', quote: 'plans start at $24/mo' }).reasons.includes('NO_KIND'));
  assert.ok(checkFactEntry({ ...base, text: '料金は月24ドルから。', numberKind: 'PRICE', asOf: '2017-06', quote: '24' }).reasons.includes('QUOTE_TOO_SHORT'));
  assert.deepEqual(checkFactEntry({ ...base, text: '料金は月24ドルから。', numberKind: 'PRICE', asOf: '2017-06', quote: 'plans start at $24/mo' }).reasons, []);
  assert.ok(checkFactEntry({ ...base, text: '年商は5万ドル。', numberKind: 'DIRECT_PAYMENT', asOf: '2024', quote: 'direct payments of $50,000' }).reasons.includes('KIND_MISMATCH'));
});

test('事実の文の検査（差し込み式）: 程度の語・英語のままの文は差し戻す', () => {
  const base = { sourceUrl: 'https://e.com', checkedAt: '2026-10-07', quote: 'readers from Cool Tools paid' };
  const bad = checkFactEntry({ ...base, text: 'Cool Tools経由はよく払い、Reddit経由はほぼ払わなかった。' }, [basicFactTextCheck]);
  assert.ok(bad.reasons.includes('TEXT_UNCLEAR'));
  assert.ok(bad.detail.some((d) => d.includes('よく')));
  const good = checkFactEntry({ ...base, text: 'Cool Toolsから来た読者は払う人が多く、Redditから来た読者は払う人がほとんどいなかった。人数は出典に無い。' }, [basicFactTextCheck]);
  assert.deepEqual(good.reasons, []);
  assert.ok(checkFactEntry({ ...base, text: 'Readers paid a lot.' }, [basicFactTextCheck]).reasons.includes('TEXT_UNCLEAR'));
  const plug = checkFactEntry({ ...base, text: '創業した。' }, [() => ['差し込んだ検査の理由']]);
  assert.deepEqual(plug.detail, ['差し込んだ検査の理由']);
});

test('通らない数字だけを分けて残し、事例は止めない。推定は事実の欄から移す。0で埋めない', () => {
  const rec: Record<string, unknown> = {
    facts: [{ kind: 'FOUNDING', text: '2019年に創業した。', sourceUrl: 'https://e.com/a', quote: 'we started in 2019', checkedAt: '2026-10-07' }, { kind: 'OTHER', text: '年商は50万ドル。', sourceUrl: 'https://e.com/a' }],
    metrics: [good, { ...good, amount: 3 }, { numberKind: 'ESTIMATE', amount: 1 }],
    reaudit: { sources: [{ url: 'https://example.com/a' }] },
  };
  const { unconfirmed } = applyNumberContract(rec);
  assert.equal((rec.metrics as unknown[]).length, 1);
  assert.equal((rec.facts as unknown[]).length, 1);
  assert.equal(unconfirmed.length, 2);
  assert.equal((rec.estimatesFromResearch as unknown[]).length, 1);
  assert.ok(!JSON.stringify(rec.metrics).includes('"amount":0'));
});

test('同じ種類・同じ時点で食い違う数字は、区別が無ければ両方分け、basis があれば残す', () => {
  const a = { ...good, quote: 'we hit $10K MRR', amount: 10000 };
  const b = { ...good, quote: 'MRR reached $12K', amount: 12000 };
  const rec: Record<string, unknown> = { metrics: [a, b] };
  applyNumberContract(rec);
  assert.equal((rec.metrics as unknown[]).length, 0);
  const rec2: Record<string, unknown> = { metrics: [a, { ...b, basis: 'App Store 分を含む' }] };
  applyNumberContract(rec2);
  assert.equal((rec2.metrics as unknown[]).length, 2);
});

test('見本（keygen.example.json）は数字を1つも分けずに通る', () => {
  const [rec] = JSON.parse(readFileSync('docs/research-record/keygen.example.json', 'utf8')) as Record<string, unknown>[];
  const { record } = normalizeResearchRecord(rec);
  assert.equal(record.unconfirmedFacts, undefined);
  assert.equal((record.facts as unknown[]).length, 6);
  assert.equal((record.metrics as unknown[]).length, 1);
});
