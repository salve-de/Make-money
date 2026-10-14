import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = process.cwd();
const script = resolve(root,'scripts/case-articles/run-case-batch.mjs');
const sample = resolve(root,'fixtures/case-batches/20261014-diverse-cases-v1');
const run = (input) => spawnSync(process.execPath,[script,'--input',input,'--inspect-only'],{encoding:'utf8',cwd:root,timeout:30000});

test('batch manifest, source references and hashes validate without writing tracked data',()=>{
  const before = readFileSync(resolve(root,'data/case-articles.json'));
  const ok = run(sample);
  assert.equal(ok.status,0,ok.stderr);
  assert.match(ok.stdout,/integrity OK/);
  assert.deepEqual(readFileSync(resolve(root,'data/case-articles.json')),before);
});

test('editing one article causes atomic reject before import',()=>{
  const parent=mkdtempSync(join(tmpdir(),'mm-case-batch-'));
  try {
    const dst=join(parent,'case-batch');
    cpSync(sample,dst,{recursive:true});
    const art=join(dst,'cases/ent_scrub_daddy_20261014/article.json');
    writeFileSync(art,readFileSync(art,'utf8').replace('売れなかった','売れた'));
    const res=run(dst);
    assert.notEqual(res.status,0);
    assert.match(res.stderr,/SHA mismatch/);
  } finally { rmSync(parent,{recursive:true,force:true}); }
});
