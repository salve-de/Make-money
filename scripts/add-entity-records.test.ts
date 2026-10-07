import { strict as assert } from 'node:assert';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { collectFromResearch, REVIEW_TAG } from './reader-case/add-entity-records';

test('公式サイトが無い事例も、url を空文字にして足す（URL の有無で収集を絞らない）', () => {
  const index = JSON.parse(readFileSync('data/entities-index.json', 'utf8')) as Array<Record<string, unknown>>;
  const base = index.find((e) => e.url === '' && /^ent_[\w-]+$/.test(String(e.id)));
  assert.ok(base, '目録に url が空の記録がある');
  const { url: _url, ...record } = base;
  void _url;
  const file = join(mkdtempSync(join(tmpdir(), 'research-')), 'research.json');
  writeFileSync(file, JSON.stringify([record]));
  const added = collectFromResearch(file);
  assert.equal(added.records.length, 1);
  assert.equal(added.records[0].record.url, '');
  assert.ok((added.records[0].record.tags as string[]).includes(REVIEW_TAG));
});
