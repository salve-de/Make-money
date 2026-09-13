import { createGenerator } from 'ts-json-schema-generator';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

// Consumer validation only: these schemas are never written to Foundation/R2.
const targets = [
  ['src/shared/terminal.ts', 'AnalystNote', 'src/shared/schemas/analyst-note.json'],
  ['src/shared/strategy.ts', 'StrategyRequest', 'src/shared/schemas/strategy-request.json'],
  ['src/shared/strategy.ts', 'SynthesizedIdeas', 'src/shared/schemas/synthesized-ideas.json'],
  ['src/shared/terminal.ts', 'FinancialEntity', 'src/shared/schemas/financial-entity.json'],
  ['src/lib/foundation/business-reader.ts', 'FoundationValuePage', 'src/lib/foundation/schemas/value-page.json'],
  ['src/lib/foundation/business-reader.ts', 'FoundationBusinessCase', 'src/lib/foundation/schemas/business-case.json'],
];
for (const [path, type, output] of targets) {
  // Strategy requests cross an untrusted API boundary. Keep their object
  // shapes closed while preserving the historical permissive schemas for
  // consumer projections and Foundation records.
  const schema = createGenerator({
    path,
    type,
    tsconfig: 'tsconfig.json',
    additionalProperties: path === 'src/shared/strategy.ts' ? false : true,
    skipTypeCheck: true,
  }).createSchema(type);
  const text = JSON.stringify(schema, null, 2) + '\n';
  if (process.argv.includes('--check')) {
    if (readFileSync(output, 'utf8') !== text) throw new Error(`Stale schema: ${output}; run pnpm schemas:generate`);
  } else {
    mkdirSync(output.slice(0, output.lastIndexOf('/')), { recursive: true });
    writeFileSync(output, text);
  }
}
console.log('Consumer schemas match TypeScript contracts.');
