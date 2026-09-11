import { expect, it } from 'vitest';
import { boundaryViolation, findCycles, checkBoundaries } from '../../scripts/architecture/check-boundaries.mjs';
it('rejects private feature imports from both application and other features', () => {
  expect(boundaryViolation('src/app/page.tsx', 'src/features/company-inspector/ui/FinancialSection.tsx')).toBeTruthy();
  expect(boundaryViolation('src/features/other/index.ts', 'src/features/company-inspector/model/inspector-model.ts')).toBeTruthy();
  expect(boundaryViolation('src/app/page.tsx', 'src/features/company-inspector/index.ts')).toBeNull();
  expect(boundaryViolation('src/features/company-inspector/ui/A.tsx', 'src/features/company-inspector/model/B.ts')).toBeNull();
});
it('rejects reverse shared dependencies', () => {
  expect(boundaryViolation('src/shared/x.ts', 'src/features/company-inspector/index.ts')).toBeTruthy();
});
it('detects a runtime cycle and permits a directed acyclic graph', () => {
  expect(findCycles(new Map([['a', ['b']], ['b', ['a']]]))).toHaveLength(1);
  expect(findCycles(new Map([['a', ['b']], ['b', []]]))).toEqual([]);
});
it('checks the actual repository resolved import graph', () => {
  expect(checkBoundaries()).toEqual([]);
}, 20_000);

it('rejects private type queries, relative paths and template literal imports', () => {
  const probes = [
    "type T = import('@/features/company-inspector/model/section-props').CompanyInspectorPaneProps;",
    "const load = () => import(`@/features/company-inspector/ui/FinancialSection`);",
    "export { FinancialSection } from '../features/company-inspector/ui/FinancialSection';",
    "const load = (name: string) => import(name);",
    "const target = '@/features/company-inspector/ui/FinancialSection'; const section = require(target);",
  ].map((text, index) => ({ file: `src/app/boundary-probe-${index}.ts`, text }));
  const violations = checkBoundaries(probes);
  for (const probe of probes) {
    expect(violations.some(violation => violation.startsWith(probe.file))).toBe(true);
  }
});
