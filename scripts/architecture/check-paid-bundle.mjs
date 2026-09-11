import ts from 'typescript';
import path from 'node:path';
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/** Read raw source without importing application modules or executing data code. */
export function extractPaidSentinels(text) {
  const source = ts.createSourceFile('data.ts', text, ts.ScriptTarget.Latest, true);
  const values = new Set();
  function collect(node) {
    if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) && node.text.length >= 24) values.add(node.text);
    ts.forEachChild(node, collect);
  }
  function walk(node) {
    if (ts.isPropertyAssignment(node) && node.name.getText(source).replaceAll(/["']/g, '') === 'meta') collect(node.initializer);
    else ts.forEachChild(node, walk);
  }
  walk(source);
  return [...values];
}

export function findPaidSentinel(text, sentinels) {
  // Bundlers and RSC serialize quotes, HTML and Unicode differently; decode common escapes.
  const decoded = text.replace(/\\u([a-f\d]{4})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/\\x([a-f\d]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/\\["'\\]/g, (value) => value.slice(1))
    .replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  return sentinels.find((value) => text.includes(value) || decoded.includes(value));
}

async function* walkFiles(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walkFiles(file);
    else if (entry.isFile()) yield file;
  }
}

export async function checkPaidBundle(buildDir = path.join(root, '.next')) {
  const dataDir = path.join(root, 'src/platform/data');
  const sourceFiles = (await readdir(dataDir)).filter((file) => /^(mockLedgerData|additionalInstitutionalEntities\d*)\.ts$/.test(file));
  const sentinels = [...new Set((await Promise.all(sourceFiles.map(async (file) => extractPaidSentinels(await readFile(path.join(dataDir, file), 'utf8'))))).flat())];
  if (!sentinels.length) throw new Error('No premium sentinels found; refusing an empty security check.');
  const leaks = [];
  let scanned = 0;
  // Server JavaScript is private; static chunks and prerendered HTML/RSC are public delivery artifacts.
  for (const dir of ['static', 'server/app']) {
    for await (const file of walkFiles(path.join(buildDir, dir))) {
      if (dir !== 'static' && !/\.(html|rsc|body)$/.test(file)) continue;
      if (dir === 'static' && !/\.(js|json|map)$/.test(file)) continue;
      scanned++;
      if (findPaidSentinel(await readFile(file, 'utf8'), sentinels)) leaks.push(path.relative(root, file));
    }
  }
  if (!scanned) throw new Error('No public build artifacts found; run pnpm build first.');
  return { leaks, scanned, sentinelCount: sentinels.length };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await checkPaidBundle();
  if (result.leaks.length) {
    console.error(`Premium content in public artifacts:\n${result.leaks.join('\n')}`);
    process.exitCode = 1;
  } else console.log(`Paid-content artifact check passed (${result.scanned} files, ${result.sentinelCount} sentinels).`);
}
