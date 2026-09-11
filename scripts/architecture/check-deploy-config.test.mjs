import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { deploymentConfigErrors } from './check-deploy-config.mjs';

const valid = {
  NEXT_PUBLIC_FIREBASE_API_KEY: 'AIzaSy-real-public-key',
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'make-money-salve-prod.firebaseapp.com',
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'make-money-salve-prod',
  NEXT_PUBLIC_FIREBASE_APP_ID: '1:58988611995:web:8e69e3432164586d3ab93e',
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
