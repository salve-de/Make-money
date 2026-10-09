/**
 * 事例の画像を、足りない分だけ自動で用意する（取得 → 自動判定 → 枚数の表）。
 *
 *   node --import tsx scripts/media/ensure-case-media.ts --ids a,b,c [--refresh] [--out data/media-staging]
 *   node --import tsx scripts/media/ensure-case-media.ts --ids-file <file>
 *
 * 事例ごとに data/media-staging/<id>/manifest.json が無ければ、次の順に呼ぶ。
 *   1. 公式サイトからの取得（fetch-official-assets.ts）
 *   2. App Store からの取得（fetch-app-store-assets.ts。ストアの記録がある事例だけ）
 *   3. 自動判定（auto-review.ts）
 * 取得済み（manifest がある、または robots.txt などで取得を断られた記録がある）事例は取り直さない。取り直すのは --refresh の時だけ。
 * 自動判定で決まらない保留が残っても止めない（「保留あり：人の目で見る」を出して終了コード 0）。
 * R2 への上げは自動にしない。最後に「上げる命令」の行を出すだけ。
 */
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { isMediaDisplayable } from '../../src/shared/media-decisions';
import { readEffectiveManifest } from '../../src/shared/media-asset-store';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const DEFAULT_MEDIA_ROOT = join(REPO_ROOT, 'data/media-staging');
const ICON_KINDS = new Set(['favicon', 'app_icon', 'logo']);
/** progress.jsonl の status のうち、取り直しても結果が変わらないもの（サイト側が断った・対象外） */
const REFUSED_STATUSES = new Set(['skipped_robots', 'skipped_off_domain', 'blocked_by_site', 'no_official_url']);

export interface MediaCounts {
  /** 使ってよい画像（アイコンを除く） */
  allowed: number;
  /** 使ってよいアイコン */
  allowedIcons: number;
  /** 保留のまま残っている画像（アイコン含む） */
  held: number;
  /** 取得の記録（manifest）が1件以上ある */
  hasManifest: boolean;
}

export async function countCaseMedia(entityId: string, root = DEFAULT_MEDIA_ROOT): Promise<MediaCounts> {
  let ledger = null;
  try { ledger = await readEffectiveManifest(entityId, { root }); } catch { ledger = null; }
  const assets = ledger?.assets ?? [];
  const shown = assets.filter((a) => isMediaDisplayable(a));
  return {
    allowed: shown.filter((a) => !ICON_KINDS.has(a.kind)).length,
    allowedIcons: shown.filter((a) => ICON_KINDS.has(a.kind)).length,
    held: assets.filter((a) => a.rights.decision === 'held').length,
    hasManifest: assets.length > 0,
  };
}

export interface EnsureDeps {
  /** 子の命令（node スクリプト）を流す。試験では偽物に差し替える */
  run: (script: string, args: string[]) => Promise<{ code: number; output: string }>;
  /** その事例が App Store の記録を持つか */
  hasStoreRecord: (id: string) => Promise<boolean>;
  count: (id: string) => Promise<MediaCounts>;
  /** 公式サイトの取得で断られた記録（取り直さない理由）。無ければ null */
  refusal: (id: string) => string | null;
  log: (line: string) => void;
}

export type EnsureAction = 'fetched' | 'already' | 'refused';
export interface EnsureRow extends MediaCounts { id: string; action: EnsureAction; note?: string }

export async function ensureCaseMedia(ids: readonly string[], opt: { refresh: boolean; root: string }, deps: EnsureDeps): Promise<EnsureRow[]> {
  const rows: EnsureRow[] = [];
  for (const id of ids) {
    const before = await deps.count(id);
    const refusal = deps.refusal(id);
    let action: EnsureAction = 'already';
    let note: string | undefined;
    if (!opt.refresh && refusal && !before.hasManifest) {
      action = 'refused';
      note = refusal;
    } else if (opt.refresh || !before.hasManifest) {
      action = 'fetched';
      const base = ['--out', opt.root];
      const official = await deps.run('scripts/media/fetch-official-assets.ts', ['--ids', id, ...base]);
      if (official.code !== 0) note = `公式サイトの取得が終了コード ${official.code}`;
      if (await deps.hasStoreRecord(id)) {
        const store = await deps.run('scripts/media/fetch-app-store-assets.ts', ['--ids', id, ...base]);
        if (store.code !== 0) note = `${note ? `${note}／` : ''}App Store の取得が終了コード ${store.code}`;
      }
      const review = await deps.run('scripts/media/auto-review.ts', ['--entity', id, '--out', opt.root]);
      if (review.code !== 0) note = `${note ? `${note}／` : ''}自動判定が終了コード ${review.code}`;
      const after = deps.refusal(id);
      if (after && !(await deps.count(id)).hasManifest) { action = 'refused'; note = after; }
    }
    rows.push({ id, action, ...(await deps.count(id)), ...(note ? { note } : {}) });
  }
  return rows;
}

