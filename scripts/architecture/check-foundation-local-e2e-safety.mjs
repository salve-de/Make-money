import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const configPath = resolve(process.cwd(), 'wrangler.foundation-local-e2e.jsonc');
const config = JSON.parse(readFileSync(configPath, 'utf8'));
const packageJson = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf8'));
const errors = [];

if (config.name !== 'make-money-app-foundation-local-e2e') {
  errors.push('local E2E Worker name must be isolated');
}
if (config.vars?.ENVIRONMENT !== 'development') {
  errors.push('local E2E ENVIRONMENT must be development');
}
if (config.vars?.PROJECT_ID !== 'make-money-local-e2e') {
  errors.push('local E2E PROJECT_ID must be isolated');
}
for (const binding of config.r2_buckets || []) {
  if (binding.remote === true) errors.push(`R2 binding ${binding.binding} must not be remote`);
  if (['foundation-raw','foundation-lake','foundation-restricted','foundation-public','make-money-production-private'].includes(binding.bucket_name)) {
    errors.push(`R2 binding ${binding.binding} must not use a production bucket name`);
  }
}
for (const database of config.d1_databases || []) {
  if (database.remote === true) errors.push(`D1 binding ${database.binding} must not be remote`);
  if (database.database_name === 'make-money-production-app') {
    errors.push('local E2E must not use the production D1 database name');
  }
}
if (config.triggers) errors.push('local E2E config must not define production triggers');

const devCommand = packageJson.scripts?.['foundation:local-e2e:dev'] || '';
if (!devCommand.includes('wrangler dev --local')) {
  errors.push('foundation:local-e2e:dev must use wrangler dev --local');
}
if (!devCommand.includes('--port 3211')) {
  errors.push('foundation:local-e2e:dev must use isolated port 3211');
}
if (devCommand.includes('--port 3111')) {
  errors.push('foundation:local-e2e:dev must not use the unrelated 3111 port');
}
if (!devCommand.includes('--persist-to /tmp/make-money-c9e-local-e2e')) {
  errors.push('foundation:local-e2e:dev must use the shared isolated c9e persistence path');
}

if (errors.length) {
  console.error(['Foundation local E2E safety check failed:', ...errors].join('\n'));
  process.exit(1);
}

console.log('Foundation local E2E safety check passed: production R2/D1 resources are not configured.');
