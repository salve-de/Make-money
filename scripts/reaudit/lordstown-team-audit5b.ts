/**
 * Lordstown Motors: 260人は2022年末時点の値で「現在」ではないため未確認へ戻し、
 * 集客経路ではない primaryChannels ["GM工場"] を空にする。
 * 元の値は reaudit.legacyDisplaySnapshot.priorNarrative.readerCleanup.audit5b へ退避。何度実行しても同じ結果。
 * 使い方: node --import tsx scripts/reaudit/lordstown-team-audit5b.ts [--dry-run]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseFinancialEntity } from '../../src/shared/financial-entity-schema';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- 巨大JSONの一部を扱う一回限りの補正スクリプト
type AnyRecord = Record<string, any>;
const ID = 'ent_lordstownmotors_P7K3D9ZS';
const indexPath = resolve(process.cwd(), 'data/entities-index.json');
const dryRun = process.argv.includes('--dry-run');
const entities: AnyRecord[] = JSON.parse(readFileSync(indexPath, 'utf8'));
const e = entities.find((x) => x.id === ID);
if (!e) throw new Error(`${ID} not found`);
const ops = e.operations;
const before = { teamSize: ops.teamSize, currentTeamSize: ops.currentTeamSize, isTeamSizeUnconfirmed: ops.isTeamSizeUnconfirmed, primaryChannels: ops.primaryChannels };
const done = ops.teamSize === 0 && ops.currentTeamSize === 0 && ops.isTeamSizeUnconfirmed === true && (ops.primaryChannels ?? []).length === 0;
if (done) { console.log('already applied'); process.exit(0); }
const reaudit = (e.reaudit ??= {});
const snap = (reaudit.legacyDisplaySnapshot ??= {});
const pn = (snap.priorNarrative ??= {});
const bucket = (pn.readerCleanup ??= {});
const list: AnyRecord[] = Array.isArray(bucket.audit5b) ? bucket.audit5b : [];
if (!list.some((x) => x.path === 'operations')) list.push({ path: 'operations', before });
bucket.audit5b = list;
ops.teamSize = 0;
ops.currentTeamSize = 0;
ops.isTeamSizeUnconfirmed = true;
ops.primaryChannels = [];
parseFinancialEntity(e);
console.log(JSON.stringify({ before, after: { teamSize: 0, currentTeamSize: 0, isTeamSizeUnconfirmed: true, primaryChannels: [] } }));
if (!dryRun) writeFileSync(indexPath, JSON.stringify(entities, null, 2), 'utf8');
