import ts from 'typescript';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
export function productFields(file = 'src/platform/types/terminal.ts', root = 'FinancialEntity') {
  const program = ts.createProgram([file], { strictNullChecks: true, noEmit: true });
  const source = program.getSourceFile(file);
  if (!source) throw new Error('Missing current product contract: ' + file);
  const checker = program.getTypeChecker();
  const declaration = source.statements.find(n => ts.isInterfaceDeclaration(n) && n.name.text === root);
  if (!declaration) throw new Error('Missing interface: ' + root);
  const fields: string[] = [];
  function walk(type: ts.Type, prefix: string, depth: number) {
    if (depth > 12) throw new Error('Recursive product contract requires explicit adapter');
    for (const prop of type.getProperties()) {
      const location = prop.valueDeclaration || prop.declarations?.[0];
      if (!location) throw new Error('Cannot resolve property ' + prop.name);
      const path = prefix ? prefix + '.' + prop.name : prop.name;
      const value = checker.getNonNullableType(checker.getTypeOfSymbolAtLocation(prop, location));
      if (checker.isArrayType(value)) {
        fields.push(path);
        const element = checker.getTypeArguments(value as ts.TypeReference)[0];
        if (element && element.flags & ts.TypeFlags.Object) walk(element, path + '[]', depth + 1);
      } else if (value.flags & ts.TypeFlags.Object) walk(value, path, depth + 1);
      else fields.push(path);
    }
  }
  walk(checker.getTypeAtLocation(declaration), '', 0);
  return { file, root, sha256: createHash('sha256').update(readFileSync(file)).digest('hex'), fields };
}

export function consumerContract() {
  const base = productFields();
  const roots = ['MarketAnomaly', 'ActionableIdea', 'BusinessArchetype', 'MoneyFlowTrend',
    'RedOceanAlert', 'PainWalletHeatmap', 'IntelligenceDossier', 'SynthesizedIdea'];
  return { ...base, roots: ['FinancialEntity', ...roots], fields: [...base.fields,
    ...roots.flatMap(root => productFields(base.file, root).fields.map(path => root + '.' + path))] };
}
