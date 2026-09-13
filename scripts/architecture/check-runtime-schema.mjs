import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export function runtimeSchemaErrors(source, packageJson) {
  const errors = [];
  if (!source.includes("from '@cfworker/json-schema'")) {
    errors.push('runtime schema boundary must use @cfworker/json-schema');
  }
  if (/\bfrom\s+['"]ajv['"]|require\(\s*['"]ajv['"]\s*\)/.test(source)) {
    errors.push('runtime schema boundary must not import Ajv');
  }
  if (!packageJson?.dependencies?.['@cfworker/json-schema']) {
    errors.push('package.json must declare @cfworker/json-schema as a runtime dependency');
  }
  return errors;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const source = readFileSync(path.join(root, 'src/shared/validate-json.ts'), 'utf8');
  const packageJson = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
  const errors = runtimeSchemaErrors(source, packageJson);
  if (errors.length) {
    console.error(errors.join('\n'));
    process.exitCode = 1;
  } else {
    console.log('Worker runtime schema validator boundary passed.');
  }
}
