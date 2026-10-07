import assert from 'node:assert/strict';
import test from 'node:test';

import { usageFrom, wantsHelp } from './reader-case/usage';

test('--help と -h は使い方の要求。ほかの引数は違う', () => {
  assert.equal(wantsHelp(['--help']), true);
  assert.equal(wantsHelp(['--id', 'x', '-h']), true);
  assert.equal(wantsHelp(['--dedupe', '--list']), false);
});

test('先頭の説明コメントから使い方の文を取り出す', () => {
  const text = usageFrom('/**\n * 画面の層を作る。\n *\n *   pnpm display:build --list\n */\nimport x from "y";');
  assert.ok(text.includes('画面の層を作る。'));
  assert.ok(text.includes('pnpm display:build --list'));
  assert.ok(!text.includes('import'));
});
