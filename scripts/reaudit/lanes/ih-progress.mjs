// ih-progress.mjs (LANE_TAG必須) <batchNo> <rangeStart> <rangeEnd> <count> <validate> <lintSim> [note] : reports/reaudit-ih-progress-${TAG}.json を更新
import fs from 'node:fs';
import path from 'node:path';
const REPO = process.env.LANE_OUT_ROOT ? path.resolve(process.env.LANE_OUT_ROOT) : process.cwd(); // 既定はリポジトリ直下のreports/
const [, , batchNo, a, b, count, validate, lint, note = ''] = process.argv;
const TAG = process.env.LANE_TAG || process.env.SWARM_TAG;
if (!TAG) { console.error('LANE_TAG env is required'); process.exit(64); }
fs.mkdirSync(path.join(REPO, 'reports'), { recursive: true });
const file = path.join(REPO, `reports/reaudit-ih-progress-${TAG}.json`);
let p = { lane: 'C', family: 'indiehackers', total: 1391, batchSize: 25, lastIndex: -1, nextIndex: 0, files: [] };
if (fs.existsSync(file)) p = JSON.parse(fs.readFileSync(file, 'utf8'));
const nnn = String(batchNo).padStart(3, '0');
const entry = { batch: Number(batchNo), range: `${a}-${b}`, file: `data/incoming/reaudit-ih-batch-${nnn}-20260929.json`, report: `reports/reaudit-ih-batch-${nnn}-20260929.md`, count: Number(count), validate, lintSim: lint, completedAt: new Date().toISOString(), ...(note ? { note } : {}) };
p.files = [...p.files.filter((f) => f.batch !== entry.batch), entry].sort((x, y) => x.batch - y.batch);
p.lastIndex = Math.max(...p.files.map((f) => Number(f.range.split('-')[1])));
p.nextIndex = p.lastIndex + 1;
p.updatedAt = new Date().toISOString();
p.owner = `lane:C ih-research swarm ${TAG}`;
p.command = 'node --import tsx scripts/reaudit/candidate-skeleton.ts --range <next>-<next+24> --family indiehackers --lane ih --out data/incoming/reaudit-ih-batch-NNN-20260929.json';
fs.writeFileSync(file, JSON.stringify(p, null, 2), 'utf8');
console.log(`progress: lastIndex=${p.lastIndex} nextIndex=${p.nextIndex} files=${p.files.length}`);
