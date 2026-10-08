/**
 * 取り込み・調査の記録から、出典を権利台帳に漏れなく載せる（取り込みの検査・case:research から呼ぶ）。
 * 台帳に無いドメインがあれば、自動で欄を作る（根拠が無ければ「未確認」。公開は止めない）。調査の出典に AI の権利判断（rights）があれば、それで欄を作る。
 * 3基準（ログイン不要・有料の壁なし・引用を禁じていない）を満たさないと判断された新しいドメインは、使用停止で記録する（記録は残り、事実は画面に出ない）。
 * 失敗しても取り込みは止めない（警告だけ）。
 */
import { nowIso, readLedger, writeLedger } from './ledger-lib';
import type { AiRights, SourceRef } from './seed';

type Rec = Record<string, unknown>;
const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const arr = (v: unknown): Rec[] => (Array.isArray(v) ? (v as Rec[]) : []);
const isHttp = (u: string) => /^https?:\/\//i.test(u);

/** 調査記録・取り込み記録（entities-index の1件の形）から出典の参照を集める */
export function sourceRefsOfRecord(record: Rec): SourceRef[] {
  const caseId = str(record.id);
  const entityUrl = str(record.url);
  const refs = new Map<string, SourceRef>();
  const add = (url: string, publisher: string, rights?: AiRights) => {
    if (!isHttp(url)) return;
    const prev = refs.get(url);
    refs.set(url, { caseId, url, publisher: publisher || prev?.publisher || '', entityUrl, ...((rights ?? prev?.rights) ? { rights: (rights ?? prev?.rights)! } : {}) });
  };
  for (const s of arr((record.reaudit as Rec | undefined)?.sources)) add(str(s.url), str(s.publisher), (s.rights as AiRights | undefined) ?? undefined);
  for (const x of [...arr(record.facts), ...arr(record.metrics)]) add(str(x.sourceUrl) || str(x.url), '');
  for (const c of arr(record.evidenceCards)) add(str(c.url), '');
  return [...refs.values()];
}

/** seed.ts は標準の規則(@/ の別名を使う)を読むので、使う時にだけ読み込む。読めない環境（別の作業場所など）でも取り込みは止めず、警告にする */
export async function recordSourcesToLedger(refs: SourceRef[], by: string): Promise<{ added: string[]; error?: string }> {
  try {
    const { ensureDomainEntries } = await import('./seed');
    const ledger = readLedger();
    const added = ensureDomainEntries(ledger, refs, by, nowIso());
    if (added.length) writeLedger(ledger);
    return { added };
  } catch (e) { return { added: [], error: e instanceof Error ? e.message : String(e) }; }
}

export function recordRecordsToLedger(records: Rec[], by: string): Promise<{ added: string[]; error?: string }> {
  return recordSourcesToLedger(records.flatMap(sourceRefsOfRecord), by);
}
