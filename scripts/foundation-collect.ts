import { readFile, writeFile } from 'node:fs/promises';
import { ingestFoundationResearch, type FoundationIngestRequest } from '../src/lib/foundation/ingest';

/**
 * Single, permissive collection entrypoint.
 *
 * The bundle may contain only the facts that were found. Unknown, estimated,
 * inferred, and source-less observations are retained by the Foundation
 * validator; no completeness checklist is a prerequisite for storage.
 */
async function main() {
  const [mode, input, output] = process.argv.slice(2);
  if (mode !== 'ingest' || !input || !output) {
    throw new Error('Usage: npm run foundation:r2 -- INPUT.json RECEIPT.json');
  }

  const request = JSON.parse(await readFile(input, 'utf8')) as FoundationIngestRequest;
  if (request.write_authorized !== true) {
    throw new Error('write_authorized:true is required');
  }

  // ingestFoundationResearch performs structural validation, create-only
  // preflight, R2 writes, and byte/hash read-back verification.
  const report = await ingestFoundationResearch(request);
  await writeFile(output, JSON.stringify(report, null, 2), { flag: 'wx' });
  console.log(JSON.stringify({
    run_id: report.run_id,
    planned: report.counts.planned,
    created: report.counts.created,
    exists_identical: report.counts.exists_identical,
    readback_verified: report.readback_verified,
    mutation_counts: report.mutation_counts,
  }));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Foundation collection failed');
  process.exitCode = 1;
});
