import ts from 'typescript';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const config = ts.readConfigFile(path.join(root, 'tsconfig.json'), ts.sys.readFile);
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
const normalize = (file) => path.relative(root, file).replaceAll(path.sep, '/');
const feature = (file) => /^src\/features\/([^/]+)\//.exec(file)?.[1];
export function boundaryViolation(from, to) {
  const target = feature(to);
  if (from.startsWith('src/shared/') && (target || to.startsWith('src/app/') || to.startsWith('src/platform/'))) {
    return 'shared must not depend on application/features/platform';
  }
  if (feature(from) && to.startsWith('src/app/')) return 'features must not depend on app';
  if (target && feature(from) !== target && to !== `src/features/${target}/index.ts`) {
    return 'outside consumers must use the feature Public API';
  }
  return null;
}

export function findCycles(graph) {
  const visited = new Set();
  const active = new Set();
  const stack = [];
  const cycles = [];
  function visit(file) {
    if (active.has(file)) { cycles.push([...stack.slice(stack.indexOf(file)), file]); return; }
    if (visited.has(file)) return;
    visited.add(file); active.add(file); stack.push(file);
    for (const target of graph.get(file) || []) visit(target);
    stack.pop(); active.delete(file);
  }
  for (const file of graph.keys()) visit(file);
  return cycles;
}

/** @param {{ file: string, text: string }[]} probes In-memory regression fixtures. */
export function checkBoundaries(probes = []) {
  const errors = [];
  const graph = new Map();
  const sources = new Map(probes.map(({ file, text }) => [path.resolve(root, file), text]));
  const files = [...parsed.fileNames, ...sources.keys()];
  for (const file of files.filter((f) => normalize(f).startsWith('src/'))) {
    const from = normalize(file);
    const source = ts.createSourceFile(file, sources.get(file) ?? ts.sys.readFile(file) ?? '', ts.ScriptTarget.Latest, true);
    const edges = [];
    function add(specifier, runtime) {
      const resolved = ts.resolveModuleName(specifier, file, parsed.options, ts.sys).resolvedModule;
      if (!resolved || resolved.isExternalLibraryImport) return;
      const to = normalize(resolved.resolvedFileName);
      const violation = boundaryViolation(from, to);
      if (violation) errors.push(`${from} -> ${to}: ${violation}`);
      if (runtime) edges.push(to);
    }
    function walk(node) {
      if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
        const clause = ts.isImportDeclaration(node) ? node.importClause : node;
        const bindings = ts.isImportDeclaration(node) ? node.importClause?.namedBindings : node.exportClause;
        const allTypes = bindings && (ts.isNamedImports(bindings) || ts.isNamedExports(bindings)) && bindings.elements.length > 0 && bindings.elements.every((e) => e.isTypeOnly);
        add(node.moduleSpecifier.text, !clause?.isTypeOnly && !(allTypes && !node.importClause?.name));
      }
      if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument) && ts.isStringLiteral(node.argument.literal)) {
        add(node.argument.literal.text, false);
      }
      if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference) && node.moduleReference.expression && ts.isStringLiteral(node.moduleReference.expression)) {
        add(node.moduleReference.expression.text, !node.isTypeOnly);
      }
      if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(node.expression) && node.expression.text === 'require')) && node.arguments[0] && (ts.isStringLiteral(node.arguments[0]) || ts.isNoSubstitutionTemplateLiteral(node.arguments[0]))) {
        add(node.arguments[0].text, true);
      }
      if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword && (!node.arguments[0] || !(ts.isStringLiteral(node.arguments[0]) || ts.isNoSubstitutionTemplateLiteral(node.arguments[0])))) {
        errors.push(`${from}: computed dynamic imports cannot be checked; use explicit literal imports`);
      }
      ts.forEachChild(node, walk);
    }
    walk(source); graph.set(from, edges);
  }
  for (const cycle of findCycles(graph)) errors.push(`Runtime import cycle: ${cycle.join(' -> ')}`);
  return errors;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const errors = checkBoundaries();
  if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
  else console.log('Architecture boundaries and runtime import graph passed.');
}
