#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const templatePath = path.join(process.cwd(), 'scripts/collector/collect-ebizfacts-1000.mjs');
const template = fs.readFileSync(templatePath, 'utf8')
  .replace("const AGENT = 'codex-20260916-ebizfacts1000';", "const AGENT = 'codex-20260916-ebizfacts-new100x';")
  .replace("import crypto from 'node:crypto';", "import crypto from 'node:crypto';\nimport path from 'node:path';")
  .replace(
    "const existingNorm = new Set(existingIndex.map((entity) => norm(entity.name)));",
    `const existingNorm = new Set(existingIndex.map((entity) => norm(entity.name)));
const incomingFiles = [];
function collectIncomingFiles(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) collectIncomingFiles(file);
    else if (entry.isFile() && entry.name.endsWith('.json')) incomingFiles.push(file);
  }
}
collectIncomingFiles('data/incoming');
function collectIncomingEntities(value) {
  if (Array.isArray(value)) { for (const item of value) collectIncomingEntities(item); return; }
  if (!value || typeof value !== 'object') return;
  if (typeof value.id === 'string' && value.id.startsWith('ent_') && value.name) existingNorm.add(norm(value.name));
  for (const item of Object.values(value)) if (item && typeof item === 'object') collectIncomingEntities(item);
}
for (const file of incomingFiles) {
  if (file.includes('batch_ebizfacts_new100x')) continue;
  try { collectIncomingEntities(JSON.parse(fs.readFileSync(file, 'utf8'))); } catch {}
}`,
  )
  .replace("from '../claim.mjs'", `from '${pathToFileURL(path.join(process.cwd(), 'scripts/claim.mjs')).href}'`);

await import(`data:text/javascript;charset=utf-8,${encodeURIComponent(template)}`);
