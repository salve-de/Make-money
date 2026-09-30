// gen-targets.mjs — generated 家系(reaudit.family==='generated')の対象一覧を索引から再生成する。
// usage (cwd = repo worktree): node scripts/reaudit/lanes/gen-targets.mjs [outFile]
//   既定の出力: $LANE_WORKDIR/targets.json (LANE_WORKDIR 既定は <cwd>/.reaudit-work)
// i は candidate-skeleton.ts --family generated --range の添字と同じ(索引内の出現順)。prof.py と gen-build-batch.mjs が読む。
// 注意: 索引が取り込みで変わると並びが変わり得る。調査の開始時に1回作って固定し、gen-build-batch が現在の索引と突き合わせる。
import fs from 'node:fs';
import path from 'node:path';
const work = path.resolve(process.env.LANE_WORKDIR || `${process.cwd()}/.reaudit-work`);
const out = path.resolve(process.argv[2] || `${work}/targets.json`);
const idx = JSON.parse(fs.readFileSync(path.resolve('data/entities-index.json'), 'utf8'));
const rows = idx.filter((e) => e?.reaudit?.family === 'generated').map((e, i) => ({
  i, id: e.id, name: e.name, scale: e.scale, sector: e.sector, country: e.country, founder: e.founder, url: e.url, publishability: e.publishability, batchId: e.batchId, tagline: e.tagline,
}));
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(rows));
console.log(`targets: ${rows.length} -> ${out}`);
