import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const STRICT_LIMITS = Object.freeze({
  'components/layout/TerminalShell.tsx': 400,
  'components/playbook/PlaybookIntelligenceView.tsx': 300,
  'components/synthesis/StrategySynthesisView.tsx': 200,
  'components/radar/RadarItemDetailView.tsx': 200,
});
const MAX_LINES = 500;
const ADVISORY_LINES = 350;

function scan(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) return scan(file);
    if (!entry.isFile() || !/\.tsx?$/.test(file) || /\.(test|spec)\.tsx?$/.test(file)) return [];
    return [file];
  });
}

/** Scoped size regression signal, NOT a proof of SRP, behavior or lifetime safety. */
export function inspectComponentHealth(root = defaultRoot) {
  const platform = path.join(root, 'src/platform');
  const errors = [];
  const advisories = [];
  let checkedFiles = 0;
  let totalLines = 0;
  for (const required of Object.keys(STRICT_LIMITS)) {
    if (!fs.existsSync(path.join(platform, required))) errors.push(`Required policy target missing: ${required}`);
  }
  for (const scope of ['components', 'hooks']) {
    const directory = path.join(platform, scope);
    if (!fs.existsSync(directory)) { errors.push(`Missing scope: ${scope}`); continue; }
    for (const file of scan(directory)) {
      const relative = path.relative(platform, file).split(path.sep).join('/');
      const source = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
      const lines = source.length ? source.replace(/\n$/, '').split('\n').length : 0;
      checkedFiles += 1;
      totalLines += lines;
      const cap = STRICT_LIMITS[relative] ?? MAX_LINES;
      if (lines > cap) errors.push(`${relative}: ${lines} lines exceeds policy ${cap}`);
      else if (lines > ADVISORY_LINES && !STRICT_LIMITS[relative]) advisories.push(`${relative}: ${lines} lines; review change cohesion`);
    }
  }
  return { ok: errors.length === 0, scope: 'src/platform/{components,hooks}/**/*.{ts,tsx} excluding tests', checkedFiles, totalLines, errors, advisories };
}

export function checkComponentHealth(root = defaultRoot) {
  const report = inspectComponentHealth(root);
  for (const advisory of report.advisories) console.log(`[Size advisory] ${advisory}`);
  for (const error of report.errors) console.error(`[Size policy violation] ${error}`);
  console.log(JSON.stringify(report));
  return report.ok;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  if (!checkComponentHealth()) process.exit(1);
}
