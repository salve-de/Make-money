/**
 * 状態台帳の集計と書き込み口。
 *   pnpm pipeline:status                          段階×状態の件数と、止まっている事例の一覧（理由つき）
 *   pnpm pipeline:status --json                   同じ内容を JSON で
 *   pnpm pipeline:status record --case X --stage ANALYZE --status FAILED --reason RUN_ABORTED --text "..."   1件追記（シェルから使う）
 *   pnpm pipeline:status scan-batches --prefix batch-x1-   出典本文が空の事例を HOLD NO_SOURCE_TEXT で記録
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { appendRecord, currentStates, renderStatus, summarize, type LedgerInput, type ReasonCode, type Stage, type Status } from './ledger';

const args = process.argv.slice(2);
const val = (k: string) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
const cmd = args[0] && !args[0].startsWith('--') ? args[0] : 'status';

/** 束ファイルの出典本文が1件も無い事例を探す（純粋関数。テストから使う） */
export function casesWithoutSourceText(batch: { cases?: { entityId: string; sources?: { text?: string }[] }[] }): string[] {
  return (batch.cases ?? []).filter((c) => !(c.sources ?? []).some((s) => (s.text ?? '').trim().length > 0)).map((c) => c.entityId);
}

function main(): void {
  if (cmd === 'record') {
    const rec: LedgerInput = {
      caseId: val('--case') ?? '', stage: val('--stage') as Stage, status: val('--status') as Status,
      reasonCode: val('--reason') as ReasonCode | undefined, reasonText: val('--text'), nextAction: val('--next'),
      actor: val('--actor') ?? 'run-pipeline.sh', inputHash: val('--input-hash'), ruleVersion: val('--rule-version'),
      finishedAt: new Date().toISOString(),
    };
    appendRecord(rec);
    return;
  }
  if (cmd === 'scan-batches') {
    const prefix = val('--prefix') ?? '';
    const dir = val('--dir') ?? 'data/analyze/batches';
    let n = 0;
    for (const f of existsSync(dir) ? readdirSync(dir).filter((x) => x.startsWith(prefix) && x.endsWith('.json')) : []) {
      for (const id of casesWithoutSourceText(JSON.parse(readFileSync(`${dir}/${f}`, 'utf8')))) {
        appendRecord({ caseId: id, stage: 'ANALYZE', status: 'HOLD', reasonCode: 'NO_SOURCE_TEXT', reasonText: `束 ${f} の出典に本文が1件も無い`, nextAction: '出典本文を取得し直す（fetch-sources）', actor: 'scan-batches', finishedAt: new Date().toISOString() });
        n += 1;
      }
    }
    console.log(`出典本文なし: ${n} 件を保留で記録`);
    return;
  }
  const sum = summarize(currentStates(val('--dir')));
  console.log(args.includes('--json') ? JSON.stringify(sum, null, 1) : renderStatus(sum));
}

if (import.meta.url === `file://${process.argv[1]}`) main();
