import assert from 'node:assert/strict';
import test from 'node:test';
import { EXIT_UNVERIFIABLE, journalPrefixes, judgeJournalAge, judgeRelease, parseArgs, run } from './check-freshness.mjs';

const now = new Date('2026-10-06T12:00:00Z');

test('引数の既定値と検査', () => {
  assert.deepEqual(parseArgs([]).maxAgeHours, 30);
  assert.equal(parseArgs(['--json', '--days', '2']).days, 2);
  assert.throws(() => parseArgs(['--max-age-hours', '0']));
  assert.throws(() => parseArgs(['--days', '99']));
  assert.throws(() => parseArgs(['--unknown']));
  assert.throws(() => parseArgs(['--site-url', 'ftp://x']));
});

test('journal の日付接頭辞は UTC で遡る（月またぎ）', () => {
  assert.deepEqual(journalPrefixes(new Date('2026-10-01T01:00:00Z'), 3), [
    'journal/v1/2026/10/01/', 'journal/v1/2026/09/30/', 'journal/v1/2026/09/29/',
  ]);
});

test('journal が閾値内なら ok、超えたら problem、0件も problem', () => {
  const fresh = [{ key: 'a', lastModified: new Date('2026-10-06T08:50:00Z') }, { key: 'b', lastModified: new Date('2026-10-05T08:50:00Z') }];
  assert.equal(judgeJournalAge(fresh, now, 30).status, 'ok');
  assert.equal(judgeJournalAge(fresh, now, 30).latest.key, 'a');
  const old = [{ key: 'c', lastModified: new Date('2026-10-04T08:50:00Z') }];
  assert.equal(judgeJournalAge(old, now, 30).status, 'problem');
  assert.equal(judgeJournalAge([], now, 30).status, 'problem');
});

test('公開版の一致判定', () => {
  const hash = 'ab'.repeat(32);
  assert.equal(judgeRelease({ release: 'abababababab' }, hash).status, 'ok');
  assert.equal(judgeRelease({ release: 'cdcdcdcdcdcd' }, hash).status, 'problem');
  assert.equal(judgeRelease({}, hash).status, 'unverifiable');
  assert.equal(judgeRelease(null, hash).status, 'unverifiable');
});

test('鍵が無ければ「確認できない」で終了コード 2。R2 には接続しない', async () => {
  const result = await run([], {}, now);
  assert.equal(result.exitCode, EXIT_UNVERIFIABLE);
  assert.equal(result.checks[0].status, 'unverifiable');
  assert.match(result.checks[0].reason, /確認できない/);
});
