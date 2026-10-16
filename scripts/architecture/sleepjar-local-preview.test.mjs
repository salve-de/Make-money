import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import test from 'node:test';

test('Sleep Jar can be opened in a local Make-Money preview without publishing', { timeout: 180000 }, () => {
  const root = process.cwd();
  const publicFile = resolve(root, 'data/catalog-release.json');
  const snapshot = readFileSync(publicFile);
  const previewDir = resolve(root, '.catalog-release-preview');
  const result = spawnSync(process.execPath, [
    'scripts/case-articles/preview-sleepjar-local.mjs', '--prepare-only',
  ], {
    cwd: root, encoding: 'utf8', timeout: 165000, maxBuffer: 10 * 1024 * 1024,
    env: { ...process.env, CATALOG_RELEASE_DIR: previewDir },
  });
  assert.equal(result.status, 0, [
    'local preview preparation failed',
    result.error?.message ?? '',
    result.stdout?.slice(-3000) ?? '',
    result.stderr?.slice(-3000) ?? '',
  ].join('\n'));
  assert.deepEqual(readFileSync(publicFile), snapshot, 'must not alter the tracked public release');
  const pointerPath = join(previewDir, 'current.json');
  assert.ok(existsSync(pointerPath), 'preview pointer should exist');
  const pointer = JSON.parse(readFileSync(pointerPath, 'utf8'));
  const bytes = readFileSync(join(previewDir, `${pointer.manifestHash}.json.gz`));
  const manifest = JSON.parse(gunzipSync(bytes).toString('utf8'));
  assert.ok(Object.hasOwn(manifest.details, 'ent_sleep_jar_20261014'), 'Sleep Jar must exist in actual UI catalog');
});
