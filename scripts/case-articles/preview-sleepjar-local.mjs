/**
 * Sleep Jar を既存の Make-Money UI で見るためのローカル専用入口。
 * 本番・R2・公開ポインタは一切触らない。審査待ち記事はローカルプレビューにのみ含める。
 *
 * 使い方: pnpm case:preview-sleepjar
 *   追加: pnpm case:preview-sleepjar -- --port 3110
 *   検査: node scripts/case-articles/preview-sleepjar-local.mjs --prepare-only
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { gunzipSync } from 'node:zlib';

const ENTITY_ID = 'ent_sleep_jar_20261014';
const ROOT = process.cwd();
const PREVIEW_DIR = resolve(ROOT, '.catalog-release-preview');
const ARG = process.argv.slice(2).filter((x) => x !== '--');
const portIndex = ARG.indexOf('--port');
const portText = portIndex === -1 ? '3100' : ARG[portIndex + 1];
const PORT = Number(portText);
const prepareOnly = ARG.includes('--prepare-only');
const url = `http://127.0.0.1:${PORT}/?entity=${ENTITY_ID}`;

function die(message) {
  console.error(`[Sleep Jar preview] ${message}`);
  process.exit(1);
}
if (!Number.isInteger(PORT) || PORT < 1024 || PORT > 65535) die('ポート番号は1024〜65535で指定してください');
if (!existsSync(resolve(ROOT, 'package.json')) || !existsSync(resolve(ROOT, 'scripts/prepare-catalog-release.ts'))) {
  die('Make-Moneyリポジトリのルートで実行してください');
}
if (!existsSync(resolve(ROOT, 'data/case-articles', ENTITY_ID, 'article.json'))) {
  die('Sleep Jar の原稿がありません。PR #226 のブランチから実行してください');
}
if (!existsSync(resolve(ROOT, 'node_modules/next/dist/bin/next'))) {
  die('依存関係がありません。先に pnpm install --frozen-lockfile を実行してください');
}

function runNode(stage, script, args = []) {
  console.log(`[Sleep Jar preview] ${stage}`);
  const result = spawnSync(process.execPath, ['--import', 'tsx', script, ...args], {
    cwd: ROOT, stdio: 'inherit',
    // スクリプト実行にクラウドの接続や公開権限は不要。
    env: { ...process.env, CATALOG_RELEASE_DIR: PREVIEW_DIR },
  });
  if (result.status !== 0) die(`${stage}に失敗しました（exit: ${result.status ?? 'unknown'}）`);
}

runNode('原稿と図解を検証', 'scripts/case-articles/build.ts', ['--check']);
runNode('公開ポインタを変更せず、ローカル専用の表示データを作成',
  'scripts/prepare-catalog-release.ts', ['--preview-articles', '--out', PREVIEW_DIR]);

// 事例が準備されたことを目録に対して確認する。無い場合、空のページを開かせない。
const pointerPath = join(PREVIEW_DIR, 'current.json');
if (!existsSync(pointerPath)) die('ローカルプレビューの current.json がありません');
const pointer = JSON.parse(readFileSync(pointerPath, 'utf8'));
if (!/^[a-f0-9]{64}$/.test(pointer.manifestHash ?? '')) die('ローカルプレビューの目録が不正です');
const manifestFile = join(PREVIEW_DIR, `${pointer.manifestHash}.json.gz`);
if (!existsSync(manifestFile)) die('ローカルプレビューの目録ファイルがありません');
const manifest = JSON.parse(gunzipSync(readFileSync(manifestFile)).toString('utf8'));
if (!Object.prototype.hasOwnProperty.call(manifest.details ?? {}, ENTITY_ID)) {
  die('プレビュー目録にSleep Jarがありません。新規事例の身元登録と掲載条件を確認してください');
}

console.log('\n[Sleep Jar preview] Sleep Jar をローカル目録で確認しました');
console.log(`[Sleep Jar preview] URL: ${url}`);
console.log('[Sleep Jar preview] R2・本番・公開状態は変更しません');
if (prepareOnly) process.exit(0);

// pnpm dev の predev は通常目録の準備を行う。ここでは明示的にプレビュー目録を使う。
const child = spawn(process.execPath, [
  resolve(ROOT, 'node_modules/next/dist/bin/next'), 'dev', '--hostname', '127.0.0.1', '--port', String(PORT),
], { cwd: ROOT, stdio: 'inherit', env: { ...process.env, CATALOG_RELEASE_DIR: PREVIEW_DIR } });
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => { if (!child.killed) child.kill(signal); });
}
child.on('error', (error) => die(`Next.jsを起動できません: ${error.message}`));
child.on('exit', (code, signal) => {
  if (signal && signal !== 'SIGINT' && signal !== 'SIGTERM') console.error(`[Sleep Jar preview] signal: ${signal}`);
  process.exitCode = code ?? (signal === 'SIGINT' || signal === 'SIGTERM' ? 0 : 1);
});
