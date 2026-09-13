import ts from 'typescript';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export function findUnboundedBodyReads(file, text) {
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const errors = [];
  function walk(node) {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)
      && (node.expression.name.text === 'json' || node.expression.name.text === 'text')
      && ts.isIdentifier(node.expression.expression)
      && (node.expression.expression.text === 'req' || node.expression.expression.text === 'request')) {
      errors.push(`${file}: use readJsonBody/readTextBody for ${node.expression.expression.text}.${node.expression.name.text}()`);
    }
    ts.forEachChild(node, walk);
  }
  walk(source);
  return errors;
}

export function checkApiInputBounds(apiRoot = path.join(root, 'src/app/api')) {
  const errors = [];
  function walk(directory) {
    if (!existsSync(directory)) return;
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (entry.name === 'route.ts' || entry.name === 'route.tsx') {
        errors.push(...findUnboundedBodyReads(path.relative(root, file), readFileSync(file, 'utf8')));
      }
    }
  }
  walk(apiRoot);
  return errors;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const errors = checkApiInputBounds();
  if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
  else console.log('API request body reads use bounded readers.');
}
