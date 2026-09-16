import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import path from 'node:path';
import { deploymentConfigErrors } from './check-deploy-config.mjs';

const valid = {
  NEXT_PUBLIC_FIREBASE_API_KEY: 'AIzaSy-real-public-key',
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'make-money-salve-prod.firebaseapp.com',
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'make-money-salve-prod',
  NEXT_PUBLIC_FIREBASE_APP_ID: '1:58988611995:web:8e69e3432164586d3ab93e',
};

const validRuntime = {
  vars: { ENVIRONMENT: 'production', PROJECT_ID: 'make-money', FIREBASE_PROJECT_ID: 'make-money-salve-prod' },
  d1_databases: [{
    binding: 'APP_DB',
    database_id: 'd1-id',
    database_name: 'make-money-production-app',
    migrations_dir: 'migrations/d1',
  }],
  r2_buckets: [{ binding: 'APP_R2', bucket_name: 'make-money-production-private' }],
};

test('deployment preflight accepts the dedicated Firebase project', () => {
  assert.deepEqual(deploymentConfigErrors(valid), []);
});

test('deployment preflight rejects missing and placeholder values', () => {
  const errors = deploymentConfigErrors({ ...valid, NEXT_PUBLIC_FIREBASE_API_KEY: 'your-firebase-api-key', NEXT_PUBLIC_FIREBASE_APP_ID: '' });
  assert.equal(errors.length, 2);
  assert.match(errors[0], /API_KEY/);
  assert.match(errors[1], /APP_ID/);
});

test('deployment preflight rejects another Firebase project', () => {
  const errors = deploymentConfigErrors({ ...valid, NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'another-project' });
  assert.equal(errors.length, 1);
  assert.match(errors[0], /dedicated Make-Money Firebase project/);
});

test('deployment preflight validates the runtime storage bindings and migration directory', () => {
  assert.deepEqual(deploymentConfigErrors(valid, validRuntime), []);
  const errors = deploymentConfigErrors(valid, {
    ...validRuntime,
    vars: { ...validRuntime.vars, FIREBASE_PROJECT_ID: 'other-project' },
    d1_databases: [],
    r2_buckets: [],
  });
  assert.equal(errors.length, 5);
  assert.match(errors[0], /wrangler production FIREBASE_PROJECT_ID/);
  assert.match(errors[1], /APP_DB/);
  assert.match(errors[2], /APP_DB/);
  assert.match(errors[3], /migrations_dir/);
  assert.match(errors[4], /APP_R2/);

  const wrongDirectory = deploymentConfigErrors(valid, {
    ...validRuntime,
    d1_databases: [{ ...validRuntime.d1_databases[0], migrations_dir: 'migrations' }],
  });
  assert.deepEqual(wrongDirectory, ['wrangler production APP_DB migrations_dir must be migrations/d1']);
});

test('production deploy applies remote D1 migrations before building and deploying code', () => {
  const packageJson = JSON.parse(readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
  const script = packageJson.scripts?.['deploy:workers'];
  assert.equal(typeof script, 'string');
  const migrate = script.indexOf('pnpm db:migrate:remote');
  const build = script.indexOf('pnpm workers:build');
  const deploy = script.indexOf('opennextjs-cloudflare deploy');
  assert.ok(migrate >= 0, 'deploy:workers must apply remote D1 migrations');
  assert.ok(build > migrate, 'remote migrations must be applied before the production build');
  assert.ok(deploy > build, 'the Worker must deploy only after migrations and build complete');
});
