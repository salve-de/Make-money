import { describe, expect, it } from 'vitest';
import { checkMigrationOrder, checkStorageImports, checkStoragePackages, checkStorageResources } from '../../scripts/architecture/check-storage.mjs';
const production = {
  name: 'make-money-app', vars: { ENVIRONMENT: 'production', FIREBASE_PROJECT_ID: 'make-money-salve-prod' },
  d1_databases: [{ binding: 'APP_DB', database_name: 'make-money-production-users', database_id: 'actual-id' }],
  r2_buckets: [{ binding: 'APP_R2', bucket_name: 'make-money-production-private' }],
};
describe('storage architecture constraints', () => {
  it('accepts isolated named project resources', () => { expect(checkStorageResources(production)).toEqual([]); });
  it('rejects cross-project resource names and missing bindings', () => {
    expect(checkStorageResources({ ...production, d1_databases: [{ binding: 'APP_DB', database_name: 'other-project-users', database_id: 'id' }] }).length).toBeGreaterThan(0);
    expect(checkStorageResources({ name: 'make-money-app' }).length).toBeGreaterThan(0);
  });
  it('rejects development and production sharing resources', () => {
    expect(checkStorageResources({ ...production, env: { development: { ...production, vars: { ENVIRONMENT: 'development' } } } }).some((error) => error.includes('reuses'))).toBe(true);
  });
  it('rejects a production Worker without the dedicated auth project', () => {
    expect(checkStorageResources({ ...production, vars: { ENVIRONMENT: 'production', FIREBASE_PROJECT_ID: 'another-project' } })).toContain('production: FIREBASE_PROJECT_ID must point to the dedicated Make-Money Firebase project');
  });
  it('rejects old runtime ORM/database imports including lazy require', () => {
    for (const text of ["import {db} from '@/db'", "import('@neondatabase/serverless')", "require('drizzle-orm/neon-http')"]) expect(checkStorageImports('src/test.ts', text)).toHaveLength(1);
    expect(checkStorageImports('src/test.ts', "import {queryD1} from '@/lib/storage/d1'")).toEqual([]);
    expect(checkStorageImports('src/test.ts', "import {drizzle} from 'drizzle-orm/d1'")).toEqual([]);
  });
  it('rejects Neon dependencies from every package dependency group', () => {
    expect(checkStoragePackages({ dependencies: { '@neondatabase/serverless': '1.0.0' } })).toHaveLength(1);
    expect(checkStoragePackages({ devDependencies: { drizzle: '1.0.0' } })).toEqual([]);
  });
  it('requires ordered uniquely numbered SQL migrations', () => {
    expect(checkMigrationOrder(['0001_users.sql', '0002_payments.sql'])).toEqual([]);
    expect(checkMigrationOrder(['0001_users.sql', '0001_duplicate.sql']).length).toBeGreaterThan(0);
    expect(checkMigrationOrder(['0002_missing_first.sql']).length).toBeGreaterThan(0);
  });
});
