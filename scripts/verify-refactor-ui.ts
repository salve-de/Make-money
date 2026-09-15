import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

const base = process.env.VISUAL_BASE_URL;
const head = process.env.VISUAL_HEAD_URL;
const baseSha = process.env.VISUAL_BASE_SHA;
const headSha = process.env.VISUAL_HEAD_SHA;
const artifacts = resolve(process.env.VISUAL_ARTIFACT_DIR || 'test-results/refactor-visual');
if (!base || !head || base === head || !baseSha || !headSha) {
  throw new Error('Provide distinct VISUAL_BASE_URL / VISUAL_HEAD_URL and explicit source SHAs. HEAD is never used to create its own baseline.');
}
for (const url of [base, head]) {
  if (!['localhost', '127.0.0.1', '[::1]'].includes(new URL(url).hostname)) throw new Error('Visual verification only connects to isolated local servers');
}
mkdirSync(artifacts, { recursive: true });
const manifest = {
  baseSha, headSha, base, head,
  baselinePreparation: 'Original PR base plus documented type-compatibility repairs; baseline.patch is retained as an artifact.',
  dataSha256: createHash('sha256').update(readFileSync('data/entities-index.json')).digest('hex'),
  policy: { maxDiffPixels: 0, threshold: 0, retries: 0, headSnapshotUpdates: 'none' },
};
writeFileSync(resolve(artifacts, 'manifest.json'), JSON.stringify(manifest, null, 2));
for (const [phase, url, update] of [['base', base, 'all'], ['head', head, 'none']] as const) {
  console.log(`VISUAL_PHASE=${phase} SOURCE_SHA=${phase === 'base' ? baseSha : headSha}`);
  execFileSync('pnpm', ['exec', 'playwright', 'test', '-c', 'verification/visual/playwright.config.ts', `--update-snapshots=${update}`], {
    stdio: 'inherit', env: { ...process.env, VISUAL_ARTIFACT_DIR: artifacts, VISUAL_TARGET_URL: url, VISUAL_PHASE: phase },
  });
}
console.log('PASS: all configured BASE-to-HEAD visual comparisons passed with zero differing pixels.');
