import { strict as assert } from 'node:assert';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { collectSecretValues, scanWorkerArtifact } from './check-worker-secrets.mjs';

test('secret scanner excludes public values and finds leaked server values', () => {
  const root = mkdtempSync(join(tmpdir(), 'make-money-worker-scan-'));
  try {
    mkdirSync(join(root, 'cloudflare'));
    const secret = 'sk_test_secret_value_123456';
    writeFileSync(join(root, 'cloudflare', 'worker.js'), `const value = ${JSON.stringify(secret)};`);
    assert.deepEqual(collectSecretValues({ NEXT_PUBLIC_FIREBASE_API_KEY: 'AIza-public-value', STRIPE_SECRET_KEY: secret }), [secret]);
    assert.throws(() => scanWorkerArtifact(root, [secret]), /server secret/);
    assert.deepEqual(scanWorkerArtifact(root, ['different-value']), { files: 1 });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
