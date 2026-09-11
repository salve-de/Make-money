import nextEnv from '@next/env';

const { loadEnvConfig } = nextEnv;

const REQUIRED_PUBLIC_FIREBASE = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
];

const PLACEHOLDER = /^(?:your[-_]|mock-|test-|example$)/i;

export function readDeploymentEnv(environment = process.env) {
  loadEnvConfig(process.cwd(), false);
  return environment;
}

export function deploymentConfigErrors(environment = process.env) {
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
  return errors;
}

if (process.argv[1] && new URL(import.meta.url).pathname === process.argv[1]) {
  const errors = deploymentConfigErrors(readDeploymentEnv());
  if (errors.length) {
    console.error(['Worker deploy preflight failed:', ...errors, 'Local tests/builds may run without Firebase, but deployment must not.'].join('\n'));
    process.exitCode = 1;
  } else {
    console.log('Worker deploy preflight passed (Firebase public configuration present; values withheld).');
  }
}
