import assert from 'node:assert/strict';
import { test } from 'node:test';
import { StallError, run, withStallRetry } from '../agent-call';

const SILENT = ['-e', 'setTimeout(() => {}, 60000)'];

test('出力も CPU の動きも無い子は、固まったとみなして止める', async () => {
  const t0 = Date.now();
  const r = await run(process.execPath, SILENT, '', process.cwd(), { timeoutMs: 30_000, idleMs: 600, pollMs: 100 });
  assert.equal(r.stalled, true);
  assert.ok(Date.now() - t0 < 10_000);
});

test('入力を閉じるので、標準入力を読み続ける子も入力の終わりで終われる', async () => {
  const r = await run(process.execPath, ['-e', "process.stdin.on('data',()=>{}).on('end',()=>console.log('closed'))"], 'x', process.cwd(), { timeoutMs: 30_000, idleMs: 5_000, pollMs: 100 });
  assert.equal(r.stalled, false);
  assert.match(r.stdout, /closed/);
});

test('出力が続いている間は固まったとみなさない', async () => {
  const r = await run(process.execPath, ['-e', 'let n=0;const t=setInterval(()=>{console.log(n++);if(n>8){clearInterval(t)}},150)'], '', process.cwd(), { timeoutMs: 30_000, idleMs: 600, pollMs: 100 });
  assert.equal(r.stalled, false);
  assert.equal(r.status, 0);
});

test('固まったら1回だけやり直し、2回目で通ればそれを返す', async () => {
  let n = 0;
  const v = await withStallRetry(async () => { n++; if (n === 1) throw new StallError('固まった'); return 'ok'; });
  assert.equal(v, 'ok');
  assert.equal(n, 2);
});

test('やり直しても固まれば StallError で失敗し、固まり以外の失敗はやり直さない', async () => {
  let n = 0;
  await assert.rejects(withStallRetry(async () => { n++; throw new StallError('固まった'); }), StallError);
  assert.equal(n, 2);
  let m = 0;
  await assert.rejects(withStallRetry(async () => { m++; throw new Error('別の失敗'); }), /別の失敗/);
  assert.equal(m, 1);
});
