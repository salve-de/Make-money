import { readFile } from 'node:fs/promises';

import { assertCollectionGeneratedPayload } from './collection-semantic-validator';

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf8');
}

async function main() {
  const file = process.argv[2];
  const raw = file
    ? await readFile(file, 'utf8')
    : await readStdin();

  if (!raw.trim()) {
    throw new Error('No generated collection JSON was provided.');
  }

  const payload = JSON.parse(raw);
  assertCollectionGeneratedPayload(payload, {
    requireSectorEvidence: true,
    label: file ? 'file:' + file : 'stdin-generated-json',
  });

  const count = Array.isArray(payload) ? payload.length : 1;
  console.log('[collection-semantic-validator] PASS: ' + count + ' generated item(s)');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
