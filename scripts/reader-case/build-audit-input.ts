/** Build an audit of the exact current local release inputs, including facts-only cases. */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { argValue, loadEntities, loadReaders, readIdsFile } from './load-readers';
import { auditEvidence, type AnalysisFile } from './analysis-lib';
import { readReflectState, withReflectedAnalysis } from './case-reflect';
import { VERDICTS_FILE, type VerdictsFile } from './verify-lib';
import { loadPublicationInput } from './publication-inputs';
import { auditSnapshot, preparePublicationReader, publicationHash } from './publication-evaluation';

async function main() {
  const ids = readIdsFile(argValue('--ids') ?? '');
  const per = Number(argValue('--per') ?? 10);
  const start = Number(argValue('--start') ?? 1);
  const tag = argValue('--tag');
  if (!Number.isSafeInteger(per) || per < 1 || !Number.isSafeInteger(start) || start < 1 || (tag && !/^\d+$/.test(tag))) throw new Error('Invalid audit batch arguments');
  const verdicts = JSON.parse(readFileSync(VERDICTS_FILE, 'utf8')) as VerdictsFile;
  const analysis = withReflectedAnalysis(JSON.parse(readFileSync('data/reader-analysis.json', 'utf8')) as AnalysisFile, readReflectState());
  const entities = loadEntities(ids);
  const cases: unknown[] = [];
  for (const [id, reader] of loadReaders(ids)) {
    const prepared = preparePublicationReader(reader, verdicts[id], analysis[id]);
    if (prepared.problems.length) throw new Error(`${id}: ${prepared.problems.join(', ')}`);
    const snapshot = auditSnapshot(await loadPublicationInput(entities.get(id)!, prepared.reader, verdicts[id]));
    cases.push({ entityId: id, ...auditEvidence(prepared.reader, snapshot.sources), analysis: prepared.reader.analysis,
      identity: snapshot.identity, media: snapshot.media, snapshot, publicationHash: publicationHash(snapshot) });
  }
  mkdirSync('data/audit', { recursive: true });
  for (let i = 0; i * per < cases.length; i++) {
    const suffix = tag ? `${tag}${String(i + 1).padStart(3, '0')}` : String(i + start).padStart(3, '0');
    // Never reuse an old output with a newly overwritten input.
    writeFileSync(`data/audit/in-${suffix}.json`, JSON.stringify({ cases: cases.slice(i * per, (i + 1) * per) }, null, 1), { flag: 'wx' });
  }
  console.log(JSON.stringify({ cases: cases.length, files: Math.ceil(cases.length / per) }));
}
void main().catch((error) => { console.error(error); process.exitCode = 1; });
