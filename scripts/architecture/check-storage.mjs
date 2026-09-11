import ts from 'typescript';
import path from 'node:path';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export function checkStorageImports(file, text) {
  const errors = [];
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  function walk(node) {
    let specifier;
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) specifier = node.moduleSpecifier.text;
    if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(node.expression) && node.expression.text === 'require')) && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) specifier = node.arguments[0].text;
    if (specifier && (specifier.includes('@neondatabase/') || specifier.startsWith('drizzle-orm/neon') || /^@\/db(?:\/|$)/.test(specifier))) errors.push(`${file}: obsolete database import ${specifier}`);
    ts.forEachChild(node, walk);
  }
  walk(source);
  return errors;
}

export function checkStorageResources(config) {
  const errors = [];
  const project = String(config.name || '').replace(/-app$/, '');
  if (!project) errors.push('Wrangler must identify its project');
  const resources = new Map();
  const environments = [['production', config], ...Object.entries(config.env || {})];
  for (const [environment, entry] of environments) {
    const stage = entry.vars?.ENVIRONMENT || environment;
    if (environment !== 'production' && stage === 'production') errors.push(`${environment}: non-production environment cannot declare production`);
    for (const [kind, binding, nameField, idField] of [
      ['d1_databases', 'APP_DB', 'database_name', 'database_id'],
      ['r2_buckets', 'APP_R2', 'bucket_name', 'bucket_name'],
    ]) {
      const records = (entry[kind] || []).filter((item) => item.binding === binding);
      if (records.length !== 1) { errors.push(`${environment}: exactly one ${binding} resource is required`); continue; }
      const resource = records[0];
      const name = resource[nameField];
      if (typeof name !== 'string' || !name.startsWith(`${project}-${stage}-`)) errors.push(`${environment}: ${binding} must use ${project}-${stage}- names`);
      const id = resource[idField];
      if (!id || /pending|placeholder|replace|00000000/i.test(id)) errors.push(`${environment}: ${binding} needs an actual resource identifier`);
      else {
        const key = `${kind}:${id}`;
        if (resources.has(key)) errors.push(`${environment}: ${binding} reuses ${resources.get(key)} resource`);
        resources.set(key, environment);
      }
      const preview = resource[kind === 'd1_databases' ? 'preview_database_id' : 'preview_bucket_name'];
      if (preview && preview === id) errors.push(`${environment}: preview must not reuse the application production resource`);
      if (resource.remote === true && stage !== 'production') errors.push(`${environment}: development application state must not use remote resources by default`);
    }
  }
  return errors;
}

export function checkMigrationOrder(files) {
  const errors = [];
  const ordered = files.filter((file) => file.endsWith('.sql')).sort();
  if (!ordered.length) errors.push('D1 migrations are missing');
  ordered.forEach((file, index) => {
    if (!new RegExp(`^${String(index + 1).padStart(4, '0')}_[a-z0-9_]+\\.sql$`).test(file)) errors.push(`D1 migration order/name invalid: ${file}`);
  });
  return errors;
}

export function checkStorage() {
  const errors = [];
  const config = ts.parseConfigFileTextToJson('wrangler.jsonc', readFileSync(path.join(root, 'wrangler.jsonc'), 'utf8'));
  if (config.error) errors.push('Wrangler JSON could not be parsed');
  else errors.push(...checkStorageResources(config.config));
  function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (/\.[cm]?[jt]sx?$/.test(file)) errors.push(...checkStorageImports(path.relative(root, file), readFileSync(file, 'utf8')));
    }
  }
  walk(path.join(root, 'src'));
  if (existsSync(path.join(root, 'src/db'))) errors.push('Legacy src/db must not remain a runtime source; preserve schema as migration documentation');
  errors.push(...checkMigrationOrder(readdirSync(path.join(root, 'migrations/d1'))));
  for (const file of ['docs/architecture/STORAGE.md', 'src/lib/storage/README.md']) {
    if (!existsSync(path.join(root, file))) errors.push(`Storage entry point missing: ${file}`);
  }
  const readme = path.join(root, 'src/lib/storage/README.md');
  if (existsSync(readme) && !readFileSync(readme, 'utf8').includes('docs/architecture/STORAGE.md')) errors.push('Storage adapter README must link the canonical architecture document');
  return errors;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const errors = checkStorage();
  if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
  else console.log('Storage ownership, runtime dependencies and migration ordering passed.');
}
