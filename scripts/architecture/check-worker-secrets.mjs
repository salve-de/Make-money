import { existsSync, lstatSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import nextEnv from '@next/env';

const { loadEnvConfig } = nextEnv;
const SECRET_NAME = /(SECRET|TOKEN|PASSWORD|ACCESS_KEY|PRIVATE_KEY|API_KEY)/i;

function collectFiles(root) {
  if (!existsSync(root)) return [];
  const files = [];
  const visit = (directory) => {
    for (const name of readdirSync(directory)) {
      const path = join(directory, name);
      const stat = lstatSync(path);
      if (stat.isDirectory()) visit(path);
      else if (stat.isFile()) files.push(path);
    }
  };
  visit(root);
  return files;
}

export function collectSecretValues(environment = process.env) {
  const values = new Set();
  for (const [name, value] of Object.entries(environment)) {
    if (name.startsWith('NEXT_PUBLIC_') || name.startsWith('npm_package_') || name.startsWith('npm_config_') || !SECRET_NAME.test(name) || typeof value !== 'string') continue;
    const trimmed = value.trim();
    if (trimmed.length >= 8) values.add(trimmed);
  }
  return [...values];
}

export function scanWorkerArtifact(root = join(process.cwd(), '.open-next'), secretValues = collectSecretValues()) {
  const files = collectFiles(root);
  const leaks = [];
  for (const file of files) {
    const content = readFileSync(file);
    for (const secret of secretValues) {
      if (content.includes(Buffer.from(secret))) {
        leaks.push(relative(process.cwd(), file));
        break;
      }
    }
  }
  if (leaks.length > 0) {
    throw new Error(`Worker artifact contains a server secret: ${leaks.join(', ')}`);
  }
  return { files: files.length };
}

if (process.argv[1] && new URL(import.meta.url).pathname === process.argv[1]) {
  loadEnvConfig(process.cwd(), false);
  const result = scanWorkerArtifact();
  console.log(`Worker artifact secret scan passed (${result.files} files; values withheld).`);
}
