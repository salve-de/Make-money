import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { inspectComponentHealth, STRICT_LIMITS } from '../../scripts/architecture/check-component-health.mjs';
const roots: string[] = [];
function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mm-size-policy-'));
  roots.push(root);
  for (const relative of Object.keys(STRICT_LIMITS)) {
    const file = path.join(root, 'src/platform', relative);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, '// small\n');
  }
  fs.mkdirSync(path.join(root, 'src/platform/hooks'));
  return root;
}
afterEach(() => { for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true }); });
describe('scoped component and hook size policy', () => {
  it('accepts the exact cap, independently of newline format', () => {
    const root = fixture();
    fs.writeFileSync(path.join(root, 'src/platform/hooks/useExample.ts'), Array(500).fill('// line').join('\r\n') + '\r\n');
    expect(inspectComponentHealth(root).ok).toBe(true);
  });
  it('catches complexity being moved into a giant hook', () => {
    const root = fixture();
    fs.writeFileSync(path.join(root, 'src/platform/hooks/useExample.ts'), Array(501).fill('// line').join('\n'));
    expect(inspectComponentHealth(root).errors).toContain('hooks/useExample.ts: 501 lines exceeds policy 500');
  });
  it('does not silently pass missing or renamed strict targets', () => {
    const root = fixture();
    fs.renameSync(path.join(root, 'src/platform/components/layout/TerminalShell.tsx'), path.join(root, 'src/platform/components/layout/Renamed.tsx'));
    expect(inspectComponentHealth(root).ok).toBe(false);
  });
  it('keeps long test fixtures out of production-file size limits', () => {
    const root = fixture();
    fs.writeFileSync(path.join(root, 'src/platform/hooks/example.test.ts'), Array(600).fill('// fixture').join('\n'));
    expect(inspectComponentHealth(root).ok).toBe(true);
  });
});
