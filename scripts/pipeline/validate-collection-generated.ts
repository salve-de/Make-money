import { readFile } from 'node:fs/promises';

import { parseFinancialEntity } from '../../src/shared/financial-entity-schema';
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
  const items = Array.isArray(payload) ? payload : [payload];

  // Generated Make-Money collection outputs are FinancialEntity objects.
  // Type/schema validation happens before semantic validation and before any
  // persistence. Do not coerce or repair invalid input here.
  for (const [index, item] of items.entries()) {
    try {
      parseFinancialEntity(item);
    } catch (error) {
      throw new Error(
        '[COLLECTION TYPE VALIDATION FAILED] item ' + index + ': '
        + (error instanceof Error ? error.message : String(error)),
      );
    }
  }

  assertCollectionGeneratedPayload(payload, {
    requireSectorEvidence: true,
    label: file ? 'file:' + file : 'stdin-generated-json',
  });

  const count = items.length;
  console.log('[collection-semantic-validator] PASS: ' + count + ' generated item(s)');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
