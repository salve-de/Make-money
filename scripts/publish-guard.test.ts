import assert from 'node:assert/strict';
import { test } from 'node:test';
import { assertPublishPosition, checkPublishPosition } from './publish-guard';

test('本流と同じ位置なら通す。違えば日本語の理由つきで止める。--allow-non-main なら通す', () => {
  assert.equal(checkPublishPosition('abc', 'abc', false).ok, true);
  const bad = checkPublishPosition('abc', 'def', false);
  assert.equal(bad.ok, false);
  assert.match(bad.message ?? '', /本流に統合してから、本流の位置で公開する/);
  assert.equal(checkPublishPosition('abc', 'def', true).ok, true);
});

test('公開の直前に fetch する。fetch が失敗したら止める（終了コード1）', () => {
  const calls: string[][] = [];
  assertPublishPosition(false, (a) => { calls.push(a); return { code: 0, out: 'same' }; });
  assert.deepEqual(calls[0], ['fetch', 'origin', 'main']);
  const orig = process.exit; let code: number | undefined;
  (process as unknown as { exit: (c?: number) => never }).exit = ((c?: number) => { code = c; throw new Error('exit'); }) as never;
  const err = console.error; console.error = () => undefined;
  try {
    assert.throws(() => assertPublishPosition(false, (a) => (a[0] === 'fetch' ? { code: 1, out: '' } : { code: 0, out: 'x' })));
    assert.equal(code, 1);
    code = undefined;
    assert.throws(() => assertPublishPosition(false, (a) => ({ code: 0, out: a[1] === 'HEAD' ? 'a' : 'b' })));
    assert.equal(code, 1);
  } finally { process.exit = orig; console.error = err; }
  assertPublishPosition(true, () => { throw new Error('allow なら git を呼ばない'); });
});
