/**
 * pnpm rights:suspend <ドメイン> --reason "..." [--dry-run] [--by 名前]
 * pnpm rights:resume  <ドメイン> --reason "..." [--by 名前]
 * 使用停止にすると、次の公開（パイプラインの組み立て）で、そのサイトに頼る事実・数字・分析・画面の文が外れる。
 * 事例の他の部分は残る。この命令は台帳を書き換えるだけで、公開側・R2・本番には触れない。--dry-run は台帳も書かず、外れる物の一覧だけ出す。
 */
import { entryFor, nowIso, readLedger, writeLedger } from './ledger-lib';
import { normalizeDomainArg, printUsage } from './where';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

export function runSuspend(mode: 'suspend' | 'resume', argv = process.argv): number {
  const domain = normalizeDomainArg(argv[3]);
  const reason = arg('--reason')?.trim();
  const dry = argv.includes('--dry-run');
  const by = arg('--by')?.trim() || '担当(rights:' + mode + ')';
  if (!domain || (!reason && !dry)) { console.error(`使い方: pnpm rights:${mode} <ドメイン> --reason "理由" [--dry-run]`); return 2; }
  const ledger = readLedger();
  const found = entryFor(ledger, domain);
  if (!found) { console.error(`台帳に ${domain} が無い。先に pnpm rights:seed か、取り込みの検査で記録する`); return 2; }
  const { domain: key, entry } = found;
  if (mode === 'suspend') {
    console.log(`[rights:suspend] ${key} を使用停止にすると、次の公開で次の物が外れる${dry ? '（dry-run: 何も書かない）' : ''}`);
    printUsage(key);
    if (dry) return 0;
    if (entry.status === 'suspended') { console.log(`既に使用停止（${entry.statusReason}）`); return 0; }
    entry.status = 'suspended';
  } else {
    if (entry.status === 'active') { console.log(`${key} は既に使用中`); return 0; }
    if (dry) { console.log(`[rights:resume] ${key} を使用中に戻す（dry-run）`); return 0; }
    entry.status = 'active';
  }
  const at = nowIso();
  entry.statusReason = reason!;
  entry.statusChangedAt = at;
  entry.history.push({ at, by, action: mode, reason: reason! });
  writeLedger(ledger);
  console.log(`\n台帳を更新した（${key}: ${entry.status === 'suspended' ? '使用停止' : '使用中'}）。画面に反映するには次の公開（手順は docs/architecture/RIGHTS_LEDGER.md）`);
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const mode = process.argv[2] === 'resume' ? 'resume' : 'suspend';
  process.exit(runSuspend(mode, [process.argv[0]!, process.argv[1]!, mode, ...process.argv.slice(3)]));
}
