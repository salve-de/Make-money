import nextEnv from '@next/env';
import ts from 'typescript';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const { loadEnvConfig } = nextEnv;

const REQUIRED_PUBLIC_FIREBASE = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
];

const PLACEHOLDER = /^(?:your[-_]|mock-|test-|example$)/i;

export function readDeploymentEnv(environment = process.env) {
  // `loadEnvConfig` returns the merged values explicitly; relying only on a
  // process.env mutation is race-prone when several checks run together.
  const loaded = loadEnvConfig(process.cwd(), false);
  return { ...loaded.combinedEnv, ...environment };
}

export function deploymentConfigErrors(environment = process.env, runtimeConfig = null) {
  const errors = [];
  for (const name of REQUIRED_PUBLIC_FIREBASE) {
    const value = environment[name]?.trim();
    if (!value) errors.push(`${name} is required when deploying`);
    else if (PLACEHOLDER.test(value)) errors.push(`${name} still contains a placeholder`);
  }
  const projectId = environment.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim();
  if (projectId && projectId !== 'make-money-salve-prod') {
    errors.push('NEXT_PUBLIC_FIREBASE_PROJECT_ID must be the dedicated Make-Money Firebase project');
  }
  if (runtimeConfig) {
    const runtimeObject = typeof runtimeConfig === 'object' && runtimeConfig !== null && !Array.isArray(runtimeConfig)
      ? runtimeConfig
      : {};
    const vars = runtimeObject.vars && typeof runtimeObject.vars === 'object' && !Array.isArray(runtimeObject.vars)
      ? runtimeObject.vars
      : {};
    if (vars.ENVIRONMENT !== 'production') errors.push('wrangler production ENVIRONMENT must be production');
    if (vars.PROJECT_ID !== 'make-money') errors.push('wrangler production PROJECT_ID must be make-money');
    const runtimeValue = vars.FIREBASE_PROJECT_ID;
    const runtimeProjectId = typeof runtimeValue === 'string' ? runtimeValue.trim() : undefined;
    if (runtimeProjectId !== 'make-money-salve-prod') {
      errors.push('wrangler production FIREBASE_PROJECT_ID must be the dedicated Make-Money Firebase project');
    }
    const d1 = (Array.isArray(runtimeObject.d1_databases) ? runtimeObject.d1_databases : []).find((entry) => entry && entry.binding === 'APP_DB');
    if (typeof d1?.database_id !== 'string' || !d1.database_id.trim() || d1.database_id.includes('placeholder')) {
      errors.push('wrangler production APP_DB binding must identify a D1 database');
    }
    if (d1?.database_name !== 'make-money-production-app') {
      errors.push('wrangler production APP_DB binding must use make-money-production-app');
    }
    const r2 = (Array.isArray(runtimeObject.r2_buckets) ? runtimeObject.r2_buckets : []).find((entry) => entry && entry.binding === 'APP_R2');
    if (r2?.bucket_name !== 'make-money-production-private') {
      errors.push('wrangler production APP_R2 binding must use the private Make-Money bucket');
    }
  }
  return errors;
}

if (process.argv[1] && new URL(import.meta.url).pathname === process.argv[1]) {
  const runtimePath = path.join(process.cwd(), 'wrangler.jsonc');
  const parsedRuntime = ts.parseConfigFileTextToJson(runtimePath, readFileSync(runtimePath, 'utf8'));
  const errors = parsedRuntime.error
    ? ['wrangler.jsonc could not be parsed']
    : deploymentConfigErrors(readDeploymentEnv(), parsedRuntime.config);
  if (errors.length) {
    console.error(['Worker deploy preflight failed:', ...errors, 'Local tests/builds may run without Firebase, but deployment must not.'].join('\n'));
    process.exitCode = 1;
  } else {
    console.log('Worker deploy preflight passed (Firebase public configuration present; values withheld).');
  }
}