export function formatRows(rows: readonly EnsureRow[]): string[] {
  const lines = ['事例ID | 使ってよい画像 | 保留 | アイコン | 状態'];
  for (const r of rows) {
    const state = r.action === 'refused' ? `飛ばした（${r.note}）` : r.action === 'fetched' ? `取得した${r.note ? `（注意: ${r.note}）` : ''}` : '取得済み（取り直さない）';
    lines.push(`${r.id} | ${r.allowed} | ${r.held} | ${r.allowedIcons > 0 ? 'あり' : 'なし'} | ${state}`);
  }
  for (const r of rows) if (r.held > 0) lines.push(`保留あり：人の目で見る ${r.id}（${r.held} 枚。node --import tsx scripts/media/review-assets.ts --entity ${r.id} --list）`);
  for (const r of rows) if (r.action !== 'refused' && r.allowed + r.allowedIcons === 0) lines.push(`使える画像なし：${r.id}`);
  // 製品の画面（ストア画面・公式の製品画面）が1枚も使えない事例は、アイコンだけの画面になる。取得は試し済みなので、人が選ぶか、取れない理由を残す
  for (const r of rows) if (r.action !== 'refused' && r.allowed === 0) lines.push(`製品の画面なし：${r.id}（公式の製品画面の取得結果は data/media-staging/run-*.json の screenshot_product。保留の画像を人の目で見て使える物があれば判定する）`);
  lines.push('手元の画面で画像を見る時は、開発画面（3071番）へ直接つなぐ。3070番の中継は画像だけ本番から取るので、まだ本番に無い事例の画像は出ない');
  const upload = rows.filter((r) => r.hasManifest).map((r) => r.id);
  if (upload.length) lines.push(`上げる命令（R2 へは自動で上げない。確認してから手で実行）: node scripts/with-r2-keychain-secrets.mjs node --import tsx scripts/media/upload-media-assets.ts --entity ${upload.join(',')}`);
  return lines;
}

function readRefusals(root: string): Map<string, string> {
  const map = new Map<string, string>();
  const file = join(root, 'progress.jsonl');
  if (!existsSync(file)) return map;
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    try {
      const p = JSON.parse(line) as { entityId?: string; status?: string };
      if (!p.entityId || !p.status) continue;
      if (REFUSED_STATUSES.has(p.status)) map.set(p.entityId, p.status === 'skipped_robots' ? '公式サイトが robots.txt で取得を禁じている' : `公式サイトの取得を断られた（${p.status}）`);
      else map.delete(p.entityId);
    } catch { /* 壊れた行は読み飛ばす */ }
  }
  return map;
}

function realRun(script: string, args: string[]): Promise<{ code: number; output: string }> {
  return new Promise((done) => {
    const child = spawn(process.execPath, ['--import', 'tsx', script, ...args], { cwd: REPO_ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    child.stdout.on('data', (d) => { output += d; });
    child.stderr.on('data', (d) => { output += d; });
    child.on('error', (e) => done({ code: 127, output: String(e) }));
    child.on('close', (code) => done({ code: code ?? 1, output }));
  });
}

async function main(): Promise<number> {
  const argv = process.argv.slice(2);
  const val = (n: string): string | undefined => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : undefined; };
  const fromFile = val('--ids-file') && existsSync(resolve(val('--ids-file')!)) ? readFileSync(resolve(val('--ids-file')!), 'utf8').split('\n') : [];
  const ids = [...new Set([...(val('--ids')?.split(',') ?? []), ...fromFile].map((s) => s.trim()).filter((s) => s && !s.startsWith('#')))];
  if (!ids.length) { console.error('使い方: node --import tsx scripts/media/ensure-case-media.ts --ids a,b [--refresh] [--out data/media-staging]'); return 2; }
  const root = val('--out') ? resolve(val('--out')!) : DEFAULT_MEDIA_ROOT;
  let storeIds: Set<string> | null = null;
  const hasStoreRecord = async (id: string): Promise<boolean> => {
    if (!storeIds) {
      const { selectAppStoreEntities } = await import('../../src/lib/media/app-store-fetch');
      const index: unknown = JSON.parse(readFileSync(join(REPO_ROOT, 'data/entities-index.json'), 'utf8'));
      storeIds = new Set(selectAppStoreEntities(index, new Set(ids)).map((e) => e.id));
    }
    return storeIds.has(id);
  };
  const rows = await ensureCaseMedia(ids, { refresh: argv.includes('--refresh'), root }, {
    run: realRun,
    hasStoreRecord,
    count: (id) => countCaseMedia(id, root),
    refusal: (id) => readRefusals(root).get(id) ?? null,
    log: (l) => console.log(l),
  });
  for (const line of formatRows(rows)) console.log(line);
  return 0;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().then((c) => { process.exitCode = c; }, (e) => { console.error(e instanceof Error ? e.message : e); process.exitCode = 1; });
}
