#!/usr/bin/env node

import { spawnSync } from 'node:child_process';

const KEYCHAIN_ACCOUNT = 'make-money-foundation-ingest';
const KEYCHAIN_SERVICES = {
  accountId: 'Make-Money/CloudflareR2AccountId',
  accessKeyId: 'Make-Money/CloudflareR2AccessKeyId',
  secretAccessKey: 'Make-Money/CloudflareR2SecretAccessKey',
};

function readKeychain(service) {
  const result = spawnSync(
    'security',
    ['find-generic-password', '-a', KEYCHAIN_ACCOUNT, '-s', service, '-w'],
    {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );

  const value = result.stdout?.trim();
  if (result.status !== 0 || !value) {
    throw new Error(`Missing macOS Keychain item: ${service}`);
  }
  return value;
}

const command = process.argv.slice(2);
if (command.length === 0) {
  console.error('Usage: pnpm r2:with-secrets -- <command> [args...]');
  process.exit(64);
}

let accountId;
let accessKeyId;
let secretAccessKey;
try {
  accountId = readKeychain(KEYCHAIN_SERVICES.accountId);
  accessKeyId = readKeychain(KEYCHAIN_SERVICES.accessKeyId);
  secretAccessKey = readKeychain(KEYCHAIN_SERVICES.secretAccessKey);
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Unable to load R2 credentials');
  process.exit(78);
}

const result = spawnSync(command[0], command.slice(1), {
  env: {
    ...process.env,
    CLOUDFLARE_R2_ACCOUNT_ID: accountId,
    CLOUDFLARE_R2_ACCESS_KEY_ID: accessKeyId,
    CLOUDFLARE_R2_SECRET_ACCESS_KEY: secretAccessKey,
  },
  stdio: 'inherit',
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
