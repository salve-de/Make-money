import { existsSync, readdirSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import nextEnv from '@next/env';
import { scanWorkerArtifact } from './check-worker-secrets.mjs';

const { loadEnvConfig } = nextEnv;
const root = process.cwd();
const workerArgs = process.argv.slice(2).filter((argument) => argument !== '--');
const safeBuildEnv = /^(NEXT_PUBLIC_|FIREBASE_PROJECT_ID$)/;
const sensitiveEnv = /(SECRET|TOKEN|PASSWORD|ACCESS_KEY|PRIVATE_KEY|API_KEY)/i;

const loaded = loadEnvConfig(root, false);
const combinedEnv = loaded.combinedEnv || process.env;
const fileKeys = new Set(Object.keys(loaded.parsedEnv || {}));
const envFiles = readdirSync(root)
  .filter((name) => name.startsWith('.env') && name !== '.env.example' && !name.includes('codex-workers-backup'))
  .map((name) => join(root, name))
  .filter(existsSync);
const backups = [];

for (const path of envFiles) {
  const backup = `${path}.codex-workers-backup-${process.pid}`;
  renameSync(path, backup);
  backups.push({ path, backup });
}

let exitCode = 1;
try {
  const childEnv = { ...process.env };
  for (const key of fileKeys) delete childEnv[key];
  for (const [key, value] of Object.entries(combinedEnv)) {
    if (safeBuildEnv.test(key) && typeof value === 'string') childEnv[key] = value;
  }
  for (const key of Object.keys(childEnv)) {
    if (sensitiveEnv.test(key) && !key.startsWith('NEXT_PUBLIC_')) delete childEnv[key];
  }

  const command = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
  const result = spawnSync(command, ['exec', 'opennextjs-cloudflare', 'build', ...workerArgs], {
    cwd: root,
    env: childEnv,
    stdio: 'inherit',
  });
  exitCode = result.status ?? 1;
} finally {
  for (const { path, backup } of backups.reverse()) renameSync(backup, path);
}

if (exitCode !== 0) process.exit(exitCode);
const result = scanWorkerArtifact();
console.log(`Workers build passed secret scan (${result.files} files; values withheld).`);
