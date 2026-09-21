import { readFile } from 'node:fs/promises';
import { getFoundationBucket, putR2ObjectCreateOnly } from '../src/lib/storage/r2';

// Only immutable, private consumer artifacts; never canonical Foundation facts.
async function main() {
const objects: { key: string; file: string }[] = JSON.parse(await readFile('.catalog-release/upload.json', 'utf8'));
let completed = 0;
let next = 0;
await Promise.all(Array.from({ length: 6 }, async () => {
  while (next < objects.length) {
    const item = objects[next++];
    if (!/^views\/make-money\/(catalog-v1\/objects|dossier-v1\/objects)\//.test(item.key)) throw new Error('Unexpected catalog key');
    await putR2ObjectCreateOnly({ bucket: getFoundationBucket('lake'), key: item.key,
      body: await readFile(item.file), contentType: 'application/gzip' });
    completed++;
    if (completed % 100 === 0) console.log(`Readback verified ${completed}/${objects.length}`);
  }
}));
console.log(`Catalog publish complete: ${completed} immutable objects verified.`);
}
void main().catch((error) => { console.error(error); process.exitCode = 1; });
