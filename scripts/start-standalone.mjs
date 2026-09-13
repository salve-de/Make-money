#!/usr/bin/env node

import { access, cp } from 'node:fs/promises';
import { constants } from 'node:fs';
import { spawn } from 'node:child_process';
import { join } from 'node:path';

const root = process.cwd();
const standaloneDir = join(root, '.next', 'standalone');
const serverPath = join(standaloneDir, 'server.js');

async function exists(path) {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

if (!(await exists(serverPath))) {
  throw new Error(`Standalone server is missing: ${serverPath}. Run pnpm build first.`);
}

// Next's standalone output intentionally omits these directories because a
// CDN can serve them. The smoke test is local, so copy them into the traced
// tree before starting the official standalone server.
const staticSource = join(root, '.next', 'static');
const staticTarget = join(standaloneDir, '.next', 'static');
if (await exists(staticSource)) await cp(staticSource, staticTarget, { recursive: true, force: true });

const publicSource = join(root, 'public');
const publicTarget = join(standaloneDir, 'public');
if (await exists(publicSource)) await cp(publicSource, publicTarget, { recursive: true, force: true });

const child = spawn(process.execPath, [serverPath], {
  cwd: standaloneDir,
  stdio: 'inherit',
  env: {
    ...process.env,
    HOSTNAME: process.env.HOSTNAME || '127.0.0.1',
    PORT: process.env.PORT || '3100',
  },
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => child.kill(signal));
}

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 1);
});
